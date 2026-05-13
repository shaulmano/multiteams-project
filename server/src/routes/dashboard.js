const express = require('express');
const router = express.Router();
const db = require('../db');

const DONE_LOWER = new Set(['done','closed','resolved','complete','completed','fixed']);

function analyzeProject(p) {
  const today = new Date();
  const start = new Date(p.start_date);
  const end = new Date(p.end_date);
  const totalDays = Math.max(1, (end - start) / 86400000);
  const elapsedDays = Math.max(0, (today - start) / 86400000);
  const timeProgress = Math.min(100, (elapsedDays / totalDays) * 100);

  const totalTasks = p.total_tasks || 0;
  const doneTasks = p.done_tasks || 0;
  const totalPoints = p.total_points || 0;
  const donePoints = p.done_points || 0;
  const tasksWithPoints = p.tasks_with_points || 0;

  const taskProgress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const pointProgress = totalPoints > 0 ? (donePoints / totalPoints) * 100 : 0;
  // Use story points only if they cover ≥50% of tasks — otherwise task count is more reliable
  const pointCoverage = totalTasks > 0 ? tasksWithPoints / totalTasks : 0;
  const progressMetric = pointCoverage >= 0.5 ? pointProgress : taskProgress;
  const lag = timeProgress - progressMetric;

  let daysRemaining = 0;
  if (end > today) {
    const cur = new Date(today); cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end); endDay.setHours(23, 59, 59, 0);
    while (cur <= endDay) {
      const d = cur.getDay();
      if (d !== 5 && d !== 6) daysRemaining++;
      cur.setDate(cur.getDate() + 1);
    }
  }
  const flags = [];

  let health = 'on-track';
  let healthLabel = 'בזמן';

  if (today > end && progressMetric < 100) {
    health = 'overdue';
    healthLabel = 'באיחור';
    flags.push(`הפרויקט עבר את תאריך הסיום ב-${Math.abs(daysRemaining)} ימים`);
  } else if (lag > 20) {
    health = 'at-risk';
    healthLabel = 'בסיכון';
    flags.push(`מאחר ב-${Math.round(lag)}% מול לוח הזמנים`);
  } else if (lag > 10) {
    health = 'warning';
    healthLabel = 'אזהרה';
    flags.push(`קצב ההתקדמות נמוך מהצפוי`);
  }

  if (p.no_estimate_count > 0) {
    flags.push(`${p.no_estimate_count} משימות פתוחות ללא הערכת נקודות`);
  }

  return {
    ...p,
    time_progress: Math.round(timeProgress),
    task_progress: Math.round(taskProgress),
    point_progress: Math.round(pointProgress),
    health,
    health_label: healthLabel,
    flags,
    days_remaining: daysRemaining
  };
}

router.get('/overview', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM teams t WHERE t.project_id = p.id) as total_teams,
      COUNT(DISTINCT tk.id) as total_tasks,
      SUM(CASE WHEN LOWER(tk.status) IN ('done','closed','resolved','complete','completed','fixed') THEN 1 ELSE 0 END) as done_tasks,
      SUM(COALESCE(tk.story_points, 0)) as total_points,
      SUM(CASE WHEN LOWER(tk.status) IN ('done','closed','resolved','complete','completed','fixed') THEN COALESCE(tk.story_points,0) ELSE 0 END) as done_points,
      SUM(CASE WHEN LOWER(tk.status) NOT IN ('done','closed','resolved','complete','completed','fixed') THEN COALESCE(tk.story_points,0) ELSE 0 END) as remaining_points,
      SUM(CASE WHEN tk.story_points IS NOT NULL THEN 1 ELSE 0 END) as tasks_with_points,
      SUM(CASE WHEN tk.story_points IS NULL AND LOWER(tk.status) NOT IN ('done','closed','resolved','complete','completed','fixed') THEN 1 ELSE 0 END) as no_estimate_count,
      SUM(COALESCE(tk.time_spent, 0)) as time_spent_total,
      SUM(CASE WHEN LOWER(tk.status) NOT IN ('done','closed','resolved','complete','completed','fixed') THEN COALESCE(tk.time_remaining, 0) ELSE 0 END) as time_remaining_total,
      (SELECT name FROM sprints WHERE project_id = p.id AND status = 'active' ORDER BY start_date DESC LIMIT 1) as active_sprint_name,
      (SELECT start_date FROM sprints WHERE project_id = p.id AND status = 'active' ORDER BY start_date DESC LIMIT 1) as active_sprint_start,
      (SELECT end_date FROM sprints WHERE project_id = p.id AND status = 'active' ORDER BY start_date DESC LIMIT 1) as active_sprint_end
    FROM projects p
    LEFT JOIN tasks tk ON tk.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(projects.map(analyzeProject));
});

router.get('/project/:id', (req, res) => {
  const projectId = req.params.id;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Not found' });

  const teams = db.prepare(`
    SELECT t.*, COUNT(tm.id) as member_count
    FROM teams t LEFT JOIN team_members tm ON tm.team_id = t.id
    WHERE t.project_id = ? GROUP BY t.id
  `).all(projectId);

  const sprints = db.prepare(`
    SELECT s.*,
      COUNT(tk.id) as task_count,
      SUM(CASE WHEN LOWER(tk.status) IN ('done','closed','resolved','complete','completed','fixed') THEN 1 ELSE 0 END) as done_count,
      SUM(COALESCE(tk.story_points,0)) as total_points,
      SUM(CASE WHEN LOWER(tk.status) IN ('done','closed','resolved','complete','completed','fixed') THEN COALESCE(tk.story_points,0) ELSE 0 END) as done_points
    FROM sprints s LEFT JOIN tasks tk ON tk.sprint_id = s.id
    WHERE s.project_id = ? GROUP BY s.id ORDER BY s.start_date
  `).all(projectId);

  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(story_points),0) as points
    FROM tasks WHERE project_id = ? GROUP BY status
  `).all(projectId);

  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY updated_at DESC LIMIT 100').all(projectId);

  const snapshots = db.prepare(`
    SELECT snapshot_date, snapshot_time,
      SUM(COALESCE(time_remaining,0)) as total_remaining,
      SUM(CASE WHEN LOWER(status) IN ('done','closed','resolved','complete','completed','fixed') THEN 1 ELSE 0 END) as done_count,
      COUNT(*) as total_count
    FROM daily_snapshots WHERE project_id = ? AND snapshot_date >= date('now', '-14 days')
    GROUP BY snapshot_date, snapshot_time ORDER BY snapshot_date, snapshot_time
  `).all(projectId);

  const recentLogs = db.prepare('SELECT * FROM sync_logs WHERE project_id = ? ORDER BY synced_at DESC LIMIT 5').all(projectId);

  res.json({ project, teams, sprints, tasksByStatus, tasks, snapshots, recentLogs });
});

module.exports = router;
