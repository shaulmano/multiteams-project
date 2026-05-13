const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/config', require('./routes/config'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/jira', require('./routes/jira'));
app.use('/api/dashboard', require('./routes/dashboard'));

require('./services/scheduler');

app.listen(PORT, () => {
  console.log(`\n🚀 Scrum Dashboard Server running at http://localhost:${PORT}\n`);
});
