const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Serve all static files from this directory
app.use(express.static(__dirname));

// Default route -> library.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'library.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

