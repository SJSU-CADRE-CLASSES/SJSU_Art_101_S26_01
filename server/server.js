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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
