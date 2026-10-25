# app stack の state の置き場所。CI は同じ値を Variables（TF_STATE_BUCKET・TF_STATE_PREFIX_APP）から渡す。
# フォークした場合は自分のバケットとリポジトリ名に書き換え、bootstrap の app_state_prefix も揃える。
bucket = "tori-develop-tfstate"
prefix = "terraform/01_self-digital-business-card/app"
