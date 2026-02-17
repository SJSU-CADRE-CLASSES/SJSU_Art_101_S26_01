# Simple Express server

You need **Node.js** installed. If `node` or `npm` are not recognized, install from [nodejs.org](https://nodejs.org/) and restart your terminal.

## Run the server (PowerShell on Windows)

```powershell
cd server
npm install
npm start
```

Then open in your browser: **http://localhost:3000**

- **http://localhost:3000** → “Hello from Express” page  
- **http://localhost:3000/index.html** → static file from `public/index.html`

If port 3000 is in use, set another port: `$env:PORT=8080; npm start`
