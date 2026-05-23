const cron = require('node-cron');
const { syncAllProjects, takeSnapshot } = require('./jiraService');
const { syncAllMondayProjects } = require('./mondayService');
const db = require('../db');

let syncRunning = false;

async function runAutoSync() {
  if (syncRunning) return;
  syncRunning = true;
  try {
    await syncAllProjects().catch(e => console.error('[AutoSync] Jira error:', e.message));
    await syncAllMondayProjects().catch(e => console.error('[AutoSync] Monday error:', e.message));
  } finally {
    syncRunning = false;
  }
}

// Auto-sync every 2 minutes
const INTERVAL_MS = 2 * 60 * 1000;
setInterval(runAutoSync, INTERVAL_MS);

// Daily snapshots at 08:00 and 18:00
cron.schedule('0 8 * * *', async () => {
  console.log('[Scheduler] Morning snapshot...');
  const projects = db.prepare("SELECT id FROM projects WHERE status='active'").all();
  for (const p of projects) takeSnapshot(p.id, 'morning');
  await syncAllProjects().catch(e => console.error('[Scheduler] Morning sync error:', e.message));
  await syncAllMondayProjects().catch(e => console.error('[Scheduler] Monday morning error:', e.message));
});

cron.schedule('0 18 * * *', async () => {
  console.log('[Scheduler] Evening snapshot...');
  const projects = db.prepare("SELECT id FROM projects WHERE status='active'").all();
  for (const p of projects) takeSnapshot(p.id, 'evening');
  await syncAllProjects().catch(e => console.error('[Scheduler] Evening sync error:', e.message));
  await syncAllMondayProjects().catch(e => console.error('[Scheduler] Monday evening error:', e.message));
});

console.log('[Scheduler] Auto-sync every 2 min | Snapshots at 08:00 & 18:00');
