import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchGoogleTranslate, generateOfflineFallback } from "../lib/translate";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { word } = req.body ?? {};
  const cleanWord = (word && typeof word === "string") ? word.trim() : "";
  if (!cleanWord) {
    res.status(400).json({ error: "請輸入有效的英文單字" });
    return;
  }

  try {
    const googleResult = await fetchGoogleTranslate(cleanWord, "使用 Google 翻譯引擎");
    if (googleResult) {
      res.status(200).json(googleResult);
      return;
    }
    res.status(200).json(generateOfflineFallback(cleanWord, "Google 翻譯連線異常，啟用本機備援"));
  } catch (err: any) {
    console.warn("Translation failed, triggering resilient fallback mechanism. Error info:", err);
    res.status(200).json(generateOfflineFallback(cleanWord, "系統伺服器目前發生錯誤，已啟用本機備援"));
  }
}
