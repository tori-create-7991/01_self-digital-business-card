# 1 stack → 2 stack 移行手順（本番。人が実行する）

共有 WIF Pool `github-pool` と汎用 prefix `terraform/state` をやめ、
専用 Pool・新 SA・リポジトリ名入りの prefix へ移す。PR はマージ前に手順 1〜3 を行い、手順 4 でマージする。

| | 移行前 | 移行後 |
|---|---|---|
| WIF Pool | `github-pool`（3 リポジトリ共有） | `self-digital-business-card-pool`（専用） |
| Provider | `github-provider` | `github-actions` |
| SA | `github-actions-tf`（projectIamAdmin など 6 ロール） | `gha-business-card-deployer`（Hosting 用 3 ロール＋app state の読み書き）と `gha-business-card-planner`（読み取りだけ） |
| なりすまし | repository 一致ならどのブランチでも | deployer は Environment `production` かつ `refs/heads/main` だけ。planner はこのリポジトリの全ワークフロー |
| tfstate | `terraform/state`（1 つ） | `terraform/01_self-digital-business-card/bootstrap` と `/app` |
| CI の値 | Secrets 6 件（Cloudflare トークン含む） | Variables 8 件、Secrets 0 件 |
| DNS | CI が apply | bootstrap（人の apply） |
| CI | `deploy.yml` 1 本（apply・ビルド・配信） | `build.yml`（PR）・`terraform.yml`（PR で plan、main で apply、週 1 回ズレ検知）・`deploy.yml`（apply の後に配信） |
| main の保護 | なし | ruleset（PR 必須、`build`・`plan` の成功が必須、管理者は無視できる） |

## 0. 準備

作業はこの PR のブランチで行う。手順 1〜4 の間は、他の PR を main にマージしない（旧 CI は旧 prefix の state を使い続けるため）。gcloud はアカウントを明示する（アクティブな設定が別アカウントのことがあるため）。以下のコマンドは同じシェルで続けて実行する。

```bash
cd ~/Repo/my/01_self-digital-business-card/.worktrees/two-stage-iac
A="--account=<プロジェクトのオーナー権限を持つ Google アカウント>"
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token $A)  # 1 時間で切れる。切れたら再実行
export GITHUB_TOKEN=$(gh auth token --user tori-create-7991)
B=tori-develop-tfstate
R=tori-create-7991/01_self-digital-business-card
```

Cloudflare トークンは tori-dev.com の Zone:Read と DNS:Edit だけ、有効期限 1 日で作り、`export CLOUDFLARE_API_TOKEN=...` で渡す
（tori-dev-blog の `scripts/with-cloudflare-token.sh` が main にあれば、それで発行してもよい）。ファイルには保存しない。

## 1. app の state を新しい prefix へコピーする

```bash
gcloud storage cp --no-clobber $A \
  gs://$B/terraform/state/default.tfstate \
  gs://$B/terraform/01_self-digital-business-card/app/default.tfstate
gcloud storage ls $A gs://$B/terraform/01_self-digital-business-card/app/
```

- 確認: `default.tfstate` が 1 つだけある。旧 `terraform/state/default.tfstate` はまだ消さない（手順 4 で戻すときに使う）。
- 他リポジトリの state（`terraform/tori-dev-blog/`、`_archive/`）には触れない。
- 戻し方: コピー先を `gcloud storage rm` する。

## 2. bootstrap を apply する（新 Pool・Provider・SA・IAM・Variables・DNS）

```bash
terraform -chdir=terraform/bootstrap init -backend-config=backend.hcl

# 既存の CNAME を取り込む（作ろうとすると重複で失敗するため）
ZONE_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=tori-dev.com" | jq -r '.result[0].id')
REC_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME&name=card.tori-dev.com" | jq -r '.result[0].id')
[ -n "$ZONE_ID" ] && [ "$ZONE_ID" != null ] && [ -n "$REC_ID" ] && [ "$REC_ID" != null ] || { echo "zone/record が見つからない"; false; }
terraform -chdir=terraform/bootstrap import 'cloudflare_dns_record.card[0]' "$ZONE_ID/$REC_ID"

terraform -chdir=terraform/bootstrap plan
```

