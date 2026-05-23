const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');
const { getConfig, getBoards, syncBoardToProject } = require('../services/mondayService');
const { broadcast } = require('./events');

router.get('/config', (req, res) => {
  const config = db.prepare('SELECT id, created_at FROM monday_configs ORDER BY id DESC LIMIT 1').get();
  res.json(config || null);
});

router.post('/config', (req, res) => {
  const { api_token } = req.body;
  if (!api_token) return res.status(400).json({ error: 'api_token הוא שדה חובה' });
  db.prepare('DELETE FROM monday_configs').run();
  const r = db.prepare('INSERT INTO monday_configs (api_token) VALUES (?)').run(api_token);
  res.json({ id: r.lastInsertRowid });
});

router.delete('/config', (req, res) => {
  db.prepare('DELETE FROM monday_configs').run();
  res.json({ success: true });
});

router.get('/test', async (req, res) => {
  const config = getConfig();
  if (!config) return res.status(400).json({ error: 'Monday.com לא מוגדר' });

  try {
    const response = await axios.post(
      'https://api.monday.com/v2',
      { query: 'query { me { name email } }' },
      {
        headers: {
          Authorization: `Bearer ${config.api_token}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01',
        },
        timeout: 10000,
      }
    );
    if (response.data.errors) throw new Error(response.data.errors[0]?.message);
    const me = response.data.data?.me;
    if (!me) throw new Error('תגובה לא תקינה');

    const boards = await getBoards(config);
    res.json({ success: true, user: me, boards });
  } catch (err) {
    const status = err.response?.status;
    res.status(400).json({ error: `חיבור נכשל${status ? ` (${status})` : ''}: ${err.message}` });
  }
});

router.post('/sync/:projectId', async (req, res) => {
  try {
    const result = await syncBoardToProject(parseInt(req.params.projectId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monday webhook — challenge verification + item change events
router.post('/webhook', async (req, res) => {
  if (req.body?.challenge) {
    return res.json({ challenge: req.body.challenge });
  }
  res.sendStatus(200);

  const itemId = String(req.body?.event?.pulseId || req.body?.event?.itemId || '');
  if (!itemId) return;

  const task = db.prepare('SELECT project_id FROM tasks WHERE monday_item_id = ?').get(itemId);
  if (!task) return;

  syncBoardToProject(task.project_id)
    .then(() => broadcast('sync', { source: 'monday', itemId }))
    .catch(e => console.error('[Webhook] Monday sync error:', e.message));
});

module.exports = router;
