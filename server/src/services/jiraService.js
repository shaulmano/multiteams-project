const axios = require('axios');
const db = require('../db');

function getConfig() {
  return db.prepare('SELECT * FROM jira_configs ORDER BY id DESC LIMIT 1').get();
}

function makeAgileClient(config) {
  return axios.create({
    baseURL: `${config.base_url}/rest/agile/1.0`,
    auth: { username: config.email, password: config.api_token },
    headers: { Accept: 'application/json' },
    timeout: 15000
  });
}

function makeApiClient(config) {
  return axios.create({
    baseURL: `${config.base_url}/rest/api/3`,
    auth: { username: config.email, password: config.api_token },
    headers: { Accept: 'application/json' },
    timeout: 15000
  });
}

const stmtSnapshotCheck = db.prepare('SELECT id FROM daily_snapshots WHERE task_id=? AND snapshot_date=? AND snapshot_time=?');
const stmtSnapshotInsert = db.prepare('INSERT INTO daily_snapshots (task_id, project_id, snapshot_date, snapshot_time, status, time_remaining, time_spent, story_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const stmtTaskLookup = db.prepare('SELECT id FROM tasks WHERE jira_key = ?');
const stmtTaskUpdate = db.prepare('UPDATE tasks SET title=?, status=?, assignee=?, story_points=?, time_estimate=?, time_remaining=?, time_spent=?, sprint_id=?, due_date=?, time_estimation=?, remaining_hours=?, qa_owner=?, updated_at=CURRENT_TIMESTAMP WHERE id=?');
const stmtTaskInsert = db.prepare('INSERT INTO tasks (jira_key, sprint_id, project_id, team_id, title, status, assignee, story_points, time_estimate, time_remaining, time_spent, priority, issue_type, due_date, time_estimation, remaining_hours, qa_owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

function takeSnapshot(projectId, snapshotTime = 'morning') {
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId);
  const today = new Date().toISOString().split('T')[0];
  for (const task of tasks) {
    if (!stmtSnapshotCheck.get(task.id, today, snapshotTime)) {
      stmtSnapshotInsert.run(task.id, projectId, today, snapshotTime, task.status, task.time_remaining, task.time_spent, task.story_points);
    }
  }
}

function ensureDefaultTeam(projectId) {
  let team = db.prepare('SELECT * FROM teams WHERE project_id = ? ORDER BY id LIMIT 1').get(projectId);
  if (!team) {
    const r = db.prepare('INSERT INTO teams (project_id, name, velocity) VALUES (?, ?, 0)').run(projectId, 'צוות');
    team = { id: r.lastInsertRowid, project_id: projectId, name: 'צוות', velocity: 0 };
  }
  return team;
}

function upsertTeamMembers(teamId, assigneesMap) {
  for (const member of assigneesMap.values()) {
    const existing = db.prepare(
      'SELECT id FROM team_members WHERE team_id = ? AND (jira_account_id = ? OR (jira_account_id IS NULL AND name = ?))'
    ).get(teamId, member.jira_account_id || '', member.name);
    if (existing) {
      db.prepare('UPDATE team_members SET name=?, email=?, jira_account_id=? WHERE id=?')
        .run(member.name, member.email, member.jira_account_id, existing.id);
    } else {
      db.prepare('INSERT INTO team_members (team_id, name, email, jira_account_id, role) VALUES (?, ?, ?, ?, ?)')
        .run(teamId, member.name, member.email, member.jira_account_id, 'Developer');
    }
  }
}

function toDate(isoStr) {
  if (!isoStr) return null;
  // Keep only YYYY-MM-DD, strip time/timezone
  return isoStr.split('T')[0];
}

function collectAssignee(issue, map) {
  const a = issue.fields?.assignee;
  if (!a) return;
  const key = a.accountId || a.displayName;
  if (key && !map.has(key)) {
    map.set(key, { name: a.displayName || '', email: a.emailAddress || '', jira_account_id: a.accountId || '' });
  }
}

async function syncProjectFromJira(projectId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) throw new Error('Project not found');
  if (!project.jira_project_key) throw new Error('No Jira project key configured for this project');

  const config = getConfig();
  if (!config) throw new Error('Jira credentials not configured. Please go to Settings.');

  const agile = makeAgileClient(config);
  const api = makeApiClient(config);
  let itemsSynced = 0;
  const assigneesMap = new Map();

  try {
    const boardsRes = await agile.get('/board', {
      params: { projectKeyOrId: project.jira_project_key, maxResults: 50 }
    }).catch(() => ({ data: { values: [] } }));

    const boards = boardsRes.data?.values || [];
    const defaultTeam = ensureDefaultTeam(projectId);

    // Remove tasks that belong to closed/missing sprints before re-syncing
    db.prepare(`
      DELETE FROM tasks WHERE project_id = ? AND sprint_id IN (
        SELECT id FROM sprints WHERE project_id = ? AND status = 'closed'
      )
    `).run(projectId, projectId);
    db.prepare('DELETE FROM sprints WHERE project_id = ? AND status = ?').run(projectId, 'closed');

    if (boards.length > 0) {
      for (const board of boards) {
        const sprintsRes = await agile.get(`/board/${board.id}/sprint`, {
          params: { state: 'active,future', maxResults: 10 }
        }).catch(() => ({ data: { values: [] } }));

        for (const jiraSprint of (sprintsRes.data?.values || [])) {
const existing = db.prepare('SELECT * FROM sprints WHERE jira_sprint_id = ?').get(jiraSprint.id);
          let sprintDbId;

          const sprintStart = toDate(jiraSprint.startDate);
          const sprintEnd = toDate(jiraSprint.endDate);

          if (existing) {
            db.prepare('UPDATE sprints SET name=?, start_date=?, end_date=?, status=? WHERE id=?').run(
              jiraSprint.name, sprintStart, sprintEnd, jiraSprint.state, existing.id
            );
            sprintDbId = existing.id;
          } else {
            const r = db.prepare(
              'INSERT INTO sprints (team_id, project_id, jira_sprint_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(defaultTeam.id, projectId, jiraSprint.id, jiraSprint.name, sprintStart, sprintEnd, jiraSprint.state);
            sprintDbId = r.lastInsertRowid;
          }

          const issuesRes = await agile.get(`/sprint/${jiraSprint.id}/issue`, {
            params: { maxResults: 200, fields: 'summary,status,assignee,timetracking,priority,issuetype,customfield_10016,duedate,customfield_10203,customfield_10204,customfield_10205' }
          }).catch(() => ({ data: { issues: [] } }));

          for (const issue of (issuesRes.data?.issues || [])) {
            collectAssignee(issue, assigneesMap);
            upsertTask(issue, projectId, defaultTeam.id, sprintDbId);
            itemsSynced++;
          }
        }
      }
    } else {
      const jql = `project = "${project.jira_project_key}" AND sprint in openSprints() ORDER BY updated DESC`;
      const searchRes = await api.get('/search', {
        params: { jql, maxResults: 200, fields: 'summary,status,assignee,timetracking,priority,issuetype,customfield_10016,duedate,customfield_10203,customfield_10204,customfield_10205' }
      }).catch(() => ({ data: { issues: [] } }));

      for (const issue of (searchRes.data?.issues || [])) {
        collectAssignee(issue, assigneesMap);
        upsertTask(issue, projectId, defaultTeam.id, null);
        itemsSynced++;
      }
    }

    // Refresh all tasks with jira_key in DB — catches status changes made in Jira
    // regardless of sprint membership (covers dashboard-created tasks + out-of-sprint updates)
    const keysInDb = db.prepare('SELECT jira_key FROM tasks WHERE project_id = ? AND jira_key IS NOT NULL').all(projectId).map(r => r.jira_key);
    if (keysInDb.length > 0) {
      const FIELDS = 'summary,status,assignee,timetracking,priority,issuetype,customfield_10016,duedate,customfield_10203,customfield_10204,customfield_10205';
      const jql = `key in (${keysInDb.map(k => `"${k}"`).join(',')})`;
      const refreshRes = await api.get('/search', { params: { jql, maxResults: 200, fields: FIELDS } }).catch(() => ({ data: { issues: [] } }));
      for (const issue of (refreshRes.data?.issues || [])) {
        collectAssignee(issue, assigneesMap);
        const sprintRow = db.prepare('SELECT id FROM sprints WHERE project_id = ? AND status = ? LIMIT 1').get(projectId, 'active');
        upsertTask(issue, projectId, defaultTeam.id, sprintRow?.id || null);
      }
    }

    upsertTeamMembers(defaultTeam.id, assigneesMap);
    takeSnapshot(projectId, getSnapshotTime());
    db.prepare('INSERT INTO sync_logs (project_id, sync_type, status, message, items_synced) VALUES (?, ?, ?, ?, ?)').run(
      projectId, 'manual', 'success', `Synced ${itemsSynced} issues`, itemsSynced
    );
    return { success: true, itemsSynced };

  } catch (err) {
    db.prepare('INSERT INTO sync_logs (project_id, sync_type, status, message) VALUES (?, ?, ?, ?)').run(
      projectId, 'manual', 'error', err.message
    );
    throw err;
  }
}

const DONE_STATUSES_LOWER = new Set(['done', 'closed', 'resolved', 'complete', 'completed', 'fixed', 'won\'t fix', 'duplicate']);

function upsertTask(issue, projectId, teamId, sprintDbId) {
  const f = issue.fields;
  const sp = f.customfield_10016 || f.story_points || null;
  const te = f.timetracking?.originalEstimateSeconds || 0;
  const ts = f.timetracking?.timeSpentSeconds || 0;
  const status = f.status?.name || 'To Do';
  // If task is in a done-category, force remaining to 0 (Jira often doesn't clear it)
  const isDone = DONE_STATUSES_LOWER.has(status.toLowerCase());
  const tr = isDone ? 0 : (f.timetracking?.remainingEstimateSeconds || 0);
  const assignee = f.assignee?.displayName || '';
  const priority = f.priority?.name || 'Medium';
  const issueType = f.issuetype?.name || 'Story';
  const title = f.summary || issue.key;

  const dueDate = toDate(f.duedate);
  const timeEstimation = f.customfield_10203 || null;
  const remainingHours = f.customfield_10204 || null;
  const qaOwner = f.customfield_10205?.displayName || f.customfield_10205 || null;

  const existing = stmtTaskLookup.get(issue.key);
  if (existing) {
    stmtTaskUpdate.run(title, status, assignee, sp, te, tr, ts, sprintDbId, dueDate, timeEstimation, remainingHours, qaOwner, existing.id);
  } else {
    stmtTaskInsert.run(issue.key, sprintDbId, projectId, teamId || null, title, status, assignee, sp, te, tr, ts, priority, issueType, dueDate, timeEstimation, remainingHours, qaOwner);
  }
}

function getSnapshotTime() {
  const hour = new Date().getHours();
  return hour < 14 ? 'morning' : 'evening';
}

async function syncAllProjects() {
  const projects = db.prepare("SELECT * FROM projects WHERE status='active' AND jira_project_key IS NOT NULL").all();
  for (const p of projects) {
    try {
      await syncProjectFromJira(p.id);
    } catch (e) {
      console.error(`Sync failed for project "${p.name}":`, e.message);
    }
  }
}

module.exports = { getConfig, makeApiClient, makeAgileClient, syncProjectFromJira, syncAllProjects, takeSnapshot };
