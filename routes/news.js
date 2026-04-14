const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 1000; // refresh every 60 seconds

router.get('/', async (req, res) => {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    return res.json(cache.data);
  }

  if (!process.env.NEWS_API_KEY) {
    return res.json({ articles: [], error: 'NEWS_API_KEY not set' });
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
    );
    const data = await response.json();
    const articles = (data.articles || []).map(a => ({
      title: a.title,
      source: a.source?.name,
      url: a.url,
      publishedAt: a.publishedAt
    }));
    cache = { data: { articles }, timestamp: now };
    res.json({ articles });
  } catch (err) {
    res.json({ articles: [], error: err.message });
  }
});

module.exports = router;
module.exports.getNewsForPrompt = async () => {
  if (!process.env.NEWS_API_KEY) return '';
  try {
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      return cache.data.articles.map((a, i) => `${i+1}. ${a.title} (${a.source})`).join('\n');
    }
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
    );
    const data = await response.json();
    const articles = (data.articles || []).map(a => ({
      title: a.title, source: a.source?.name, url: a.url, publishedAt: a.publishedAt
    }));
    cache = { data: { articles }, timestamp: now };
    return articles.map((a, i) => `${i+1}. ${a.title} (${a.source})`).join('\n');
  } catch { return ''; }
};
