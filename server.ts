import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();

  // إذا في production (على Render)
  if (process.env.NODE_ENV === "production") {
    // نخدم ملفات dist المبنية
    app.use(express.static(path.join(__dirname)));
  } else {
    // في التطوير فقط نشغل vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
    });

    app.use(vite.middlewares);
  }

  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

startServer();