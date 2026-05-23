const axios = require('axios');
const db = require('../db');

const MONDAY_API = 'https://api.monday.com/v2';
const API_VERSION = '2024-01';

function getConfig() {
  return db.prepare('SELECT * FROM monday_configs ORDER BY id DESC LIMIT 1').get();
}

function makeClient(config) {
  return axios.create({
    baseURL: MONDAY_API,
    headers: {
      Authorization: `Bearer ${config.api_token}`,
      'Content-Type': 'application/json',
      'API-Version': API_VERSION,
    },
    timeout: 15000,
  });
}

async function gql(client, query) {
  const res = await client.post('', { query });
  if (res.data.errors) throw new Error(res.data.errors[0]?.message || 'Monday API error');
  return res.data.data;
}

function mapStatus(text) {
  if (!text) return 'To Do';
  const l = text.toLowerCase();
  if (l === 'done' || l === 'complete' || l === 'completed' || l === 'סגור') return 'Done';
  if (l.includes('progress') || l.includes('working') || l === 'בעבודה') return 'In Progress';
  if (l.includes('review') || l === 'qa' || l === 'בדיקה') return 'In Review';
  if (l.includes('stuck') || l.includes('block') || l === 'תקוע') return 'Blocked';
  return 'To Do';
}

async function getBoards(config) {
  const client = makeClient(config);
  const data = await gql(client, 'query { boards(limit: 50, order_by: created_at) { id name } }');
  return data.boards || [];
}

async function syncBoardToProject(projectId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project?.monday_board_id) throw new Error('אין Board ID מוגדר לפרויקט — ערוך את הפרויקט והוסף Board ID');

  const config = getConfig();
  if (!config) throw new Error('Monday.com לא מוגדר — עבור להגדרות');

  const client = makeClient(config);

  const data = await gql(client, `query {
    boards(ids: [${project.monday_board_id}]) {
      columns { id title type }
      items_page(limit: 200) {
        items {
          id name state
          group { id title }
          column_values { id type text value }
        }
      }
    }
  }`);

  const board = data.boards?.[0];
  if (!board) throw new Error('לא נמצא Board עם המזהה הזה');

  const columns = board.columns || [];
  // Monday column type names in API v2
  const statusCol = columns.find(c => c.type === 'color' || c.type === 'status');
  const peopleCol = columns.find(c => c.type === 'multiple-person' || c.type === 'person');
  const numbersCol = columns.find(c => c.type === 'numeric' || c.type === 'numbers');
  const dateCol = columns.find(c => c.type === 'date');

  let team = db.prepare('SELECT * FROM teams WHERE project_id = ? ORDER BY id LIMIT 1').get(projectId);
  if (!team) {
    const r = db.prepare('INSERT INTO teams (project_id, name, velocity) VALUES (?, ?, 0)').run(projectId, 'צוות');
    team = { id: r.lastInsertRowid };
  }

  // Map groups → sprints
  const groupSprintMap = {};
  const items = board.items_page?.items || [];
  const seenGroups = new Set();
  for (const item of items) {
    const g = item.group;
    if (!g || seenGroups.has(g.id)) continue;
    seenGroups.add(g.id);
    const existing = db.prepare('SELECT id FROM sprints WHERE project_id = ? AND name = ?').get(projectId, g.title);
    if (existing) {
      groupSprintMap[g.id] = existing.id;
    } else {
      const r = db.prepare('INSERT INTO sprints (team_id, project_id, name, status) VALUES (?, ?, ?, ?)').run(
        team.id, projectId, g.title, 'active'
      );
      groupSprintMap[g.id] = r.lastInsertRowid;
    }
  }

  let itemsSynced = 0;
  for (const item of items) {
    const colMap = {};
    for (const cv of (item.column_values || [])) colMap[cv.id] = cv;

    const statusText = statusCol ? (colMap[statusCol.id]?.text || '') : '';
    const status = mapStatus(statusText);
    const assignee = peopleCol ? (colMap[peopleCol.id]?.text || '') : '';
    const spRaw = numbersCol ? parseFloat(colMap[numbersCol.id]?.text || '') : NaN;
    const storyPoints = isNaN(spRaw) || spRaw === 0 ? null : spRaw;
    const dueDate = dateCol ? (colMap[dateCol.id]?.text || null) : null;
    const sprintId = item.group ? (groupSprintMap[item.group.id] ?? null) : null;

    const existing = db.prepare('SELECT id FROM tasks WHERE monday_item_id = ?').get(String(item.id));
    if (existing) {
      db.prepare('UPDATE tasks SET title=?, status=?, assignee=?, story_points=?, due_date=?, sprint_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(item.name, status, assignee, storyPoints, dueDate, sprintId, existing.id);
    } else {
      db.prepare('INSERT INTO tasks (monday_item_id, project_id, team_id, sprint_id, title, status, assignee, story_points, due_date, priority, issue_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(String(item.id), projectId, team.id, sprintId, item.name, status, assignee, storyPoints, dueDate, 'Medium', 'Story');
    }
    itemsSynced++;
  }

  db.prepare('INSERT INTO sync_logs (project_id, sync_type, status, message, items_synced) VALUES (?, ?, ?, ?, ?)').run(
    projectId, 'monday', 'success', `סונכרנו ${itemsSynced} פריטים ממנדיי`, itemsSynced
  );

  return { success: true, itemsSynced };
}

const STATUS_TO_MONDAY = {
  'Done': 'Done',
  'In Progress': 'Working on it',
  'In Review': 'In Review',
  'Blocked': 'Stuck',
  'To Do': 'Not Started',
};

async function updateMondayItem(itemId, boardId, { status, title }) {
  const config = getConfig();
  if (!config || !itemId || !boardId) return;
  try {
    const client = makeClient(config);

    if (status) {
      const colData = await gql(client, `query {
        boards(ids: [${boardId}]) { columns { id type } }
      }`).catch(() => null);
      const statusCol = colData?.boards?.[0]?.columns?.find(c => c.type === 'color' || c.type === 'status');
      if (statusCol) {
        const label = STATUS_TO_MONDAY[status] ?? 'Not Started';
        await gql(client, `mutation {
          change_column_value(item_id: ${itemId}, board_id: ${boardId}, column_id: "${statusCol.id}", value: "{\\"label\\":\\"${label}\\"}") { id }
        }`).catch(() => {});
      }
    }

    if (title) {
      await gql(client, `mutation {
        change_column_value(item_id: ${itemId}, board_id: ${boardId}, column_id: "name", value: ${JSON.stringify(JSON.stringify(title))}) { id }
      }`).catch(() => {});
    }
  } catch (e) {
    console.error('Monday update item failed:', e.message);
  }
}

async function syncAllMondayProjects() {
  const projects = db.prepare("SELECT * FROM projects WHERE status='active' AND monday_board_id IS NOT NULL").all();
  for (const p of projects) {
    try {
      await syncBoardToProject(p.id);
    } catch (e) {
      console.error(`Monday sync failed for project "${p.name}":`, e.message);
    }
  }
}

module.exports = { getConfig, getBoards, syncBoardToProject, syncAllMondayProjects, updateMondayItem };
