const { translateText } = require('../services/translator');

/**
 * Handle an incoming message for the translator bot.
 * Every text message is translated zh-TW <-> Indonesian; no trigger keyword.
 * @param {string} userMessage
 * @returns {Promise<string>} Translated text
 */
async function handleTranslateMessage(userMessage) {
  return translateText(userMessage);
}

module.exports = { handleTranslateMessage };
