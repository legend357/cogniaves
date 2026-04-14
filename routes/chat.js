const express = require('express');
const Groq = require('groq-sdk');
const db = require('./db');
const { getNewsForPrompt } = require('./news');
const router = express.Router();

const BASE_PROMPTS = {
  general:  `You are CogniAves — a brilliant all-purpose AI assistant. Answer any question clearly and helpfully.`,
  coding:   `You are CogniAves in Coding mode — an expert coding assistant. Help with code generation, bug fixing, and explanations across all languages. Always use fenced code blocks with the language name.`,
  math:     `You are CogniAves in Math mode — an expert mathematics assistant. Solve problems step by step clearly. Cover algebra, calculus, geometry, statistics, and more.`,
  science:  `You are CogniAves in Science mode — an expert science assistant covering Physics, Chemistry, Biology, Astronomy, and Earth Sciences. Show formulas and step-by-step solutions when needed.`,
  writing:  `You are CogniAves in Writing mode — an expert writing assistant. Help with essays, emails, stories, proofreading, and creative writing.`,
  language: `You are CogniAves in Language mode — an expert language tutor. Help with grammar, vocabulary, translation, and learning new languages with clear examples.`,
  history:  `You are CogniAves in History mode — an expert history assistant. Cover world history, civilizations, wars, politics, and historical figures accurately.`,
  news:     `You are CogniAves in Current Affairs mode — an expert news analyst. You have access to today's top headlines listed below. Answer questions about current events using this news data. Always mention the source.`,
};

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

router.post('/', requireAuth, async (req, res) => {
  const { messages, chatId, mode } = req.body;

  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: 'Invalid messages format' });

  if (!process.env.GROQ_API_KEY)
    return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let systemPrompt = BASE_PROMPTS[mode] || BASE_PROMPTS.general;
  systemPrompt += `\n\nCurrent date and time: ${dateStr}, ${timeStr}.`;

  // Inject live news for current affairs mode
  if (mode === 'news') {
    const headlines = await getNewsForPrompt();
    if (headlines) {
      systemPrompt += `\n\nToday's top headlines:\n${headlines}`;
    }
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    });

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      }
    }

    if (chatId) {
      const userMsg = messages[messages.length - 1];
      db.run('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)', [chatId, 'user', userMsg.content]);
      db.run('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)', [chatId, 'assistant', fullText]);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Groq error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
