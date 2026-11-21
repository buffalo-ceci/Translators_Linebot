# Translator LineBot

LINE Bot 翻譯助理 — 自動偵測訊息語言，將繁體中文訊息翻譯成印尼語，印尼語訊息翻譯成繁體中文。

這是從 [LineBot](../LineBot) 專案獨立出來的翻譯機器人，使用自己的 LINE 頻道（Channel）憑證，
與原本的 MRT 知識問答機器人完全分開部署。

## 架構

```
使用者 (LINE) → LINE Platform → Webhook (Cloud Run) → 偵測語言（中文/印尼語）
                                                      → Gemini 翻譯 → LINE 回覆（replyMessage）
```

收到任何文字訊息都會自動翻譯（不需觸發關鍵字）：
- 訊息包含中文字 → 翻譯成印尼語
- 訊息不包含中文字（視為印尼語） → 翻譯成繁體中文

只回覆翻譯結果，不會附上原文。

## 快速開始

### 1. 設定環境變數

複製 `.env.example` 為 `.env`，填入以下資訊：

```bash
cp .env.example .env
```

| 變數 | 說明 | 取得方式 |
|------|------|---------|
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | LINE Developers Console |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token | LINE Developers Console |
| `GEMINI_API_KEY` | Google Gemini API Key | aistudio.google.com |
| `GEMINI_MODEL` | （選填）翻譯模型，預設 `gemini-3.5-flash-lite` | — |

### 2. 本地開發

```bash
npm install
npm run dev
```

使用 ngrok 測試 webhook：
```bash
ngrok http 3000
# 將 ngrok URL 設定到 LINE Developers Console 的 Webhook URL（需加上 /webhook）
```

### 3. 部署到 Google Cloud Run

```bash
gcloud run deploy translator-linebot --source . --region asia-east1
```

使用專案內的 `Dockerfile` 建置。注意事項：

1. 在 Cloud Run 設定環境變數：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`GEMINI_API_KEY`（`PORT` 由 Cloud Run 自動提供）
2. 推送到 GitHub **不會**自動部署，需手動執行上面的指令
3. 在 LINE Developers Console 設定 Webhook URL 為 `https://<服務網址>/webhook`，按 Verify，並關閉 Webhook redelivery
4. **Webhook 必須處理完才回 200**。Cloud Run 預設（以要求為依據計費）在回應送出後會凍結 CPU，若先回應再背景處理，翻譯會卡住或延遲
5. 回覆使用 `replyMessage`（不計入 LINE 每月訊息額度，且 replyToken 只能用一次，可避免多實例重複回覆）。`pushMessage` 會計入額度且按收件人數計算，請避免使用

也可以使用其他支援 Docker 的平台部署。

## 專案結構

```
Translator_LineBot/
├── src/
│   ├── index.js                 # Express 伺服器 + LINE Webhook
│   ├── handlers/
│   │   └── translateHandler.js  # 訊息處理（翻譯流程）
│   └── services/
│       └── translator.js        # 語言偵測 + Gemini 翻譯
├── Dockerfile                    # Docker 部署設定
└── .env.example                  # 環境變數範本
```
