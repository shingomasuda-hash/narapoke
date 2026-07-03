# なら和ポケ日和 予約・テイクアウト予約システム

奈良の和モダン・ポケ専門店「なら和ポケ日和」向けの、スマホ最優先の
**席予約 ＋ テイクアウト事前予約** システムです。
将来的に LINE 公式アカウントのリッチメニューから開いて LINE 内で予約完結することを目指し、
初期リリースは「店舗で支払い」（オンライン決済なし）で構成しています。

> ⚠️ **重要（PDF未着）**: 指定のメニューPDF `ポケメニュー_008.pdf` が今回添付されていなかったため、
> メニュー・価格は仕様書の本文記述を初期値として実装しています。
> 価格・分類・デザインは必ず「[運用開始前に確認する項目](#運用開始前に確認する項目)」で店舗と突き合わせてください。

---

## 目次

- [技術構成](#技術構成)
- [クイックスタート（開発モード）](#クイックスタート開発モード)
- [Supabase のセットアップ](#supabase-のセットアップ)
- [LINE のセットアップ手順（非エンジニア向け）](#line-のセットアップ手順非エンジニア向け)
- [Vercel へのデプロイ](#vercel-へのデプロイ)
- [ページ構成](#ページ構成)
- [設計上の要点](#設計上の要点)
- [テスト](#テスト)
- [運用開始前に確認する項目](#運用開始前に確認する項目)
- [未実装・今後の拡張](#未実装今後の拡張)

---

## 技術構成

| 分類 | 採用技術 |
| --- | --- |
| フレームワーク | Next.js 14（App Router）/ TypeScript |
| スタイル | Tailwind CSS（和モダン: 生成り基調・濃茶文字・朱アクセント） |
| DB / 認証 | Supabase（PostgreSQL / Auth / Row Level Security） |
| 入力検証 | Zod |
| 日時 | 自前の JST 純関数（`src/lib/time.ts`）＋ date-fns / date-fns-tz |
| LINE | LIFF（表示名初期化）/ Messaging API（Flex通知・Webhook） |
| 定期実行 | Vercel Cron（`vercel.json`） |
| テスト | Vitest（単体）/ Playwright（E2E・スマホ幅） |

**ORM は導入していません。** Supabase の PostgreSQL に対しては、二重予約防止の要である
原子的処理を **PostgreSQL 関数（RPC）＋ advisory lock** で実装しており（`supabase/migrations/0003_functions.sql`）、
ORM を挟むより挙動が明確で少人数でも保守しやすいためです。読み取り系は Supabase JS クライアントを使用します。

---

## クイックスタート（開発モード）

Supabase も LINE も未設定のまま、UI と金額計算・空き枠表示を確認できます。

```bash
npm install
cp .env.example .env.local   # 値は空のままでOK（開発モードで起動）
npm run dev
# http://localhost:3000 を開く
```

開発モードでできること:

- 席予約画面 / 空き枠表示 / 予約完了画面
- テイクアウト商品選択 / カスタマイズ / 金額計算 / 注文完了画面
- 管理画面の基本UI（`/admin` はログイン不要で表示）
- LINE 通知はコンソール（サーバーログ）に `[LINE mock]` として出力

> 開発モードは `NODE_ENV !== 'production'` かつ Supabase 未設定のときだけ有効です。
> 本番ビルドではモックデータは一切使われません。

各種コマンド:

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest（単体テスト）
npm run test:e2e   # Playwright（要 npx playwright install）
npm run build      # 本番ビルド
```

---

## Supabase のセットアップ

1. [supabase.com](https://supabase.com) でプロジェクトを作成する。
2. プロジェクトの **Project Settings → API** から次を取得し `.env.local` に設定する。
   - `NEXT_PUBLIC_SUPABASE_URL`（Project URL）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（publishable key `sb_publishable_...` または旧形式 anon key）
   - `SUPABASE_SERVICE_ROLE_KEY`（secret key `sb_secret_...` または旧形式 service_role key。**秘密**。サーバー専用）
   > SDK はキーを文字列として `apikey` ヘッダーに渡すだけなので、新旧どちらの形式でも動作します。
3. マイグレーションと初期データを適用する。**Supabase CLI** を使う場合:

   ```bash
   supabase link --project-ref <your-ref>
   supabase db push          # supabase/migrations/*.sql を適用
   psql "$DATABASE_URL" -f supabase/seed.sql   # 初期メニュー投入
   ```

   CLI を使わない場合は、Supabase の **SQL Editor** で以下の順に貼り付けて実行してください。
   - `supabase/migrations/0001_init.sql`（テーブル）
   - `supabase/migrations/0002_rls.sql`（RLSポリシー）
   - `supabase/migrations/0003_functions.sql`（原子的予約RPC）
   - `supabase/seed.sql`（初期メニュー・営業時間）

4. **管理者ユーザーの作成**（メール文字列ではなく DB ロールで判定します）。
   - Supabase の **Authentication → Users** で管理者のメール＋パスワードを作成。
   - その後 SQL Editor で、作成したユーザーを `admins` に登録:

     ```sql
     insert into admins (id, email, role)
     select id, email, 'owner' from auth.users where email = 'owner@example.com';
     ```

   - これで `/admin/login` からログインでき、`/admin/*` にアクセスできます。

---

## LINE のセットアップ手順（非エンジニア向け）

初期リリースは **LIFF ＋ Messaging API** を使います。LINE Notify は使用しません。
画面名称は変更されることがあるため、各手順に「目的」を併記しています。

### 1. LINE公式アカウントを作る
- [LINE Official Account Manager](https://manager.line.biz/) で公式アカウントを作成。
- **目的**: お客様が友だち追加し、予約完了通知やリマインドを受け取れるようにするため。

### 2. Messaging API を有効化する
- 公式アカウントの **設定 → Messaging API** から利用開始し、プロバイダーを選ぶ/作る。
- **目的**: プログラムから Flex Message などの通知を送れるようにするため。

### 3. LINE Developers でチャネルを用意する
- [LINE Developers](https://developers.line.biz/) にログイン。
- **プロバイダー**（会社/店舗単位のまとまり）を作成。
- 次の2種類のチャネルを用意します。
  - **Messaging API チャネル**（通知の送信・Webhook 受信用）
    - `LINE_CHANNEL_SECRET`（Channel secret）→ `.env` に設定（Webhook署名検証に使用）
    - `LINE_CHANNEL_ACCESS_TOKEN`（長期のアクセストークンを発行）→ `.env` に設定
  - **LINE Login チャネル**（LIFF / ログイン用）
    - `LINE_CHANNEL_ID`（Login チャネルの Channel ID）→ `.env` に設定（IDトークン検証に使用）

### 4. LIFF アプリを登録する
- LINE Login チャネル内の **LIFF** タブで「追加」。
  - サイズ: `Full` 推奨
  - **Endpoint URL**: 本番は `https://<あなたのドメイン>/reserve`（または `/`）。ローカル検証時は後述のトンネルURL。
  - スコープ: `profile`（表示名取得）、`openid`（IDトークン取得）
- 発行された **LIFF ID** を `NEXT_PUBLIC_LIFF_ID` に設定。
- **目的**: リッチメニューから開いた予約画面で、LINEの表示名を名前欄に初期表示し、
  ユーザーIDを予約に安全に紐付けるため。

> ⚠️ LIFF SDK は本番で使うため、`@line/liff` を導入する場合は `npm i @line/liff` を実行してください。
> 本コードは SDK が無くても（通常ブラウザでも）予約できるよう、動的読み込み＋フォールバックにしています。

### 5. Webhook を設定する（通知・イベント受信）
- Messaging API チャネルの **Webhook URL** に `https://<あなたのドメイン>/api/line/webhook` を設定。
- **Webhookの利用: オン**、応答メッセージは必要に応じてオフ。
- **目的**: 友だち追加やメッセージ等のイベントをサーバーで受け取り、重複再送を弾いて処理するため。
- セキュリティ: 当システムは `x-line-signature` を **必ず検証** します（`LINE_CHANNEL_SECRET` 必須）。

### 6. 公式アカウントとチャネルを紐付ける
- Messaging API チャネルの設定で、対象の LINE 公式アカウントを紐付ける。
- **目的**: 通知の送信元を公式アカウントに一致させるため。

### 7. リッチメニューから予約画面を開く
- LINE Official Account Manager の **リッチメニュー** で、タップ時のアクションを
  「リンク」→ LIFF URL（`https://liff.line.me/<LIFF_ID>`）に設定。
- **目的**: お客様がトーク画面のメニューから1タップで予約画面を開けるようにするため。

### 8. スタッフ通知先IDの取得方法
- `LINE_STAFF_DESTINATION_ID` には、通知を受け取りたい **スタッフのユーザーID** または
  **グループID** を設定します。
- 取得方法の例: Webhook を有効にした状態でスタッフが公式アカウントにメッセージを送ると、
  Webhook の `source.userId` / `source.groupId` がサーバーログに届きます。その値を使用します。
- **目的**: 新規予約・注文・キャンセルを店舗側にリアルタイム通知するため。

### 9. ローカル開発時のWebhook確認方法
- ローカルの `http://localhost:3000` は LINE から直接届かないため、トンネルを使います。
  - 例: `npx localtunnel --port 3000` や `ngrok http 3000` で得た HTTPS URL を、
    一時的に Webhook URL / LIFF Endpoint に設定して検証。
- 検証が終わったら本番URLへ戻します。

### 10. 本番環境への切り替え方法
- 本番ドメインで各 URL（Endpoint / Webhook）を設定。
- `.env`（Vercel の環境変数）に本番の各トークンを設定。
- **`LINE_INTEGRATION_ENABLED=true`** にして実送信を有効化。
- `false` のままでも予約・注文は正常に動作し、通知はモック（ログ出力）になります。

---

## Vercel へのデプロイ

1. GitHub にこのリポジトリを push。
2. [Vercel](https://vercel.com) で New Project → リポジトリを選択。
3. **Environment Variables** に `.env.example` の各項目を設定
   （`NEXT_PUBLIC_*` 以外は Production/Preview のみに。秘密情報を公開しない）。
4. Deploy。
5. **Cron**: `vercel.json` に定義済み（毎朝9時 JST に `/api/cron/reminders` を実行）。
   - Cron からのリクエストは `Authorization: Bearer <CRON_SECRET>` で認証します。
   - `CRON_SECRET` を必ず設定してください。
   - Hobby プランでは1日1回まで（現在 UTC 0:00 = JST 9:00）。15分粒度にするには Pro が必要。

---

## ページ構成

**顧客向け**

| パス | 内容 |
| --- | --- |
| `/` | 予約種別選択（席 / テイクアウト）＋営業情報・お知らせ・Instagram |
| `/reserve` | 席予約（日付→時間→人数→情報→確認→確定 を1画面ステッパーで。※タップ数削減のため確認は STEP5 に統合） |
| `/reserve/complete` | 席予約完了（予約番号・確認URL） |
| `/takeout` | テイクアウト注文（商品選択→カスタマイズ→カート→受取日時→情報・確認） |
| `/takeout/complete` | テイクアウト注文完了（注文番号・合計・確認URL） |
| `/booking/[token]` | 予約/注文の確認・変更・キャンセル（推測困難トークン） |
| `/privacy` `/terms` | プライバシーポリシー / ご利用上の注意 |

`/reserve/confirm` `/takeout/confirm` はフロー内ステップへ統合済みのため、
アクセス時は本体フローへリダイレクトします。

**管理者向け**（Supabase Auth ＋ `admins` ロールで保護）

`/admin/login` `/admin`（ダッシュボード）`/admin/reservations` `/admin/orders`
`/admin/menu` `/admin/business-hours` `/admin/closures` `/admin/settings` `/admin/notifications`

---

## 設計上の要点

- **タイムゾーン**: `Asia/Tokyo` 固定。`24:00` は内部で翌日 `00:00`（1440分）として処理。
  絶対時刻は `timestamptz`(UTC) で保持し、重複判定は絶対時刻で行います。
- **空席判定**: 予約"件数"ではなく、**時間帯が重なる予約の合計人数のピーク**で判定
  （掃引法）。`cancelled` / `no_show` は席数に含めません。
- **二重予約防止**: 予約確定はクライアント表示を信用せず、**RPC 内で再チェック**。
  同一営業日を `pg_advisory_xact_lock` で直列化し、原子的に登録します。
  加えて `idempotency_key`（一意制約）で二重送信を吸収します。
- **金額**: すべて整数の円で計算し、浮動小数点誤差を出しません。**税率はコードに固定せず**
  `store_settings` / 環境変数から取得。税額は既定で切り捨て（会計方針に応じて変更可）。
- **注文スナップショット**: `takeout_order_items` に注文時点の商品名・単価・追加料金・
  選択内容を保存。後から価格を変えても過去注文は変わりません。
- **キャンセルトークン**: 平文はDBに保存せず、SHA-256 ハッシュのみ保存。URLでのみ本人に提示。
- **RLS**: 個人情報テーブル（`reservations` / `takeout_orders` / `customers` 等）は
  一般ユーザーから読めません。顧客向け処理は Server Action がサービスロールで実行し、
  空き状況APIは集計のみ返します（他人の予約や個人情報は返しません）。
- **LINE フォールバック**: `LINE_INTEGRATION_ENABLED=false` でも Web 単体で動作。
  通知失敗時も予約・注文は保存し、`notification_logs` に失敗を記録します。

---

## テスト

**単体テスト（Vitest, `tests/unit/`）** — 主要ロジックを網羅:

- 木曜不可 / 11:00〜16:00可 / 16:00〜18:00不可 / 18:00〜24:00可 / 24:00の翌日処理
- 座席数超過の不可 / 重複予約防止 / キャンセル済みは席数に含めない
- プランA〜Dの選択数 / メイン・サブ検証 / ならポケドリンクの選択ルール
- 追加料金・セット割引・税額・注文合計 / キャンセルトークン検証

```bash
npm test
```

**E2Eテスト（Playwright, `tests/e2e/`、スマホ幅 Pixel7）**:

- 席予約の完了 / テイクアウト注文の完了 / 管理者の当日予約確認 / 売切設定

```bash
npx playwright install   # 初回のみ
npm run test:e2e
```

> 結合テスト（LINE通知失敗時も予約保存が成功する等）はモック層で検証できる構成です。
> 実DB連携のCIを組む場合は、Supabase のテストプロジェクト or ローカル `supabase start` を利用してください。

---

## 運用開始前に確認する項目

以下は仕様書の記述・推測に基づく**初期値**です。運用前に店舗で必ずご確認ください
（すべて管理画面 or `store_settings` / メニューから変更可能）。

| 項目 | 初期値 | 備考 |
| --- | --- | --- |
| 正確な座席数 | 20席 | 管理設定 `seat_capacity` |
| 1予約あたり滞在時間 | ランチ90分 / ディナー120分 | `lunch_stay_minutes` / `dinner_stay_minutes` |
| 最終予約受付時刻 | 各営業時間の枠に準拠（ディナー最終 23:30 開始） | 枠生成ロジック |
| 最大予約人数 | 8名（9名以上は店舗相談） | `max_party_size` |
| 予約受付締切 | 開始 60分前 | `accept_cutoff_minutes` |
| キャンセル可能期限 | 席予約: 開始120分前 / テイクアウト: 調理開始前 | `cancel_deadline_minutes` |
| テイクアウト最終受取時間 | 各営業時間の枠に準拠 | 枠生成ロジック |
| 1枠あたりテイクアウト受付数 | 4件 | `takeout_slot_capacity` |
| テイクアウト税率 | 10% | `takeout_tax_rate_percent` / `TAKEOUT_TAX_RATE`（**軽減税率の要否を確認**） |
| **イクラ・エビの追加料金** | 各 +250円 | ⚠️ PDF未着。要確認 |
| **韓国海苔の追加料金** | +100円 | ⚠️ PDF未着。要確認 |
| **ならポケドリンク 3種目フルーツの追加** | りんご+80 / みかん+100 / キウイ+100 / パイン+80 / 柿+80 / グレープフルーツ+150 | ⚠️ PDF未着。要確認 |
| **マシュマロドリンクの正式な商品分類・価格** | スイーツ / 980円（暫定） | ⚠️ 分類・価格の確認が必要 |
| **はちみつ50円の適用対象** | スイーツの「はちみつ追加 50円」として登録 | ⚠️ どの商品への追加かを確認 |
| **セット割引の適用条件** | ならポケ/通常ドリンク −100円（同時注文時） | 適用条件・対象を確認 |
| 臨時休業・貸切・営業時間変更 | 管理画面から設定 | `/admin/closures` ほか |
| 店舗住所 | 未設定 | フッター/プライバシーに反映予定 |
| 店舗電話番号 | 未設定 | 9名以上・変更時の案内に必要 |
| LINE公式アカウント情報 | 未設定 | 上記LINE手順で設定 |
| 個人情報の保管期間 | 未設定 | プライバシーポリシーに明記が必要 |
| 予約通知を受け取るスタッフ | 未設定 | `LINE_STAFF_DESTINATION_ID` |

> メニューの各価格・品目・分類は PDF が一次資料です。PDF 受領後に管理画面で最終確定してください。
> 掲載価格は税抜のため、税抜単価・税率・税額・税込を分けて管理しています。

---

## 未実装・今後の拡張

現状で「ローカル起動・席予約・二重予約防止・テイクアウトのカスタマイズ注文・金額計算・
管理画面での確認/営業時間/休業/商品価格変更・LINEフラグ切替・LINE未設定での動作・
seed・単体/E2Eテスト・レスポンシブ・RLSによる個人情報保護」を満たしています。

今後追加しやすい形にしてある拡張ポイント:

- **オンライン決済**: `payment_method` カラムを用意済み。Stripe 追加時は注文フロー末尾に
  PaymentIntent を挟むだけで拡張できます。
- **予約日時の「変更」UI**: 現状はキャンセル→再予約で対応。原子的な再判定ロジック
  （`canReserve`）は共通化済みのため、変更フローに転用可能。
- **管理: 営業時間/特別営業時間の編集UI**、CSV出力、予約カレンダー表示、店舗発の再通知UI
  の作り込み（データ層・アクションは用意済み）。
- **レート制限の本番強化**: 現状はインメモリ実装。マルチインスタンス運用時は Upstash Redis 等へ。
- **リマインド**: 前日18:00 / 開始2時間前 / 受取2時間前を Cron で送信。二重送信は
  `notification_logs` の一意制約で防止。時刻・有効/無効は `store_settings` で管理。
- **LINE MINI App 移行**: LIFF ベースのため、MINI App 専用機能に依存しない構成です。

---

*このシステムは株式会社anyware により構築されました。*
