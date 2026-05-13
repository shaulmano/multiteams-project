const express = require('express');
const router = express.Router();
const { getConfig, makeApiClient, syncProjectFromJira, syncAllProjects } = require('../services/jiraService');

router.get('/test', async (req, res) => {
  const config = getConfig();
  if (!config) return res.status(400).json({ error: 'Jira not configured. Go to Settings first.' });
  try {
    const resp = await makeApiClient(config).get('/myself');
    res.json({ success: true, user: resp.data.displayName, email: resp.data.emailAddress, accountId: resp.data.accountId });
  } catch (err) {
    const status = err.response?.status;
    const hint = status === 401 ? 'הטוקן לא תקין או פג תוקף' :
                 status === 403 ? 'אין הרשאות לגשת ל-Jira' :
                 status === 404 ? 'כתובת ה-URL שגויה' :
                 'שגיאת רשת — בדוק שה-URL נכון';
    res.status(500).json({ error: `${hint} (HTTP ${status || 'timeout'})`, details: err.response?.data?.message || err.message });
  }
});

router.get('/projects', async (req, res) => {
  const config = getConfig();
  if (!config) return res.status(400).json({ error: 'Jira not configured' });
  try {
    const resp = await makeApiClient(config).get('/project/search', { params: { maxResults: 50, orderBy: 'name' } });
    res.json(resp.data.values.map(p => ({ key: p.key, name: p.name, type: p.projectTypeKey })));
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

router.post('/sync/:projectId', async (req, res) => {
  try {
    const result = await syncProjectFromJira(parseInt(req.params.projectId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync-all', async (req, res) => {
  try {
    await syncAllProjects();
    res.json({ success: true, message: 'All projects synced' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
