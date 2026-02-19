const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = 3001;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Create HTTP server (Express doesn't create one by default for WebSocket attachment)
const server = http.createServer(app);

// Attach WebSocket server on the same port
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    // Broadcast to every other connected client (so both pages stay in sync)
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('  Drag page: http://localhost:' + PORT + '/');
  console.log('  View page: http://localhost:' + PORT + '/view');
});
