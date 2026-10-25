# bootstrap stack の state の置き場所。フォークした場合は自分のバケットとリポジトリ名に書き換える。
# prefix はリポジトリ名をフルで含める（汎用 prefix の衝突で他リポジトリの本番 IAM を壊した事故がある）。
bucket = "tori-develop-tfstate"
prefix = "terraform/01_self-digital-business-card/bootstrap"