- 確認: `32 to add, 0 to destroy`。`cloudflare_dns_record.card[0]` は `name`・`content`・`ttl`・`proxied` が変わらないこと
  （`comment`・`tags`・`settings` の差分は v5 で import した直後によく出るので許容）。
  作成されるのは Pool 1・Provider 1・SA 2・SA の WIF 許可 2・project IAM 5・バケット IAM 2（条件付き）・API 8・
  Variables 8・Environment `production` とそのブランチ制限 2・ruleset 1。
- 問題なければ `terraform -chdir=terraform/bootstrap apply`。

```bash
gcloud iam workload-identity-pools providers describe github-actions \
  --workload-identity-pool=self-digital-business-card-pool --location=global \
  --project=tori-develop $A --format="value(state,attributeCondition)"
gh variable list -R $R
```

- 確認: `ACTIVE` と repository の条件が出る。Variables が 8 件ある。
- この時点から main は ruleset で保護される（直接 push できず、PR は `build`・`plan` の成功が必要）。
  旧 `deploy.yml` は main への push でしか動かないので、ここでは何も起きない。
- 戻し方: `terraform -chdir=terraform/bootstrap state rm 'cloudflare_dns_record.card[0]'` で DNS を外してから
  `terraform -chdir=terraform/bootstrap destroy`。旧構成は何も変わっていないので CI は旧 Secrets のまま動く。
  WIF の Pool と Provider は削除後 30 日はソフト削除状態で、同じ ID で作り直すと 409 になる。やり直すときは先に
  `gcloud iam workload-identity-pools undelete self-digital-business-card-pool --location=global --project=tori-develop $A` と
  `gcloud iam workload-identity-pools providers undelete github-actions --workload-identity-pool=self-digital-business-card-pool --location=global --project=tori-develop $A`
  を実行し、`terraform import` で取り込む。

## 3. app の state を整理する（マージ直前に行う）

```bash
terraform -chdir=terraform/app init -backend-config=backend.hcl
terraform -chdir=terraform/app state rm cloudflare_record.card_cname   # DNS は bootstrap が持つようになった
terraform -chdir=terraform/app plan
```

- 確認: `0 to add, 0 to change, 0 to destroy`。「no longer be managed」が 13 件
  （旧 Pool・旧 Provider・旧 SA・旧 SA の IAM 6・WIF 許可・API 3）、custom domain の `moved` が 1 件。
  **destroy が 1 件でも出たら止める**（特に `github-pool` は他リポジトリの CI が使っている）。
- 問題なければ `terraform -chdir=terraform/app apply`。GCP 上は何も変わらず、新しい state から外れるだけ。
- PR の CI をやり直して、planner の権限を確かめる（plan が新しい state を読む）。
  ```bash
  RUN=$(gh run list -R $R --workflow=terraform.yml --branch=feat/two-stage-iac -L 1 --json databaseId -q '.[0].databaseId')
  gh run rerun -R $R "$RUN" && gh pr checks 23 -R $R --watch
  ```
  確認: `build` と `plan` が成功し、PR に「terraform plan（app）: 差分なし」のコメントが付く。
- 任意（マージ前に deployer の権限を確かめる）: 自分に一時的になりすまし権限を付け、deployer として app の plan を流す。
  ```bash
  NEW=gha-business-card-deployer@tori-develop.iam.gserviceaccount.com
  ME=$(gcloud config get-value account $A 2>/dev/null)   # 空なら A に入れたアカウントを書く
  gcloud iam service-accounts add-iam-policy-binding $NEW --member="user:$ME" --role=roles/iam.serviceAccountTokenCreator --project=tori-develop $A
  GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token --impersonate-service-account=$NEW $A) \
    terraform -chdir=terraform/app plan -detailed-exitcode   # exit 0 なら backend（ロック含む）と読み取り権限は足りている
  gcloud iam service-accounts remove-iam-policy-binding $NEW --member="user:$ME" --role=roles/iam.serviceAccountTokenCreator --project=tori-develop $A
  ```
  この権限は Terraform に入れず、確認が終わったら必ず remove する。`firebase deploy` の権限はここでは確かめられない。
- 戻し方: 新 prefix の state を消し、手順 1 からやり直す（旧 prefix の state は無傷）。

## 4. PR をマージして CI を確かめる

`gh pr ready 23 -R $R` で Draft を外し、マージする。main では `terraform`（apply、deployer）が動き、成功すると `deploy`（配信）が続く。

