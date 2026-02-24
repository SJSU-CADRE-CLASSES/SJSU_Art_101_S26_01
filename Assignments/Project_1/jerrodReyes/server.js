const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });
const thewiredClients = new Set();
const steampageClients = new Set();

wss.on('connection', (ws, req) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'register') {
        ws.page = msg.page;
        if (msg.page === 'thewired') thewiredClients.add(ws);
        if (msg.page === 'steampage') steampageClients.add(ws);
      }
      if (msg.type === 'browser' && ws.page === 'index') {
        thewiredClients.forEach((client) => {
          if (client.readyState === 1) client.send(JSON.stringify(msg));
        });
        steampageClients.forEach((client) => {
          if (client.readyState === 1) client.send(JSON.stringify(msg));
        });
      }
    } catch (_) {}
  });
  ws.on('close', () => {
    thewiredClients.delete(ws);
    steampageClients.delete(ws);
  });
});
