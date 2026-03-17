import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve everything inside the course folder (including Assignments)
app.use(express.static(__dirname));

// Optional: direct root to your dolphins scene
app.get("/", (_req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "Assignments",
      "Project_2",
      "OliviaAndreaJohn",
      "frutigerwave.html"
    )
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${PORT}/ (Frutiger wave at root)`
  );
});

