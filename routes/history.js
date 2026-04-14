const express = require('express');
const db = require('./db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Get all chats for user
router.get('/', requireAuth, (req, res) => {
  db.all('SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC',
    [req.session.userId], (err, chats) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(chats);
    });
});

// Create new chat
router.post('/', requireAuth, (req, res) => {
  const { title } = req.body;
  db.run('INSERT INTO chats (user_id, title) VALUES (?, ?)',
    [req.session.userId, title || 'New Chat'],
    function(err) {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ id: this.lastID, title: title || 'New Chat' });
    });
});

// Get messages for a chat
router.get('/:chatId', requireAuth, (req, res) => {
  db.get('SELECT * FROM chats WHERE id = ? AND user_id = ?',
    [req.params.chatId, req.session.userId], (err, chat) => {
      if (err || !chat) return res.status(404).json({ error: 'Chat not found' });
      db.all('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
        [req.params.chatId], (err, messages) => {
          if (err) return res.status(500).json({ error: 'Server error' });
          res.json({ chat, messages });
        });
    });
});

// Update chat title
router.put('/:chatId', requireAuth, (req, res) => {
  const { title } = req.body;
  db.run('UPDATE chats SET title = ? WHERE id = ? AND user_id = ?',
    [title, req.params.chatId, req.session.userId], (err) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ success: true });
    });
});

// Delete chat
router.delete('/:chatId', requireAuth, (req, res) => {
  db.run('DELETE FROM messages WHERE chat_id = ?', [req.params.chatId]);
  db.run('DELETE FROM chats WHERE id = ? AND user_id = ?',
    [req.params.chatId, req.session.userId], (err) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ success: true });
    });
});

module.exports = router;
