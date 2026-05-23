const express = require('express');
const router = express.Router();
const db = require('../db');
const { getConfig, makeApiClient, makeAgileClient } = require('../services/jiraService');
const { updateMondayItem } = require('../services/mondayService');

async function updateJiraIssue(jiraKey, { title, status, priority, assignee, storyPoints }) {
  const config = getConfig();
  if (!config || !jiraKey) return;
  try {
    const api = makeApiClient(config);
    const fields = {};
    if (title) fields.summary = title;
    if (priority) fields.priority = { name: priority };
    if (storyPoints != null) fields.customfield_10016 = storyPoints;
    if (assignee) {
      const users = await api.get('/user/search', { params: { query: assignee, maxResults: 1 } }).catch(() => ({ data: [] }));
      if (users.data?.[0]?.accountId) fields.assignee = { accountId: users.data[0].accountId };
    }
    if (Object.keys(fields).length > 0) await api.put(`/issue/${jiraKey}`, { fields }).catch(() => {});

    if (status) {
      const transitions = await api.get(`/issue/${jiraKey}/transitions`).catch(() => ({ data: { transitions: [] } }));
      const match = transitions.data.transitions.find(t =>
        t.name.toLowerCase() === status.toLowerCase() ||
        t.to?.name?.toLowerCase() === status.toLowerCase()
      );
      if (match) await api.post(`/issue/${jiraKey}/transitions`, { transition: { id: match.id } }).catch(() => {});
    }
  } catch (e) {
    console.error('Jira update issue failed:', e.message);
  }
}

async function createJiraIssue(project, title, priority, assignee, storyPoints) {
  const config = getConfig();
  if (!config || !project.jira_project_key) return null;
  try {
    const api = makeApiClient(config);
    const agile = makeAgileClient(config);

    const body = {
      fields: {
        project: { key: project.jira_project_key },
        summary: title,
        issuetype: { name: 'Story' },
        priority: { name: priority || 'Medium' }
      }
    };
    if (assignee) {
      const users = await api.get('/user/search', { params: { query: assignee, maxResults: 1 } }).catch(() => ({ data: [] }));
      if (users.data?.[0]?.accountId) body.fields.assignee = { accountId: users.data[0].accountId };
    }
    if (storyPoints) body.fields.customfield_10016 = storyPoints;

    const res = await api.post('/issue', body);
    const issueKey = res.data.key;

    // Add to active sprint if one exists
    const activeSprint = db.prepare('SELECT * FROM sprints WHERE project_id = ? AND status = ? LIMIT 1').get(project.id, 'active');
    if (activeSprint?.jira_sprint_id) {
      await agile.post(`/sprint/${activeSprint.jira_sprint_id}/issue`, { issues: [issueKey] }).catch(() => {});
    }

    return issueKey;
  } catch (e) {
    console.error('Jira create issue failed:', e.response?.data || e.message);
    return null;
  }
}

router.get('/project/:projectId', (req, res) => {
  res.json(db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY updated_at DESC').all(req.params.projectId));
});

router.get('/sprint/:sprintId', (req, res) => {
  res.json(db.prepare('SELECT * FROM tasks WHERE sprint_id = ? ORDER BY status, priority').all(req.params.sprintId));
});

router.post('/', async (req, res) => {
  const { sprint_id, project_id, team_id, title, description, status, issue_type, assignee, story_points, time_estimate, time_remaining, priority, due_date } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: 'project_id and title are required' });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
  const jiraKey = await createJiraIssue(project, title, priority, assignee, story_points);

  const result = db.prepare(`
    INSERT INTO tasks (jira_key, sprint_id, project_id, team_id, title, description, status, issue_type, assignee, story_points, time_estimate, time_remaining, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jiraKey || null, sprint_id || null, project_id, team_id || null, title, description || '',
    status || 'To Do', issue_type || 'Story', assignee || '',
    story_points || null, time_estimate || 0, time_remaining || 0,
    priority || 'Medium', due_date || null
  );
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', async (req, res) => {
  const { title, description, status, assignee, story_points, time_estimate, time_remaining, time_spent, priority, due_date, sprint_id } = req.body;
  db.prepare(`
    UPDATE tasks SET title=?, description=?, status=?, assignee=?, story_points=?, time_estimate=?, time_remaining=?, time_spent=?, priority=?, due_date=?, sprint_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(title, description, status, assignee, story_points, time_estimate, time_remaining, time_spent || 0, priority, due_date, sprint_id || null, req.params.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (task.jira_key) {
    updateJiraIssue(task.jira_key, { title, status, priority, assignee, storyPoints: story_points });
  }
  if (task.monday_item_id) {
    const project = db.prepare('SELECT monday_board_id FROM projects WHERE id = ?').get(task.project_id);
    if (project?.monday_board_id) {
      updateMondayItem(task.monday_item_id, project.monday_board_id, { status, title });
    }
  }
  res.json(task);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
