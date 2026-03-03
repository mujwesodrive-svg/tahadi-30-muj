import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//
// ================= DATABASE =================
//

const db = new Database("tahadi.db");

// إنشاء جدول
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    totalScore INTEGER DEFAULT 0,
    dailyScore INTEGER DEFAULT 0,
    lastPlayed TEXT
  )
`);

//
// ================= API ROUTES =================
//

// تسجيل مستخدم
app.post("/api/user", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name required" });
  }

  const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
  const info = stmt.run(name);

  res.json({ id: info.lastInsertRowid, name });
});

// حالة المستخدم
app.get("/api/status/:id", (req, res) => {
  const id = Number(req.params.id);

  const user = db
    .prepare("SELECT dailyScore, lastPlayed FROM users WHERE id = ?")
    .get(id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const today = new Date().toISOString().split("T")[0];

  res.json({
    hasParticipated: user.lastPlayed === today,
    score: user.dailyScore || 0
  });
});

// إرسال نتيجة
app.post("/api/submit", (req, res) => {
  try {
    const { userId, score } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const today = new Date().toISOString().split("T")[0];

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(Number(userId));

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
    `).run(Number(score), Number(score), today, Number(userId));

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submit error" });
  }
});

// لوحة الصدارة (تراكمي)
app.get("/api/leaderboard", (req, res) => {
  const rows = db
    .prepare(`
      SELECT name, totalScore
      FROM users
      ORDER BY totalScore DESC
    `)
    .all();

  res.json(rows);
});

//
// ================= SERVE FRONTEND =================
//

app.use(express.static(path.resolve(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

//
// ================= START SERVER =================
//

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});