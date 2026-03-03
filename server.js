import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const app = express();
app.use(express.json());

// ================= DATABASE =================
const db = new Database("tahadi.db");

// 🔥 إعادة إنشاء الجدول لتفادي مشاكل الأعمدة
db.exec(`
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  totalScore INTEGER DEFAULT 0,
  dailyScore INTEGER DEFAULT 0,
  lastPlayed TEXT
)
`);

// ================= REGISTER USER =================
app.post("/api/user", (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
    const info = stmt.run(name);

    res.json({ id: info.lastInsertRowid, name });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "User creation error" });
  }
});

// ================= SUBMIT SCORE =================
app.post("/api/submit", (req, res) => {
  try {
    const { userId, score } = req.body;

    if (!userId || score == null) {
      return res.status(400).json({ error: "Missing data" });
    }

    const today = new Date().toISOString().split("T")[0];

    const user = db
      .prepare("SELECT lastPlayed FROM users WHERE id = ?")
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // منع اللعب مرتين بنفس اليوم
    if (user.lastPlayed === today) {
      return res.json({ message: "Already played today" });
    }

    db.prepare(`
      UPDATE users
      SET 
        totalScore = totalScore + ?,
        dailyScore = ?,
        lastPlayed = ?
      WHERE id = ?
    `).run(score, score, today, userId);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submit error" });
  }
});

// ================= LEADERBOARD =================
app.get("/api/leaderboard", (req, res) => {
  try {
    const users = db
      .prepare(`
        SELECT id, name, totalScore
        FROM users
        ORDER BY totalScore DESC
      `)
      .all();

    res.json(users);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Leaderboard error" });
  }
});

// ================= SERVE FRONTEND =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ================= START SERVER =================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🔥 Server running on port " + PORT);
});