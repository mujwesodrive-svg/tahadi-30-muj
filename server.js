import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tahadi_new.db");
// إنشاء جدول إذا لم يوجد
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  totalScore INTEGER DEFAULT 0,
  lastPlayed DATE
);
`);

// تسجيل مستخدم
app.post("/api/user", (req, res) => {
  const { name } = req.body;
  const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
  const info = stmt.run(name);
  res.json({ id: info.lastInsertRowid, name });
});

// لوحة الصدارة
app.get("/api/leaderboard", (req, res) => {
  const rows = db.prepare("SELECT name, totalScore FROM users ORDER BY totalScore DESC").all();
  res.json(rows);
});

// حالة المستخدم
app.get("/api/status/:id", (req, res) => {
  const user = db.prepare("SELECT totalScore FROM users WHERE id = ?").get(req.params.id);
  res.json({
    hasParticipated: false,
    score: user?.totalScore || 0
  });
});

// إرسال النتيجة
app.post("/api/submit", (req, res) => {
  const { userId, score } = req.body;

  const today = new Date().toISOString().split("T")[0];

  db.prepare(`
    UPDATE users
    SET totalScore = totalScore + ?,
        lastPlayed = ?
    WHERE id = ?
  `).run(Number(score), today, Number(userId));

  res.json({ success: true });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});