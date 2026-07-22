import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Download,
  FileSpreadsheet,
  GraduationCap,
  CloudLightning,
  RefreshCw,
  HelpCircle,
  FileJson,
  CheckCircle,
  Info,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { VocabularyItem } from "../types";
import { exportToCSV, exportToAnki, exportToJSON } from "../utils/export";
import { appendVocabularyToSheet, extractSpreadsheetId } from "../utils/googleSheets";

interface SyncPanelProps {
  items: VocabularyItem[];
  onMarkSynced: (ids: string[]) => void;
}

export default function SyncPanel({ items, onMarkSynced }: SyncPanelProps) {
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem("vocab_sheet_url") || "");
  const [sheetName, setSheetName] = useState(() => localStorage.getItem("vocab_sheet_name") || "Sheet1");
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("vocab_auth_token") || "");
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });

  // Simulated Sheet Rows to represent what is currently written in the cloud Excel/Sheet database.
  const [syncHistory, setSyncHistory] = useState<VocabularyItem[]>(() => {
    const saved = localStorage.getItem("vocab_synced_items");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("vocab_sheet_url", sheetUrl);
  }, [sheetUrl]);

  useEffect(() => {
    localStorage.setItem("vocab_sheet_name", sheetName);
  }, [sheetName]);

  useEffect(() => {
    localStorage.setItem("vocab_auth_token", authToken);
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem("vocab_synced_items", JSON.stringify(syncHistory));
  }, [syncHistory]);

  const spreadsheetId = extractSpreadsheetId(sheetUrl);

  const handleSheetsSync = async () => {
    const unsyncedItems = items.filter(
      (item) => !syncHistory.some((synced) => synced.word.toLowerCase() === item.word.toLowerCase())
    );

    if (unsyncedItems.length === 0) {
      setSyncStatus({
        type: "success",
        text: "目前庫存的單字已全部與 Excel / Google Sheets 同步囉！",
      });
      return;
    }

    if (!spreadsheetId) {
      setSyncStatus({
        type: "error",
        text: "請輸入有效的 Google 試算表連結或 ID 才能進行同步。",
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: null, text: "" });

    try {
      if (authToken.trim()) {
        // Real REST API execution with Google authentication
        const result = await appendVocabularyToSheet(
          authToken.trim(),
          spreadsheetId,
          unsyncedItems,
          sheetName
        );

        if (result.success) {
          setSyncHistory((prev) => [...prev, ...unsyncedItems]);
          onMarkSynced(unsyncedItems.map((i) => i.id));
          setSyncStatus({
            type: "success",
            text: result.message,
          });
        } else {
          setSyncStatus({
            type: "error",
            text: result.message,
          });
        }
      } else {
        // Safe, highly interactive fallback simulator representing local Sandbox testing logic.
        // Artificially wait to simulate physical cloud delays
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setSyncHistory((prev) => [...prev, ...unsyncedItems]);
        onMarkSynced(unsyncedItems.map((i) => i.id));
        setSyncStatus({
          type: "success",
          text: `[模擬同步成功] 成功將 ${unsyncedItems.length} 筆最新單字載入試算表！(您可於下方檢視模擬單字試算表，或填入 Access Token 來觸發真實 API 同步)`,
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: "error",
        text: err.message || "連線至 Google Sheet 失敗。額外的 API 取存限制。",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleClearSyncHistory = () => {
    setSyncHistory([]);
    setSyncStatus({ type: "success", text: "已重設同步狀態！所有的單字已可在本機重新嘗試寫入雲端。" });
    setIsConfirmingClear(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl">
            <CloudLightning size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sans">
              Google 試算表 (Excel) 雲端資料庫同步
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5 leading-relaxed">
              直接將您的單字庫備份寫入 Google Sheets!
              可在雲端、手機隨時瀏覽、分類或與其他學習程式無縫銜接。
            </p>
          </div>
        </div>

        {/* Form elements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5" id="form-sheet-url">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
              Google 試算表連結或 ID
              <span className="text-rose-500 font-sans">*</span>
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="貼上 https://docs.google.com/spreadsheets/d/... 指令帳本連結"
              className="w-full text-xs font-sans px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
            />
          </div>

          <div className="space-y-1.5" id="form-sheet-tab">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
              工作表名稱 (Tab Name)
            </label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="例如 Sheet1, 單字庫..."
              className="w-full text-xs font-sans px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Collapsible advanced token connector */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-4 mb-5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 font-sans">
            <Info size={14} className="text-slate-400" />
            <span>進階連線設定</span>
          </div>
          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
            若需使用真實 Google Sheets REST API 寫入您的雲端帳本，請在此填入您的
            <b> Google OAuth Access Token </b>。若保留為空，系統會自動在下方開啟<b>「精美虛擬試算表瀏覽器」</b>，方便您快速預覽成果與模擬功能，或一鍵匯出 Excel 相容的 CSV 檔案。
          </p>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="填入在 Google OAuth 取得之 Bearer Access Token (選填)"
            className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        {/* Sync trigger button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 font-sans">
            本機累計單字：<b>{items.length}</b> | 已寫入試算表：
            <b>{syncHistory.length}</b>
          </div>
          <div className="flex gap-2 items-center">
            {syncHistory.length > 0 && (
              <>
                {isConfirmingClear ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                    <span className="text-[10px] text-amber-600 font-sans font-medium">確定要重設嗎？</span>
                    <button
                      onClick={handleClearSyncHistory}
                      className="text-xs font-bold font-sans text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors focus:outline-none"
                    >
                      是
                    </button>
                    <button
                      onClick={() => setIsConfirmingClear(false)}
                      className="text-xs font-semibold font-sans text-slate-400 hover:text-slate-600 px-2 py-1 bg-transparent focus:outline-none"
                    >
                      否
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingClear(true)}
                    className="text-xs font-semibold font-sans text-slate-500 hover:text-slate-700 hover:underline px-3 py-2 bg-transparent focus:outline-none"
                  >
                    重設同步
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleSheetsSync}
              disabled={isSyncing}
              className={`text-xs font-semibold font-sans flex items-center gap-2 px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                isSyncing ? "opacity-75 cursor-not-allowed" : ""
              }`}
              id="sync-sheets-btn"
            >
              {isSyncing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> 正在同步至試算表中...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> 立即同步至 Google 試算表
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Status Feedback card */}
        {syncStatus.text && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-xl flex items-start gap-2.5 text-xs font-sans ${
              syncStatus.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {syncStatus.type === "success" ? (
              <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Info size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
            )}
            <div>{syncStatus.text}</div>
          </motion.div>
        )}
      </div>

      {/* Virtual Interactive Excel/Google sheets Preview */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-rose-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-800 font-sans">
              Google 試算表檢視器 (模擬雲端資料庫)
            </h4>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 bg-white border border-slate-200 rounded px-2 py-0.5 font-mono">
            {sheetName}
          </span>
        </div>

        {syncHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-sans">
            目前此試算表 (Tab: <b>{sheetName}</b>) 還沒有任何已同步的單字紀錄。
            <br />
            請在上方點選「<b>立即同步至 Google 試算表</b>」，或在上方翻譯單字。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-all">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="px-4 py-2.5 font-sans">單字 (Word)</th>
                  <th className="px-4 py-2.5 font-sans">音標 (Phonetic)</th>
                  <th className="px-4 py-2.5 font-sans">詞性 (POS)</th>
                  <th className="px-4 py-2.5 font-sans">中文翻譯 (Translation)</th>
                  <th className="px-4 py-2.5 font-sans">詳細釋義 (Definition)</th>
                  <th className="px-4 py-2.5 font-sans">分類收藏 (Category)</th>
                  <th className="px-4 py-2.5 font-sans">歸檔日期 (Date)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 font-sans">
                {syncHistory.map((h, hIdx) => (
                  <tr key={hIdx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-bold font-mono text-indigo-700">{h.word}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">{h.phonetic}</td>
                    <td className="px-4 py-2.5 italic font-mono text-slate-400">{h.partOfSpeech}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{h.translation}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate text-slate-600" title={h.definitionZh}>
                      {h.definitionZh}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-medium">
                        {h.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-slate-400 font-mono">{h.createdDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export to individual learning utilities */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-left">
        <div className="flex items-start gap-3 mb-4 text-left">
          <div className="bg-slate-550/10 text-indigo-650 p-2.5 rounded-xl border border-slate-200">
            <Download size={20} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900 font-sans">
              匯出至學習軟體中 (Anki / Quizlet / Excel)
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5 leading-relaxed">
              希望隨時隨地製作單字讀卡？一鍵即可將本機所有英中翻譯轉存、
              備份，相容各大熱門高效率學習軟體或個人資料夾備份。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Export to Excel sheet compatible CSV */}
          <button
            onClick={() => {
              if (items.length === 0) {
                setSyncStatus({
                  type: "error",
                  text: "您目前的單字庫沒有任何單字，可以用上方輸入框多搜查幾次，有了單字後就能立即匯出囉！",
                });
                return;
              }
              exportToCSV(items);
            }}
            className="flex flex-col items-start p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs rounded-xl transition-all text-left focus:outline-none select-none group cursor-pointer"
            id="export-csv-btn"
          >
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg mb-3 group-hover:scale-110 transition-transform border border-emerald-100">
              <FileSpreadsheet size={16} />
            </div>
            <div className="text-xs font-bold text-slate-900 font-sans">試算表 Excel/CSV 格式</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans leading-relaxed">
              匯出含中文釋義、音標、情境例句與未來場景並排的萬用 CSV 檔，直接載入 Excel 或 Google Drive 試算表。
            </p>
          </button>

          {/* Export to Anki import flashcard text Format */}
          <button
            onClick={() => {
              if (items.length === 0) {
                setSyncStatus({
                  type: "error",
                  text: "您目前的單字庫沒有任何單字，可以用上方輸入框多搜查幾次，有了單字後就能立即匯出囉！",
                });
                return;
              }
              exportToAnki(items);
            }}
            className="flex flex-col items-start p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs rounded-xl transition-all text-left focus:outline-none select-none group cursor-pointer"
            id="export-anki-btn"
          >
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg mb-3 group-hover:scale-110 transition-transform border border-indigo-100">
              <GraduationCap size={16} />
            </div>
            <div className="text-xs font-bold text-slate-900 font-sans">Anki 學習卡片格式</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans leading-relaxed">
              匯出 Anki 支援的 Tab-Separated
              文字格式。卡片背面自動套入精美網頁排版，完美適配語境造句複習。
            </p>
          </button>

          {/* Export to restore JSON Backup */}
          <button
            onClick={() => {
              if (items.length === 0) {
                setSyncStatus({
                  type: "error",
                  text: "您目前的單字庫沒有任何單字，可以用上方輸入框多搜查幾次，有了單字後就能立即匯出囉！",
                });
                return;
              }
              exportToJSON(items);
            }}
            className="flex flex-col items-start p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs rounded-xl transition-all text-left focus:outline-none select-none group cursor-pointer"
            id="export-json-btn"
          >
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg mb-3 group-hover:scale-110 transition-transform border border-slate-200">
              <FileJson size={16} />
            </div>
            <div className="text-xs font-bold text-slate-900 font-sans">個人完整 JSON 檔案備份</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans leading-relaxed">
              下載原生的結構化備份，未來若清空瀏覽器紀錄或更換電腦，可隨時重新匯入此檔案以復原字庫！
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
