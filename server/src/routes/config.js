const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const config = db.prepare('SELECT id, base_url, email, created_at FROM jira_configs ORDER BY id DESC LIMIT 1').get();
  res.json(config || null);
});

router.post('/', (req, res) => {
  const { base_url, email, api_token } = req.body;
  if (!base_url || !email) {
    return res.status(400).json({ error: 'base_url and email are required' });
  }
  const existing = db.prepare('SELECT api_token FROM jira_configs ORDER BY id DESC LIMIT 1').get();
  const token = api_token || existing?.api_token;
  if (!token) {
    return res.status(400).json({ error: 'api_token is required for first-time setup' });
  }
  db.prepare('DELETE FROM jira_configs').run();
  const result = db.prepare('INSERT INTO jira_configs (base_url, email, api_token) VALUES (?, ?, ?)').run(
    base_url.replace(/\/$/, ''), email, token
  );
  res.json({ id: result.lastInsertRowid, base_url, email });
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM jira_configs').run();
  res.json({ success: true });
});

module.exports = router;
