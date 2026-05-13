const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'scrum.db'));

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS jira_configs (
    id INTEGER PRIMARY KEY,
    base_url TEXT NOT NULL,
    email TEXT NOT NULL,
    api_token TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    jira_project_key TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    velocity REAL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    jira_account_id TEXT DEFAULT '',
    role TEXT DEFAULT 'Developer',
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    project_id INTEGER NOT NULL,
    jira_sprint_id INTEGER,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    goal TEXT DEFAULT '',
    planned_points REAL DEFAULT 0,
    completed_points REAL DEFAULT 0,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id INTEGER,
    project_id INTEGER NOT NULL,
    team_id INTEGER,
    jira_key TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'To Do',
    issue_type TEXT DEFAULT 'Story',
    assignee TEXT DEFAULT '',
    assignee_id TEXT DEFAULT '',
    story_points REAL,
    time_estimate INTEGER DEFAULT 0,
    time_remaining INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'Medium',
    due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    snapshot_time TEXT DEFAULT 'morning',
    status TEXT,
    time_remaining INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    story_points REAL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    sync_type TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'success',
    message TEXT DEFAULT '',
    items_synced INTEGER DEFAULT 0,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Wrap prepare to normalize lastInsertRowid to Number
const origPrepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = origPrepare(sql);
  const origRun = stmt.run.bind(stmt);
  stmt.run = (...args) => {
    const r = origRun(...args);
    return { ...r, lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
  };
  return stmt;
};

module.exports = db;
