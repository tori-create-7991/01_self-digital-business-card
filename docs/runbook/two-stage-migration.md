# 1 stack → 2 stack 移行手順（本番。人が実行する）

共有 WIF Pool `github-pool` と汎用 prefix `terraform/state` をやめ、
専用 Pool・新 SA・リポジトリ名入りの prefix へ移す。PR はマージ前に手順 1〜3 を行い、手順 4 でマージする。

| | 移行前 | 移行後 |
|---|---|---|
| WIF Pool | `github-pool`（3 リポジトリ共有） | `self-digital-business-card-pool`（専用） |
| Provider | `github-provider` | `github-actions` |
| SA | `github-actions-tf`（projectIamAdmin など 6 ロール） | `gha-self-digital-business-card`（Hosting 用 3 ロール＋app state だけ） |
| なりすまし | repository 一致ならどのブランチでも | `refs/heads/main` だけ |
| tfstate | `terraform/state`（1 つ） | `terraform/01_self-digital-business-card/bootstrap` と `/app` |
| CI の値 | Secrets 6 件（Cloudflare トークン含む） | Variables 4 件、Secrets 0 件 |
| DNS | CI が apply | bootstrap（人の apply） |

## 0. 準備

作業はこの PR のブランチで行う。gcloud はアカウントを明示する（アクティブな設定が別アカウントのことがあるため）。以下のコマンドは同じシェルで続けて実行する。

```bash
cd ~/Repo/my/01_self-digital-business-card/.worktrees/two-stage-iac
A="--account=<プロジェクトのオーナー権限を持つ Google アカウント>"
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token $A)  # 1 時間で切れる。切れたら再実行
export GITHUB_TOKEN=$(gh auth token --user tori-create-7991)
B=tori-develop-tfstate
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
terraform -chdir=terraform/bootstrap init -backend-config="bucket=$B"

# 既存の CNAME を取り込む（作ろうとすると重複で失敗するため）
ZONE_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=tori-dev.com" | jq -r '.result[0].id')
REC_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME&name=card.tori-dev.com" | jq -r '.result[0].id')
terraform -chdir=terraform/bootstrap import 'cloudflare_dns_record.card[0]' "$ZONE_ID/$REC_ID"

terraform -chdir=terraform/bootstrap plan
```

- 確認: `20 to add, 0 to destroy`。`cloudflare_dns_record.card[0]` は変更なし（出ても `content` と `proxied` が変わらないこと）。
  作成されるのは Pool 1・Provider 1・SA 1・SA の WIF 許可 1・project IAM 3・バケット IAM 1（条件付き）・API 8・Variables 4。
- 問題なければ `terraform -chdir=terraform/bootstrap apply`。

```bash
gcloud iam workload-identity-pools providers describe github-actions \
  --workload-identity-pool=self-digital-business-card-pool --location=global \
  --project=tori-develop $A --format="value(state,attributeCondition)"
gh variable list -R tori-create-7991/01_self-digital-business-card
```

- 確認: `ACTIVE` と repository の条件が出る。Variables が 4 件ある。
- 任意（否定側の確認）: `gh workflow run deploy.yml --ref feat/two-stage-iac -R tori-create-7991/01_self-digital-business-card`
  → 「Authenticate to Google Cloud」で失敗すること（main 以外はなりすませない）。
- 戻し方: `terraform -chdir=terraform/bootstrap state rm 'cloudflare_dns_record.card[0]'` で DNS を外してから
  `terraform -chdir=terraform/bootstrap destroy`。旧構成は何も変わっていないので CI は旧 Secrets のまま動く。

## 3. app の state を整理する（マージ直前に行う）

```bash
terraform -chdir=terraform/app init -backend-config="bucket=$B"
terraform -chdir=terraform/app state rm cloudflare_record.card_cname   # DNS は bootstrap が持つようになった
terraform -chdir=terraform/app plan
```

- 確認: `0 to add, 0 to change, 0 to destroy`。「no longer be managed」が 13 件
  （旧 Pool・旧 Provider・旧 SA・旧 SA の IAM 6・WIF 許可・API 3）、custom domain の `moved` が 1 件。
  **destroy が 1 件でも出たら止める**（特に `github-pool` は他リポジトリの CI が使っている）。
- 問題なければ `terraform -chdir=terraform/app apply`。GCP 上は何も変わらず、新しい state から外れるだけ。
- 戻し方: 新 prefix の state を消し、手順 1 からやり直す（旧 prefix の state は無傷）。

## 4. PR をマージして CI を確かめる

マージすると main の CI が新 Pool・新 SA・Variables で動く。

```bash
gh run watch -R tori-create-7991/01_self-digital-business-card $(gh run list -R tori-create-7991/01_self-digital-business-card -L 1 --json databaseId -q '.[0].databaseId')
curl -sI https://card.tori-dev.com/ | head -1
```

- 確認: run が成功し、Terraform Apply が `No changes`、サイトが 200。
- 戻し方: マージを `git revert` する。旧 workflow は旧 Secrets・旧 Provider・旧 prefix の state を使うので、手順 5 の前ならそのまま動く。

## 5. 後片付け（手順 4 の成功を確かめてから）

```bash
A=$A
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
  gh secret delete "$s" -R tori-create-7991/01_self-digital-business-card
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
gh secret list -R tori-create-7991/01_self-digital-business-card                           # 空
terraform -chdir=terraform/bootstrap plan -detailed-exitcode   # exit 0
terraform -chdir=terraform/app plan -detailed-exitcode         # exit 0
```

`terraform/app/migration.tf` は、この後の apply が通れば消してよい（残しても何もしない）。

## 注意

- state バケット `tori-develop-tfstate` は tori-dev-blog の state が管理している（バージョニングの有効化もそちらの bootstrap で行う）。
  このリポジトリの Terraform ではバケットを持たない。
- CI の SA は app の state（`terraform/01_self-digital-business-card/app/`）の下しか読み書きできない。
  手順 4 で Terraform Init が 403 になったら、bootstrap/wif.tf のバケット IAM の条件を疑う。
