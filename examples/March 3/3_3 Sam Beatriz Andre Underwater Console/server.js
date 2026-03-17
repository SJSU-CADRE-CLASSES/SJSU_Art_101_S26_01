const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

app.use(express.json());
app.use(express.static(__dirname));

function readMessages() {
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeMessages(messages) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// GET /api/messages — fetch all messages (shared across all visitors)
app.get('/api/messages', (req, res) => {
  res.json(readMessages());
});

// POST /api/messages — add a new message
app.post('/api/messages', (req, res) => {
  const messages = readMessages();
  const { id, px, py, pz, nx, ny, nz, message } = req.body;
  if (!id || message == null) {
    return res.status(400).json({ error: 'Missing id or message' });
  }
  messages.push({ id, px, py, pz, nx, ny, nz, message: String(message).trim().slice(0, 100) });
  writeMessages(messages);
  res.status(201).json({ ok: true });
});

// Default route -> library.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'library.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

