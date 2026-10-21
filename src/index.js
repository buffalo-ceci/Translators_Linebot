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
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const results = await Promise.all(
      req.body.events.map((event) => handleEvent(event))
    );
    res.json(results);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  // Only handle text messages
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  console.log(`[${new Date().toISOString()}] User ${userId}: ${userMessage}`);

  try {
    const translated = await handleTranslateMessage(userMessage);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: translated }],
    });
  } catch (err) {
    console.error('Handle event error:', err);

    if (err instanceof HTTPFetchError) {
      console.error('LINE API error:', err.status, err.body);
    }

    return client.replyMessage({
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
