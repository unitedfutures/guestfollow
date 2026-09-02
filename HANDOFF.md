# 引き継ぎメモ（Handoff）

このセッションで実装した内容と、**本番反映に必要な手動作業**をまとめています。
スマホ/別環境の Claude Code セッションはここを最初に読んでください。

## デプロイ
- 本番: Vercel（`vercel --prod`）。ドメイン: https://guestfollow.jp
- DB/Auth: Supabase（プロジェクト `vamnvcixhceyiogncnxc`）
- コードは本コミット時点で GitHub `main` と一致。

## ⚠️ 実行が必要な Supabase SQL（未実行なら該当機能がエラー/未反映）
`supabase/` 配下。Supabase SQL Editor で実行（冪等）。
- `fix-tenant-isolation.sql` … アカウント間データ分離（RLS）
- `fix-profile-company-name.sql` … 会社名を profiles に補完（トリガー修正＋バックフィル）
- `add-beds24-refresh-token.sql` … Beds24 Refresh Token 用カラム
- `add-commission.sql` … 売上レポートの OTA手数料
- `add-guest-country.sql` … 宿泊者国籍（Beds24 の国コード）
- `add-accommodation-tax.sql` … 宿泊税（施設ルール＋宿泊料 room_charge）
- `add-pricing-rules.sql` … 宿泊価格の自動プライシングルール
- `fix-security-hardening.sql` … 【重要・最優先】匿名(anon)キーでの全件参照を廃止・passkey_challenges のRLS有効化・guest_records.passkey_setup_token 追加
- `fix-sync-integrity.sql` … Airhost予約IDの一意インデックス（同期の二重登録防止。既存重複があれば先に解消）

## Supabase ダッシュボード設定（手動）
- Auth → Emails → **Confirm signup** / **Reset Password** に
  `supabase/email-templates/confirm-signup.html` / `reset-password.html` を適用（件名は各ファイル冒頭コメント参照）。
- Auth → URL Configuration → Site URL `https://guestfollow.jp`、Redirect URLs に `https://guestfollow.jp/**`。

## Beds24 のトークン（スコープ）
- 読み取り（施設/予約/カレンダー取得）: Long Life Token（read系）。
- 書き込み（メッセージ送信 / 宿泊価格の反映）: **invite code → Refresh Token** が必要。
  - メッセージ送信: `write:bookings` / `read:bookings-personal` 等
  - 宿泊価格の反映: `read:inventory` ＋ **`write:inventory`**
  - 設定 → サイトコントローラー連携 → 各アカウントの「メッセージ連携（Refresh Token）」から invite code を登録。

## このセッションで追加/変更した主な機能
- 売上レポート: 売上/OTA手数料/粗利益の3分割、月選択、CSV/PDF出力、入金差の説明ポップアップ、ファイル名 `売上_<施設>_YYYYMM`。
- 宿泊実績報告（住宅宿泊事業法14条）: 隔月期間、宿泊日数/宿泊者数/延べ/国籍別内訳、施設行タップで明細、CSV/PDF。
- 宿泊税計算: 施設ごとの税ルール（段階定額/定率＋プリセット）、期間集計、CSV/PDF。課税標準=宿泊料（清掃料除く）。
- 宿泊価格: Beds24カレンダー表示、平日/土曜/祝前日＋最低価格＋曜日別最低泊数の自動プライシング、Beds24へ反映（write:inventory）。日本の祝日算出は `src/lib/jp-holidays.ts`。
- メッセージ: Beds24 Refresh Token 対応（送信）、Long Life Token のみの場合は送信不可の案内。
- 設定: OTA連携アカウントに「再取込（リフレッシュ）」ボタン。Long Life Token のみ時、価格/メッセージ画面に Refresh Token 必要の案内。
- 認証: パスワードリセット（/forgot-password, /reset-password）。サインアップ会社名を profiles へ補完。
- アンケート: 総合満足度☆5→Googleレビュー誘導＋感想コピー、☆4以下→改善点ヒアリング。設定にレビューURL欄。
- LP: 新機能セクション＋画面イメージのモック、フッター著作権 `© 2026 UNITED FUTURES, INC.`（united-futures.com へリンク）。

## 補足・残課題の候補
- 宿泊価格は Beds24 のみ（Airhostカレンダー書込は未対応）。連泊グループ予約は金額が親予約に集約される点に注意（売上/宿泊税の按分）。
- アンケート多言語は ja/en を追加、他言語は ja にフォールバック。
- Airhost はゲスト国籍/メッセージAPIが未対応。
