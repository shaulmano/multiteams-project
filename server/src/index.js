const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve React frontend in production
const distPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.use('/api/config', require('./routes/config'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/jira', require('./routes/jira'));
app.use('/api/monday', require('./routes/monday'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/events', require('./routes/events').router);

require('./services/scheduler');

// Catch-all: serve React app for non-API routes
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Scrum Dashboard Server running at http://localhost:${PORT}\n`);
});
