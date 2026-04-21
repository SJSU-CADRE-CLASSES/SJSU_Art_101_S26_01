# THOMAS — Shared Chaos Instrument

> A multi-user modular shader system driven by the Thomas cyclically symmetric attractor.

## Concept

**THOMAS** is a shared chaos instrument built on the Thomas cyclically symmetric attractor — a nonlinear dynamical system governed by a single damping parameter *b* that controls how deeply chaotic the behavior becomes. Each browser tab connecting to the server becomes an observer in the same phase space: cursor movement tilts the 3D projection of the attractor in real time, slider adjustments to parameters like damping, speed, and trail are broadcast instantly to all connected users, and click/tap events trigger synchronized audio pulses and particle disturbances visible to everyone. The result is a living, shared field — not a game, not a tool, but a space where multiple people can co-habit chaos and feel each other's presence through mathematics.

---

## Structure

```
thomas-attractor/
├── server.js       # Node.js WebSocket server
├── index.html      # Client (HTML + Canvas 2D + Web Audio API)
├── package.json
└── README.md
```

## Run Locally

```bash
npm install
npm start
# Open http://localhost:3000 in two browser windows
```

## Deploy to Render.com

1. Push to a GitHub repo
2. On Render → **New Web Service**
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. **Environment:** Node
6. Set port to `3000` (Render auto-maps via `process.env.PORT`)

## WebSocket Events

| Type | Direction | Payload |
|------|-----------|---------|
| `init` | server→client | Full shared state + assigned ID/hue |
| `user_join` / `user_leave` | server→all | User count update |
| `cursor` | bidirectional | `{x, y}` normalized 0–1 |
| `param` | bidirectional | `{key, value}` — synced slider |
| `pulse` | bidirectional | `{x, y}` — click event |

## Controls

| Control | Effect |
|---------|--------|
| **Move cursor** | Tilt the 3D projection; modulates audio filter |
| **Click / tap** | Emit pulse ring + percussive audio hit + particle disturbance |
| **Damping b** | `0.1` = wildly chaotic, `0.35` = nearly periodic |
| **Speed** | Simulation time multiplier |
| **Hue Shift** | Rotate particle color palette |
| **Trail** | Persistence of particle trails |
| **Audio Gain** | Master volume for drone + pulses |
| **[AUDIO OFF]** | Toggle Web Audio drone |

## Technical Notes

- **Thomas Attractor equations:** `dx/dt = sin(y) - b·x`, cyclic for y,z
- 1,800 particles simulated in JavaScript, drawn to Canvas 2D
- Web Audio API: 3 detuned oscillators (2× sawtooth, 1× square) through bandpass filter + LFO sweep
- All shared state lives on the server; clients receive full state on connect
- Cursor updates throttled to ~22fps; params throttled to ~20fps
- Auto-reconnect on disconnect
