# 3D Walkable Gallery

A web-based 3D gallery built with **Node.js**, **HTML**, and **Three.js**. The gallery uses textures from the official Three.js examples as artwork. You can walk through the space and click on pieces to read their descriptions.

## Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

- **Click** anywhere to lock the pointer and enter the gallery.
- **WASD** to move.
- **Mouse** to look around.
- **Click** on a framed artwork to show its title and description in the bottom panel.
- **Esc** to release the pointer.

## Stack

- **Node.js** + Express — static file server
- **Three.js** (r170) — 3D scene, PointerLockControls, lighting, shadows
- **Assets** — textures loaded from the Three.js examples CDN (jsDelivr)
