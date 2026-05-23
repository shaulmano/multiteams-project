const express = require('express');
const router = express.Router();

const clients = new Set();

router.get('/', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  res.write('event: connected\ndata: {}\n\n');

  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function broadcast(event, data = {}) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try { client.write(msg); } catch (_) { clients.delete(client); }
  }
}

module.exports = { router, broadcast };
