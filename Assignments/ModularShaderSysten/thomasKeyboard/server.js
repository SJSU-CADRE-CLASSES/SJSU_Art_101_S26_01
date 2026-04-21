const { WebSocketServer } = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

let sharedState = {
  b: 0.208,
  speed: 1.0,
  colorShift: 0.0,
  audioGain: 0.5,
  trail: 0.94,
  glowIntensity: 1.2,
  noiseAmt: 0.18,
  users: {},
};

let nextId = 1;

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); }
    else { res.writeHead(200, { "Content-Type": "text/html" }); res.end(data); }
  });
});

const wss = new WebSocketServer({ server });
const clients = new Map();

function broadcast(data, exceptId = null) {
  const msg = JSON.stringify(data);
  for (const [ws, id] of clients) {
    if (id !== exceptId && ws.readyState === 1) ws.send(msg);
  }
}
function broadcastAll(data) {
  const msg = JSON.stringify(data);
  for (const [ws] of clients) { if (ws.readyState === 1) ws.send(msg); }
}

wss.on("connection", (ws) => {
  const id = `u${nextId++}`;
  clients.set(ws, id);
  const hue = Math.floor(Math.random() * 360);
  sharedState.users[id] = { x: 0.5, y: 0.5, hue, active: true };

  ws.send(JSON.stringify({ type: "init", id, hue, state: sharedState, count: clients.size }));
  broadcast({ type: "user_join", id, hue, count: clients.size });

  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case "cursor":
        sharedState.users[id] = { ...sharedState.users[id], x: msg.x, y: msg.y };
        broadcast({ type: "cursor", id, x: msg.x, y: msg.y, hue: sharedState.users[id].hue }, id);
        break;
      case "param":
        if (msg.key in sharedState && typeof sharedState[msg.key] === "number") {
          sharedState[msg.key] = Math.max(msg.min ?? 0, Math.min(msg.max ?? 1, msg.value));
          broadcastAll({ type: "param", key: msg.key, value: sharedState[msg.key], by: id });
        }
        break;
      case "pulse":
        broadcastAll({ type: "pulse", id, x: msg.x, y: msg.y, hue: sharedState.users[id]?.hue ?? 180, note: msg.note });
        break;
      case "note":
        broadcastAll({ type: "note", id, note: msg.note, vel: msg.vel, hue: sharedState.users[id]?.hue ?? 180 });
        break;
    }
  });

  ws.on("close", () => {
    delete sharedState.users[id];
    clients.delete(ws);
    broadcast({ type: "user_leave", id, count: clients.size });
  });
});

server.listen(PORT, () => console.log(`THOMAS → http://localhost:${PORT}`));
