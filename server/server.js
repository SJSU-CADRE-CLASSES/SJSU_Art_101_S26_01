const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Root route first: send a simple HTML page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Express Demo</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          max-width: 600px;
          margin: 2rem auto;
          padding: 1rem;
          background: #f5f5f5;
        }
        h1 { color: #333; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <h1>Hello from Express</h1>
      <p>This page is served by a Node.js server using Express.</p>
    </body>
    </html>
  `);
});

// Serve other static files from the "public" folder (e.g. /index.html, /style.css)
app.use(express.static(path.join(__dirname, 'public')));

// Listen on all interfaces (0.0.0.0) so connections work on Windows
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running. Open in your browser:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://127.0.0.1:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: set PORT=8080 && npm start`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
