const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CJK_REGEX = /[一-鿿㐀-䶿]/;

/**
 * Detect whether text is (Traditional) Chinese or Indonesian based on script.
 * @param {string} text
 * @returns {'zh'|'id'}
 */
function detectLanguage(text) {
  return CJK_REGEX.test(text) ? 'zh' : 'id';
}

const DIRECTIONS = {
  zh: {
    instruction:
      'Translate the following Traditional Chinese (zh-TW) text into natural, conversational Indonesian.',
  },
  id: {
    instruction:
      'Translate the following Indonesian text into natural, conversational Traditional Chinese (zh-TW).',
  },
};

/**
 * Detect the input language and translate it into the other language
 * (zh-TW <-> Indonesian).
 * @param {string} text - User's message
 * @returns {Promise<string>} Translated text only
 */
async function translateText(text) {
  const sourceLang = detectLanguage(text);
  const { instruction } = DIRECTIONS[sourceLang];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. ${instruction} Output ONLY the translated text, with no explanations, notes, or quotation marks.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { detectLanguage, translateText };
