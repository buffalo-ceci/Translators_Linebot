# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A standalone LINE Bot that auto-translates every incoming text message between Traditional Chinese (zh-TW) and Indonesian — no trigger keyword, no knowledge base. It was split out of the `LineBot` project (a separate RAG-based MRT knowledge-Q&A bot) so the two bots can run as fully independent LINE Official Accounts/deployments, each with its own channel credentials.

There are no automated tests, linter, or build step in this repo — it's a small Express app run directly with Node.

## Commands

```bash
npm install   # install dependencies
npm run dev    # run locally with nodemon (auto-restart)
npm start       # run with plain node (production mode)
```

There is no test suite and no lint config — do not invent `npm test` or `npm run lint` commands.

To test webhook behavior locally, run `npm run dev` and tunnel with `ngrok http 3000`, then point the LINE Developers Console webhook URL at the ngrok URL + `/webhook`.

## Architecture

**Request flow:** LINE Platform → `POST /webhook` (src/index.js) → `handleTranslateMessage()` (src/handlers/translateHandler.js) → `translateText()` (src/services/translator.js) → LINE text reply.

### Entry point — `src/index.js`
- Express app with two routes: `GET /` (health check) and `POST /webhook` (LINE messaging webhook, wrapped in `@line/bot-sdk`'s `middleware()` for signature verification).
- No trigger-keyword gating — every text message is translated and replied to automatically. Non-text events (stickers, images, etc.) are ignored (`handleEvent` returns `null`).
- On error (translation/API failure), replies with a bilingual (zh/id) fallback message rather than letting the webhook fail silently, and logs `HTTPFetchError` status/body separately when the failure came from the LINE API itself.

### Translation service — `src/services/translator.js`
- `detectLanguage(text)`: checks for CJK Unicode characters (`/[一-鿿㐀-䶿]/`). Any match → `'zh'` (source is Chinese, translate to Indonesian); no match → `'id'` (source is Indonesian, translate to zh-TW). This is a script-based heuristic, not a real language-detection library — it's sufficient because the only two languages in play (Chinese vs. Latin-script Indonesian) don't overlap in script.
- `translateText(text)`: calls `detectLanguage()`, then OpenAI `gpt-4o-mini` with a direction-specific system prompt that instructs the model to output the translation only (no explanation, no original text echoed back). Returns the translated string directly — this is the bot's entire reply.

### Handler — `src/handlers/translateHandler.js`
- Thin pass-through: `handleTranslateMessage(userMessage)` just calls `translateText()`. Kept as a separate module (mirroring the sibling `LineBot` project's `messageHandler.js` convention) in case translation-adjacent logic (e.g. logging, rate limiting, per-user overrides) needs to grow here later.

### Deployment
- Deployed to Zeabur (`zeabur.json` — Node build, `npm start`) or as a Docker container (`Dockerfile` — `node:20-slim`, `npm ci --omit=dev`). Both just run `node src/index.js`; there's no separate build step since this is plain CommonJS Node, no bundler/TypeScript.
- Required env vars (see `.env.example`): `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` (this bot's own LINE Official Account — must be a different channel than the `LineBot` project's, since each LINE channel needs its own webhook), `OPENAI_API_KEY`, and `PORT`.

## Conventions

- User-facing error strings are bilingual (zh-TW / Indonesian), matching the bot's bilingual audience. Code, comments, and identifiers are English/Chinese-mixed as already present in each file.
- Plain CommonJS (`require`/`module.exports`) throughout — no ES modules, no TypeScript.
- Successful replies are the translated text only — never echo the original message back alongside the translation.
