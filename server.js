import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= DATABASE =================

// إذا عندك Disk على Render استخدم:
/*
const db = new Database("/data/tahadi.db");
*/

// إذا ما عندك Disk:
const db = new Database("tahadi.db");

// إنشاء الجدول الأساسي (بدون الأعمدة الإضافية)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )
`);

// 🔥 إضافة الأعمدة تلقائيًا إذا كانت ناقصة
const columns = db.prepare("PRAGMA table_info(users)").all();
const columnNames = columns.map(c => c.name);

if (!columnNames.includes("totalScore")) {
  db.exec("ALTER TABLE users ADD COLUMN totalScore INTEGER DEFAULT 0");
}

if (!columnNames.includes("lastPlayed")) {
  db.exec("ALTER TABLE users ADD COLUMN lastPlayed TEXT");
}

// ================= API =================

// تسجيل مستخدم
app.post("/api/user", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
  const info = stmt.run(name);

  res.json({ id: info.lastInsertRowid, name });
});

// لوحة الصدارة
app.get("/api/leaderboard", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT name, totalScore FROM users ORDER BY totalScore DESC")
      .all();

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Leaderboard error" });
  }
});

// حالة المستخدم
app.get("/api/status/:id", (req, res) => {
  try {
    const user = db
      .prepare("SELECT totalScore, lastPlayed FROM users WHERE id = ?")
      .get(req.params.id);

    if (!user) {
      return res.json({ hasParticipated: false });
    }

    const today = new Date().toISOString().split("T")[0];
    const hasParticipated = user.lastPlayed === today;

    res.json({
      hasParticipated,
      score: user.totalScore || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Status error" });
  }
});

// تسليم النتيجة
app.post("/api/submit", (req, res) => {
  try {
    const { userId, score } = req.body;
    if (!userId) return res.status(400).json({ error: "User required" });

    const today = new Date().toISOString().split("T")[0];

    db.prepare(`
      UPDATE users
      SET totalScore = totalScore + ?,
          lastPlayed = ?
      WHERE id = ?
    `).run(Number(score), today, Number(userId));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submit error" });
  }
});

// ================= SERVE FRONTEND =================

app.use(express.static(path.resolve(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

// ================= START SERVER =================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});