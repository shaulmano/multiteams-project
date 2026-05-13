const cron = require('node-cron');
const { syncAllProjects, takeSnapshot } = require('./jiraService');
const db = require('../db');

// Morning sync 08:00
cron.schedule('0 8 * * *', async () => {
  console.log('[Scheduler] Morning sync starting...');
  await syncAllProjects('morning').catch(e => console.error('[Scheduler] Morning sync error:', e.message));
});

// Evening sync 18:00
cron.schedule('0 18 * * *', async () => {
  console.log('[Scheduler] Evening sync starting...');
  await syncAllProjects('evening').catch(e => console.error('[Scheduler] Evening sync error:', e.message));
});

console.log('[Scheduler] Initialized — auto-sync at 08:00 and 18:00 daily');
