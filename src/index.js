require('dotenv').config();
const express = require('express');
const { middleware, messagingApi, HTTPFetchError } = require('@line/bot-sdk');
const { handleTranslateMessage } = require('./handlers/translateHandler');

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const clientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Translator LineBot is running' });
});

// LINE Webhook endpoint
// Cloud Run 在回應送出後會凍結 CPU，所以必須「處理完才回應」，不能先回 200 再背景處理
app.post('/webhook', middleware(config), async (req, res) => {
  await Promise.all(
    req.body.events.map((event) => handleEvent(event).catch(console.error))
  );
  res.json({ status: 'ok' });
});

// 單一實例內的去重（跨實例由 replyToken 只能使用一次來保證）
const SEEN_TTL_MS = 10 * 60 * 1000;
const seenEvents = new Map();

function isDuplicate(event) {
  if (event.deliveryContext && event.deliveryContext.isRedelivery) return true;

  const now = Date.now();
  for (const [id, ts] of seenEvents) {
    if (now - ts > SEEN_TTL_MS) seenEvents.delete(id);
  }

  const id = event.webhookEventId || (event.message && event.message.id);
  if (!id) return false;
  if (seenEvents.has(id)) return true;
  seenEvents.set(id, now);
  return false;
}

async function handleEvent(event) {
  // Only handle text messages
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  if (isDuplicate(event)) {
    console.log(`Skip duplicate event ${event.webhookEventId || event.message.id}`);
    return null;
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  console.log(`[${new Date().toISOString()}] User ${userId}: ${userMessage}`);

  try {
    const t0 = Date.now();
    const translated = await handleTranslateMessage(userMessage);
    console.log(`[translate] (${Date.now() - t0}ms) ${JSON.stringify(userMessage)} => ${JSON.stringify(translated)}`);

    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: translated }],
    });
  } catch (err) {
    console.error('Handle event error:', err);

    if (err instanceof HTTPFetchError) {
      console.error('LINE API error:', err.status, err.body);
    }

    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: '抱歉，翻譯時發生錯誤，請稍後再試。/ Maaf, terjadi kesalahan saat menerjemahkan.',
      }],
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Translator LineBot listening on port ${PORT}`);
});
