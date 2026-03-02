import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

async function startServer() {
  const app = express();
  app.use(express.json());

  // 🔥 هذا الجزء المهم
  const vite = await createViteServer({
    server: { middlewareMode: true },
  });

  app.use(vite.middlewares);

  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();