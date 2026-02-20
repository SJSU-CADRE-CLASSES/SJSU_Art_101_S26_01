# MediaPipe Skeleton Tracker (Pose)

Open `examples/mediapipe-skeleton-tracker.html` **using a local server** so the webcam permission works.

## Run (Windows / PowerShell)

From the repo root:

```powershell
python -m http.server 8000
```

Then open:

- `http://localhost:8000/examples/mediapipe-skeleton-tracker.html`

## Notes

- If you see “Camera requires a secure context”, make sure you’re using `http://localhost/...` (not `file://...`).
- The page downloads the MediaPipe WASM runtime + a pose model from a CDN, so you need internet for the first load.