```bash
SHA=$(gh api repos/$R/commits/main -q .sha)
for wf in terraform.yml deploy.yml; do
  until RUN=$(gh run list -R $R --workflow=$wf --branch=main --commit=$SHA -L 1 --json databaseId -q '.[0].databaseId') && [ -n "$RUN" ]; do sleep 10; done
  gh run watch -R $R "$RUN" --exit-status
done
curl -sI https://card.tori-dev.com/ | head -1
```

- 確認: `terraform` の apply が `No changes`、`deploy` が成功（最後の疎通確認で HTTP 200）。
- 戻し方: マージを revert する（main は保護されているので revert の PR を作るか、管理者として保護を無視して push する）。
  旧 workflow は旧 Secrets・旧 Provider・旧 prefix の state を使うので、手順 5 の前ならそのまま動く。
  `terraform` は通って `deploy` だけ落ちた場合は、サイトは前の版のまま配信され続ける。
  権限不足ならエラーに出たロールを `terraform/bootstrap/service_accounts.tf` に足して手順 2 の apply をやり直し、
  `gh workflow run deploy.yml --ref main -R $R` で再実行する。

## 5. 後片付け（手順 4 の成功を確かめてから）

```bash
OLD=github-actions-tf@tori-develop.iam.gserviceaccount.com

# 旧 SA の project IAM を外す（SA を消すだけだと deleted: の binding が残る）
for r in roles/firebase.admin roles/serviceusage.serviceUsageAdmin roles/resourcemanager.projectIamAdmin \
         roles/iam.workloadIdentityPoolAdmin roles/iam.serviceAccountAdmin roles/storage.admin; do
  gcloud projects remove-iam-policy-binding tori-develop $A --member="serviceAccount:$OLD" --role="$r" --condition=None --quiet >/dev/null
done

# 旧 SA を消す（SA に付いていた WIF 許可も一緒に消える）
gcloud iam service-accounts delete "$OLD" --project=tori-develop $A --quiet

# 共有 Pool から名刺サイトの Provider を消す（Pool 自体と他リポジトリの Provider は残す）
gcloud iam workload-identity-pools providers delete github-provider \
  --workload-identity-pool=github-pool --location=global --project=tori-develop $A --quiet

# 旧 Secrets を消す
for s in WIF_PROVIDER GCP_SA_EMAIL GCP_PROJECT_ID GCP_TF_STATE_BUCKET CLOUDFLARE_API_TOKEN CLOUDFLARE_ZONE_ID; do
  gh secret delete "$s" -R $R
done

# 旧 state を退避する（誤って旧 prefix で apply されないように）
D=gs://$B/_archive/terraform-state-business-card-serial19-archived-$(date +%Y%m%d)
gcloud storage mv $A gs://$B/terraform/state/default.tfstate $D/default.tfstate
printf '%s\n' "01_self-digital-business-card が 2026-10 まで使っていた state（prefix terraform/state）。" \
  "現行は terraform/01_self-digital-business-card/{bootstrap,app}。誤用防止のため退避。" | \
  gcloud storage cp $A - $D/README.txt
```

確認（完了条件）:

```bash
gcloud iam workload-identity-pools providers list --workload-identity-pool=github-pool --location=global \
  --project=tori-develop $A --format="value(name.basename())"     # nuxt3-blog-provider と tori-dev-blog-provider だけ
gcloud projects get-iam-policy tori-develop $A --format=json | grep -c github-actions-tf   # 0
gh secret list -R $R                       # 空
terraform -chdir=terraform/bootstrap plan -detailed-exitcode   # exit 0
terraform -chdir=terraform/app plan -detailed-exitcode         # exit 0
```

`terraform/app/migration.tf` は、この後の apply が通れば消してよい（残しても何もしない）。

## 注意

- state バケット `tori-develop-tfstate` は tori-dev-blog の state が管理している（バージョニングの有効化もそちらの bootstrap で行う）。
  このリポジトリの Terraform ではバケットを持たない。
- CI の SA は app の state（`terraform/01_self-digital-business-card/app/`）の下しか読み書きできない（planner は読むだけ）。
  Terraform Init が 403 になったら、`terraform/bootstrap/service_accounts.tf` のバケット IAM の条件を疑う。
