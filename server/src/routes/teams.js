const express = require('express');
const router = express.Router();
const db = require('../db');

const withMembers = (team) => ({
  ...team,
  members: db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(team.id)
});

router.get('/project/:projectId', (req, res) => {
  const teams = db.prepare('SELECT * FROM teams WHERE project_id = ?').all(req.params.projectId);
  res.json(teams.map(withMembers));
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM teams').all().map(withMembers));
});

router.post('/', (req, res) => {
  const { project_id, name, members = [] } = req.body;
  if (!project_id || !name) return res.status(400).json({ error: 'project_id and name are required' });

  const result = db.prepare('INSERT INTO teams (project_id, name) VALUES (?, ?)').run(project_id, name);
  const teamId = result.lastInsertRowid;

  const insertMember = db.prepare(
    'INSERT INTO team_members (team_id, name, email, jira_account_id, role) VALUES (?, ?, ?, ?, ?)'
  );
  members.forEach(m => insertMember.run(teamId, m.name, m.email || '', m.jira_account_id || '', m.role || 'Developer'));

  res.status(201).json(withMembers(db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId)));
});

router.put('/:id', (req, res) => {
  const { name, velocity } = req.body;
  db.prepare('UPDATE teams SET name=?, velocity=? WHERE id=?').run(name, velocity || 0, req.params.id);
  res.json(withMembers(db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:teamId/members', (req, res) => {
  const { name, email, jira_account_id, role } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare(
    'INSERT INTO team_members (team_id, name, email, jira_account_id, role) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.teamId, name, email || '', jira_account_id || '', role || 'Developer');
  res.status(201).json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:teamId/members/:memberId', (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ? AND team_id = ?').run(req.params.memberId, req.params.teamId);
  res.json({ success: true });
});

module.exports = router;
