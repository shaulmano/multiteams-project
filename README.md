# Scrum Dashboard

A real-time Scrum/Sprint management dashboard with bidirectional Jira integration.

## Features

- **Project & Sprint Overview** — view active sprints, days remaining (working days, Israel schedule), and task progress across all projects
- **Task Management** — create, update, and delete tasks directly from the dashboard; changes sync to Jira automatically
- **Bidirectional Jira Sync** — pull latest status from Jira; push new tasks and status changes back to Jira
- **Team Members** — automatically imported from Jira assignees during sync
- **Custom Jira Fields** — Time Estimation, Remaining Hours, QA Owner
- **Daily Snapshots** — morning/evening snapshots captured automatically for tracking progress over time
- **Auto-Sync Scheduler** — syncs all active projects at 08:00 and 18:00 daily

---

## Prerequisites

- **Node.js 24+** — the server uses the built-in `node:sqlite` module (Node 24 required)
- A **Jira Cloud** account with admin access (for API token generation)
- Windows (the `start.bat` launcher) or any OS with Node.js installed

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd scrum-dashboard
```

### 2. Install dependencies

```bash
npm run install:all
```

This installs dependencies for the root, server, and client in one command.

---

## Configuration

### 3. Start the application

```bash
# Windows
start.bat

# Or directly:
npm run dev
```

- **API Server**: http://localhost:3001
- **Dashboard**: http://localhost:5173

### 4. Configure Jira credentials

Open the dashboard → go to **Settings** → enter:

| Field | Value |
|-------|-------|
| Jira Base URL | `https://your-domain.atlassian.net` |
| Email | Your Jira account email |
| API Token | Generate at https://id.atlassian.com/manage-profile/security/api-tokens |

### 5. Create a project

1. Click **"פרויקט חדש"** (New Project)
2. Enter project name and the **Jira Project Key** (e.g. `QA`, `DEV`)
3. Click **"סנכרן מ-Jira"** (Sync from Jira) to import sprints and tasks

---

## Project Structure

```
scrum-dashboard/
├── client/                  # React + Vite frontend (TypeScript)
│   └── src/
│       ├── components/      # ProjectCard, ProjectDetail, TaskList, etc.
│       └── types/           # TypeScript interfaces
├── server/                  # Node.js + Express backend
│   └── src/
│       ├── db.js            # SQLite setup and schema
│       ├── index.js         # Server entry point
│       ├── routes/          # tasks, sprints, teams, config, dashboard
│       └── services/
│           └── jiraService.js  # Jira API sync logic
├── data/                    # SQLite database (created on first run, gitignored)
├── start.bat                # Windows launcher
└── package.json             # Root scripts
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client (concurrently) |
| `npm run server` | Start server only |
| `npm run client` | Start client only |
| `npm run install:all` | Install all dependencies |

---

## Jira Sync Behavior

- **Pull from Jira**: imports active/future sprints, all issues in those sprints, assignees as team members
- **Push to Jira**: creating a task in the dashboard creates a Jira issue in the active sprint; updating status/fields updates Jira
- **Closed sprints**: automatically removed from the dashboard on sync
- **Custom fields synced**: `customfield_10203` (Time Estimation), `customfield_10204` (Remaining Hours), `customfield_10205` (QA Owner)

> Note: Custom field IDs may differ between Jira instances. If fields don't appear, check your Jira field configuration and update the field IDs in `server/src/services/jiraService.js`.

---

## Database

The SQLite database is created automatically at `data/dashboard.db` on first run. It is excluded from version control (`.gitignore`). To reset all data, delete the `data/` directory and restart the server.

---

## Working Days

Days remaining in sprints are calculated using **Israeli working days**: Sunday–Thursday count, Friday and Saturday are excluded.
