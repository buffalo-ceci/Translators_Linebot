# Translator LineBot

LINE Bot 翻譯助理 — 自動偵測訊息語言，將繁體中文訊息翻譯成印尼語，印尼語訊息翻譯成繁體中文。

這是從 [LineBot](../LineBot) 專案獨立出來的翻譯機器人，使用自己的 LINE 頻道（Channel）憑證，
與原本的 MRT 知識問答機器人完全分開部署。

## 架構

```
使用者 (LINE) → LINE Platform → Webhook (Zeabur) → 偵測語言（中文/印尼語）
                                                   → OpenAI GPT-4o-mini 翻譯 → LINE 回覆
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
| `OPENAI_API_KEY` | OpenAI API Key | platform.openai.com |

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

### 3. 部署到 Zeabur

1. 將程式碼推送到 GitHub
2. 在 Zeabur 建立新專案，連接 GitHub repo
3. 在 Zeabur 設定環境變數（同 `.env` 中的變數）
4. 部署完成後，取得你的服務 URL
5. 在 LINE Developers Console 設定 Webhook URL 為: `https://your-domain.zeabur.app/webhook`

也可以使用 `Dockerfile` 以 Docker 容器部署。

## 專案結構

```
Translator_LineBot/
├── src/
│   ├── index.js                 # Express 伺服器 + LINE Webhook
│   ├── handlers/
│   │   └── translateHandler.js  # 訊息處理（翻譯流程）
│   └── services/
│       └── translator.js        # 語言偵測 + OpenAI 翻譯
├── Dockerfile                    # Docker 部署設定
├── zeabur.json                   # Zeabur 部署設定
└── .env.example                  # 環境變數範本
```
