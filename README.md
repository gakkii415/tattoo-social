# Tattoo Social

タトゥー作品を投稿・発見できるSNS型Webアプリです。フロントエンドはGitHub Pages、バックエンドはSupabaseで動作します。

## 公開先

- GitHub Pages: https://gakkii415.github.io/tattoo-social/
- Repository: https://github.com/gakkii415/tattoo-social

## 主な機能

- アカウント登録・ログイン
- アーティストプロフィール
- タトゥー画像投稿
- フォロー / フォロー解除
- いいね / いいね解除
- 保存 / 保存解除
- アーティスト・説明文・スタイル・タグ検索
- フォロー中フィード / 最新フィード
- いいね・フォロー通知
- 画像ストレージ
- スマホ / PC対応

## 構成

```text
GitHub Pages
  └─ index.html / styles.css / app.js
          │
          └─ Supabase
              ├─ Auth
              ├─ PostgreSQL
              ├─ Row Level Security
              └─ Storage
```

GitHub Pagesは静的フロントエンドのみを配信します。アカウント、投稿、フォロー、いいね、保存、通知、画像はSupabase側で永続化します。

## 保存先

- 投稿本文・タグ・投稿者・日時: `public.posts`
- ユーザー情報: `public.profiles`
- フォロー: `public.follows`
- いいね: `public.likes`
- 保存: `public.saves`
- 通知: `public.notifications`
- 投稿画像: Supabase Storage `tattoo-images`

## セキュリティ

各テーブルはRow Level Securityを有効化しています。ユーザー本人だけが自分の投稿・フォロー・保存などを書き換えられるよう制限しています。通知生成用のSECURITY DEFINER関数は直接RPC実行できないよう権限を無効化しています。

ブラウザにはSupabaseのPublishable Keyのみを置き、Service Role Keyは保存しません。

## 現在の公開状態

- GitHub Pages: 公開済み
- Supabase: 接続済み
- Auth: 有効
- PostgreSQL: 作成済み
- RLS: 有効
- Storage: `tattoo-images` 作成済み
- Pagesからの本番マルチユーザー利用: 有効

Supabaseの再構築用SQLは `supabase/schema.sql` にあります。
