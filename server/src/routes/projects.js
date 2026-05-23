const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      COUNT(DISTINCT t.id) as total_teams,
      COUNT(DISTINCT tk.id) as total_tasks,
      SUM(CASE WHEN tk.status IN ('Done','Closed','Resolved') THEN 1 ELSE 0 END) as done_tasks
    FROM projects p
    LEFT JOIN teams t ON t.project_id = p.id
    LEFT JOIN tasks tk ON tk.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(projects);
});

router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  project.teams = db.prepare('SELECT * FROM teams WHERE project_id = ?').all(req.params.id);
  project.sprints = db.prepare('SELECT * FROM sprints WHERE project_id = ? ORDER BY start_date').all(req.params.id);
  res.json(project);
});

router.post('/', (req, res) => {
  const { name, description, jira_project_key, monday_board_id, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'name, start_date and end_date are required' });
  }
  const result = db.prepare(
    'INSERT INTO projects (name, description, jira_project_key, monday_board_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, description || '', jira_project_key || null, monday_board_id || null, start_date, end_date);
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, description, jira_project_key, monday_board_id, start_date, end_date, status } = req.body;
  db.prepare(
    'UPDATE projects SET name=?, description=?, jira_project_key=?, monday_board_id=?, start_date=?, end_date=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(name, description, jira_project_key, monday_board_id || null, start_date, end_date, status, req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
