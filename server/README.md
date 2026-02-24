# Simple Express server

You need **Node.js** installed. If `node` or `npm` are not recognized, install from [nodejs.org](https://nodejs.org/) and restart your terminal.

## Run the server (PowerShell on Windows)

```powershell
cd server
npm install
npm start
```

**Important:** Wait until you see `Server running. Open in your browser:` in the terminal, then open in your browser:

- **http://localhost:3000** or **http://127.0.0.1:3000** (try 127.0.0.1 if localhost says "connection failed")

If you get "connection failed":
1. Keep the terminal open (server must stay running).
2. Try **http://127.0.0.1:3000** instead of localhost.
3. Temporarily disable browser/antivirus "secure browsing" or VPN for localhost.

If port 3000 is in use: `$env:PORT=8080; npm start` then open http://127.0.0.1:8080
