import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { fetchGoogleTranslate, generateOfflineFallback } from "./lib/translate";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API translates word using Google Translate, with offline dictionary as fallback
  app.post("/api/translate", async (req, res) => {
    const { word } = req.body;
    const cleanWord = (word && typeof word === "string") ? word.trim() : "";
    if (!cleanWord) {
      return res.status(400).json({ error: "請輸入有效的英文單字" });
    }

    try {
      const googleResult = await fetchGoogleTranslate(cleanWord, "使用 Google 翻譯引擎");
      if (googleResult) {
        return res.json(googleResult);
      }
      const fallback = generateOfflineFallback(cleanWord, "Google 翻譯連線異常，啟用本機備援");
      return res.json(fallback);
    } catch (err: any) {
      console.warn("Translation failed, triggering resilient fallback mechanism. Error info:", err);
      const fallback = generateOfflineFallback(cleanWord, "系統伺服器目前發生錯誤，已啟用本機備援");
      return res.json(fallback);
    }
  });

  // Serve static assets in production or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
