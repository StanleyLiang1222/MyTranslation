import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  BookOpen,
  Volume2,
  Bookmark,
  Plus,
  Trash2,
  Calendar,
  CloudLightning,
  Sparkles,
  FileText,
  Clock,
  ChevronRight,
  Upload,
  RefreshCw,
  Award,
  BookMarked,
  Layers,
  Star,
  Download,
  FolderPlus,
  X,
  Check
} from "lucide-react";
import { VocabularyItem, Category } from "./types";
import VocabularyCard from "./components/VocabularyCard";
import SyncPanel from "./components/SyncPanel";
import { speakWord } from "./utils/speech";

const INITIAL_CATEGORIES: Category[] = [
  { id: "cat-default", name: "預設", color: "bg-slate-100 text-slate-700" },
  { id: "cat-business", name: "商務英文", color: "bg-blue-50 text-blue-700 border border-blue-100" },
  { id: "cat-travel", name: "旅遊常用", color: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  { id: "cat-exam", name: "學術檢定", color: "bg-amber-50 text-amber-700 border border-amber-100" },
  { id: "cat-daily", name: "生活日常", color: "bg-purple-50 text-purple-700 border border-purple-100" },
];

const RECOMMEND_WORDS = [
  "resilient",
  "meticulous",
  "persistence",
  "aesthetic",
  "eloquent",
  "ubiquitous",
];

export default function App() {
  // --- States ---
  const [items, setItems] = useState<VocabularyItem[]>(() => {
    const saved = localStorage.getItem("vocab_items_db");
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("vocab_categories");
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [activeTab, setActiveTab] = useState<"dictionary" | "sync">("dictionary");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [newCatName, setNewCatName] = useState("");

  // Filters
  const [selectedCategoryName, setSelectedCategoryName] = useState("全部");
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);

  // Quick state to hold the most recently searched word
  const [latestTranslation, setLatestTranslation] = useState<VocabularyItem | null>(null);

  // UI Toast Notification System
  const [notification, setNotification] = useState<{ type: "success" | "info" | "error" | null; text: string }>({
    type: null,
    text: ""
  });

  const showToast = (text: string, type: "success" | "info" | "error" = "info") => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((prev) => prev.text === text ? { type: null, text: "" } : prev);
    }, 4500);
  };

  // State to track which category is in the confirmation phase of deletion
  const [catConfirmDeleteName, setCatConfirmDeleteName] = useState<string | null>(null);

  // --- HTML Input Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistent Storage Sync ---
  useEffect(() => {
    localStorage.setItem("vocab_items_db", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("vocab_categories", JSON.stringify(categories));
  }, [categories]);

  // --- Translation Trigger API ---
  const handleTranslateWord = async (wordToQuery: string) => {
    if (!wordToQuery || wordToQuery.trim() === "") return;
    const cleanWord = wordToQuery.trim();

    // PERFORMANCE OPTIMIZATION (Anti-Quota Exhaustion cache lookup):
    // If the word already exists in the local database, directly lift and spotlight it
    // instead of calling the external API, completely eliminating unnecessary token waste.
    const existingIndex = items.findIndex((item) => item.word.toLowerCase() === cleanWord.toLowerCase());
    if (existingIndex !== -1) {
      const existingItem = items[existingIndex];
      speakWord(existingItem.word);
      
      const todayDate = new Date().toISOString().slice(0, 10);
      const updatedItem = {
        ...existingItem,
        createdDate: todayDate,
        createdAt: Date.now(),
      };

      setItems((prev) => [
        updatedItem,
        ...prev.filter((_, idx) => idx !== existingIndex)
      ]);

      setLatestTranslation(updatedItem);
      setSearchQuery("");
      setErrorText("");
      return;
    }

    setIsSearching(true);
    setErrorText("");

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: cleanWord }),
      });

      if (!response.ok) {
        throw new Error(`伺服器回應錯誤碼: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Convert response data to our standardized Schema structure
      const todayDate = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const newVocabId = `vocab-${Date.now()}`;

      const newVocabItem: VocabularyItem = {
        id: newVocabId,
        word: data.word || cleanWord,
        phonetic: data.phonetic || "/.../",
        partOfSpeech: data.partOfSpeech || "n.",
        translation: data.translation || "翻譯暫缺",
        definitionZh: data.definitionZh || "暫時無詳細解釋",
        examples: data.examples || [],
        scenarios: data.scenarios || [],
        category: selectedCategoryName !== "全部" ? selectedCategoryName : "預設",
        createdDate: todayDate,
        createdAt: Date.now(),
        starred: false,
        notes: "",
        synced: false,
      };

      // Play native audio pronunciation of the word instantly to maximize cognitive recall
      speakWord(newVocabItem.word);

      // Add to vocabulary list - if exact word exists on today or history, we replace/update it to avoid duplicate redundancy
      setItems((prev) => {
        const filtered = prev.filter((item) => item.word.toLowerCase() !== cleanWord.toLowerCase());
        return [newVocabItem, ...filtered];
      });

      // Update active focuses
      setLatestTranslation(newVocabItem);
      setSearchQuery(""); // Clear translation input after search

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "翻譯失敗，請檢查網路連線或稍後再試。");
    } finally {
      setIsSearching(false);
    }
  };

  // --- Card Operations ---
  const handleDeleteWord = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (latestTranslation?.id === id) {
      setLatestTranslation(null);
    }
  };

  const handleToggleStar = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
    if (latestTranslation?.id === id) {
      setLatestTranslation((prev) => (prev ? { ...prev, starred: !prev.starred } : null));
    }
  };

  const handleUpdateCategory = (id: string, newCat: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCat } : item))
    );
    if (latestTranslation?.id === id) {
      setLatestTranslation((prev) => (prev ? { ...prev, category: newCat } : null));
    }
  };

  const handleUpdateNotes = (id: string, newNotes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: newNotes } : item))
    );
    if (latestTranslation?.id === id) {
      setLatestTranslation((prev) => (prev ? { ...prev, notes: newNotes } : null));
    }
  };

  const handleMarkSynced = (ids: string[]) => {
    setItems((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, synced: true } : item))
    );
  };

  // --- Custom Categories Management ---
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;

    if (categories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      showToast("此收藏分類已存在喔！", "error");
      return;
    }

    const colors = [
      "bg-amber-50 text-amber-700 border border-amber-100",
      "bg-emerald-50 text-emerald-700 border border-emerald-100",
      "bg-sky-50 text-sky-700 border border-sky-100",
      "bg-rose-50 text-rose-700 border border-rose-100",
      "bg-violet-50 text-violet-700 border border-violet-100",
      "bg-pink-50 text-pink-700 border border-pink-100",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      color: randomColor,
    };

    setCategories((prev) => [...prev, newCat]);
    setNewCatName("");
    showToast(`收藏分類「${cleanName}」新增成功！`, "success");
  };

  const handleDeleteCategory = (catName: string) => {
    if (catName === "預設") {
      showToast("預設分類不能刪除。", "error");
      return;
    }
    
    setCategories((prev) => prev.filter((c) => c.name !== catName));
    // Migrate orphaned items to default
    setItems((prev) =>
      prev.map((item) => (item.category === catName ? { ...item, category: "預設" } : item))
    );
    if (selectedCategoryName === catName) {
      setSelectedCategoryName("全部");
    }
    setCatConfirmDeleteName(null);
    showToast(`分類「${catName}」已安全刪除！原處於此分類的單字已重新歸檔至「預設」分類。`, "info");
  };

  // --- JSON Backup Import Trigger ---
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && (parsed.length === 0 || "word" in parsed[0])) {
          // Merge imported backing records
          setItems((prev) => {
            const combinedMap = new Map<string, VocabularyItem>();
            prev.forEach((item) => combinedMap.set(item.word.toLowerCase(), item));
            parsed.forEach((item) => combinedMap.set(item.word.toLowerCase(), item));
            return Array.from(combinedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
          });
          showToast(`匯入備份成功！已合併載入 ${parsed.length} 筆單字卡。`, "success");
        } else {
          showToast("匯入失敗：偵測到此 JSON 檔案內容的資料欄位不相容。", "error");
        }
      } catch (err) {
        showToast("匯入失敗：這不是正確的 JSON 格式檔案。", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Clear file
  };

  // --- Vocabulary Sorting and Filter Pipelines ---
  const filteredItems = items.filter((item) => {
    // 1. Text filter
    const queryMatch =
      item.word.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      item.translation.includes(vaultSearchQuery) ||
      item.definitionZh.includes(vaultSearchQuery);

    // 2. Star filter
    const starMatch = !starredOnly || item.starred;

    // 3. Category tag filter
    const categoryMatch = selectedCategoryName === "全部" || item.category === selectedCategoryName;

    return queryMatch && starMatch && categoryMatch;
  });

  // Group filtered results by Search/Creation Date (YYYY-MM-DD)
  const groupedItemsByDate: { [date: string]: VocabularyItem[] } = {};
  filteredItems.forEach((item) => {
    const d = item.createdDate;
    if (!groupedItemsByDate[d]) {
      groupedItemsByDate[d] = [];
    }
    groupedItemsByDate[d].push(item);
  });

  // Sort dates decreasing
  const sortedDates = Object.keys(groupedItemsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-12 w-full font-sans antialiased" id="vocabulary-app">
      {/* Floating Animated Toast Banner */}
      <AnimatePresence>
        {notification.text && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-xs font-sans font-semibold max-w-sm sm:max-w-md w-[90%] md:w-auto"
            style={{
              backgroundColor:
                notification.type === "success"
                  ? "#f0fdf4"
                  : notification.type === "error"
                  ? "#fef2f2"
                  : "#f0f9ff",
              borderColor:
                notification.type === "success"
                  ? "#bbf7d0"
                  : notification.type === "error"
                  ? "#fecaca"
                  : "#bae6fd",
              color:
                notification.type === "success"
                  ? "#166534"
                  : notification.type === "error"
                  ? "#991b1b"
                  : "#075985",
            }}
          >
            <span className="text-sm select-none">
              {notification.type === "success" ? "✅" : notification.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span className="flex-1 select-text">{notification.text}</span>
            <button
              onClick={() => setNotification({ type: null, text: "" })}
              className="p-1 rounded-lg hover:bg-black/5 opacity-60 hover:opacity-100 transition-all cursor-pointer focus:outline-none"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upper Navigation Header */}
      <header className="bg-white border-b border-slate-250 sticky top-0 z-50 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-550 to-indigo-700 text-white p-2.5 rounded-2xl shadow-sm">
              <BookMarked size={22} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-sans">
                英文單字翻譯儲存庫
              </h1>
              <p className="text-[10px] text-slate-400 font-mono font-bold tracking-wider">
                EN-ZH VOCABULARY VAULT v1.2
              </p>
            </div>
          </div>

          {/* Tab Selection buttons */}
          <div className="flex bg-slate-100/80 border border-slate-200/50 rounded-xl p-1" id="nav-tabs">
            <button
              onClick={() => setActiveTab("dictionary")}
              className={`text-xs font-bold px-4.5 py-2.2 rounded-lg transition-all cursor-pointer font-sans flex items-center gap-1.5 focus:outline-none ${
                activeTab === "dictionary"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BookOpen size={14} /> 英中字典 & 單字庫
            </button>
            <button
              onClick={() => setActiveTab("sync")}
              className={`text-xs font-bold px-4.5 py-2.2 rounded-lg transition-all cursor-pointer font-sans flex items-center gap-1.5 focus:outline-none ${
                activeTab === "sync"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              id="sync-tab-trigger"
            >
              <CloudLightning size={14} /> 試算表同步 & 匯出
            </button>
          </div>
        </div>
      </header>

      {/* Primary Container Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Explorer Sidebar (Always loaded to manage filter categories & options) */}
        <aside className="lg:col-span-3 space-y-5">
          {/* Box 1: Stats summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-450 tracking-wider uppercase mb-3.5 font-sans text-left">
              字庫學習狀態
            </h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-sans">
                  已學單字量
                </span>
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {items.length}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-sans">
                  重要收藏
                </span>
                <span className="text-2xl font-extrabold text-amber-500 font-mono">
                  {items.filter((i) => i.starred).length}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Categories / Collections directories */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-450 tracking-wider uppercase font-sans text-left">
                分類收藏夾
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 font-sans font-bold">
                {categories.length}
              </span>
            </div>

            {/* Folder selection index list */}
            <div className="space-y-1 mb-4" id="category-filter-list">
              <button
                onClick={() => setSelectedCategoryName("全部")}
                className={`w-full text-left text-xs font-bold px-3 py-2.5 rounded-xl transition-all flex justify-between items-center font-sans focus:outline-none cursor-pointer ${
                  selectedCategoryName === "全部"
                    ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers size={14} /> 全部字彙
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-sans ${selectedCategoryName === "全部" ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500 font-mono"}`}>
                  {items.length}
                </span>
              </button>

              {categories.map((cat, idx) => {
                const count = items.filter((item) => item.category === cat.name).length;
                const isSelected = selectedCategoryName === cat.name;

                return (
                  <div
                    key={idx}
                    className={`w-full flex justify-between items-center rounded-xl group/cat ${
                      isSelected ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategoryName(cat.name)}
                      className={`flex-grow text-left text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 font-sans justify-between focus:outline-none cursor-pointer ${
                        isSelected ? "text-white font-extrabold" : "text-slate-600"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate max-w-[130px]">
                        <Bookmark size={14} className={isSelected ? "text-indigo-200" : "text-slate-400"} />
                        {cat.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold ${isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500 font-mono"}`}>
                        {count}
                      </span>
                    </button>
                    {cat.name !== "預設" && (
                      <div className="flex items-center">
                        {catConfirmDeleteName === cat.name ? (
                          <div className="flex gap-1.5 items-center pr-2 animate-in fade-in duration-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat.name);
                              }}
                              className="p-1 rounded text-emerald-500 hover:bg-emerald-50 cursor-pointer"
                              title="確定刪除"
                            >
                              <Check size={12} className={isSelected ? "text-emerald-100 hover:text-white" : "text-emerald-600 hover:text-emerald-700"} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCatConfirmDeleteName(null);
                              }}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 cursor-pointer"
                              title="取消"
                            >
                              <X size={12} className={isSelected ? "text-indigo-200 hover:text-white" : "text-slate-400 hover:text-slate-600"} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCatConfirmDeleteName(cat.name);
                            }}
                            className={`p-2 rounded-r-xl transition-opacity opacity-0 group-hover/cat:opacity-100 focus:outline-none focus:opacity-100 cursor-pointer ${
                              isSelected ? "text-indigo-200 hover:text-white" : "text-slate-300 hover:text-rose-500"
                            }`}
                            title="刪除客製分類"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Category Input bar */}
            <form onSubmit={handleCreateCategory} className="border-t border-slate-100 pt-3 mt-3">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="＋新收藏分類名稱"
                  className="w-full text-[11px] font-sans px-2.5 py-1.8 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  maxLength={12}
                />
                <button
                  type="submit"
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none"
                  title="建立新類別"
                  id="add-category-btn"
                >
                  <Plus size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* Box 3: General System backup operations */}
          <div className="bg-slate-100/50 border border-slate-200/40 rounded-2xl p-4 space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono select-none block">
              資料移轉與備份
            </span>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              更換電腦或清除瀏覽器記錄時，您可以下載您的單字庫 JSON 檔備份，並在此隨時還原匯入。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleTriggerImport}
                className="w-full text-[10px] font-bold font-sans flex items-center justify-center gap-1 px-3 py-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
              >
                <Upload size={13} /> 匯入單字備份
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
                className="hidden"
              />
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Active Working Stage (Dictionary translation query OR Sync/Export Panels) */}
        <section className="lg:col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "dictionary" ? (
              <motion.div
                key="tab-dict"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Search query box */}
                <div className="bg-white rounded-3xl border border-slate-100/70 shadow-sm p-6 sm:p-8">
                  <div className="text-center max-w-lg mx-auto mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                      想學習什麼英文單字？
                    </h2>
                    <p className="text-xs text-slate-500 font-sans mt-1">
                      輸入欲翻譯的英文單字，AI 將自動翻譯為繁體中文，附帶音標發音，
                      造英文實景例句，並推薦最適合在未來哪些場景中運用。
                    </p>
                  </div>

                  <div className="relative max-w-xl mx-auto mb-3" id="dictionary-search-box">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTranslateWord(searchQuery);
                      }}
                      placeholder="輸入英文單字 (例如: meticulous, resilient...)"
                      className="w-full text-sm font-sans pl-12 pr-28 py-3.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                      autoFocus
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={18} />
                    </div>
                    <button
                      onClick={() => handleTranslateWord(searchQuery)}
                      disabled={isSearching || !searchQuery.trim()}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                        isSearching || !searchQuery.trim() ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      id="translate-btn"
                    >
                      {isSearching ? <RefreshCw size={14} className="animate-spin" /> : "英中查詢"}
                    </button>
                  </div>

                  {/* Recommendations */}
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs max-w-xl mx-auto">
                    <span className="text-slate-400 font-sans">熱門推薦單字：</span>
                    {RECOMMEND_WORDS.map((recWord, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleTranslateWord(recWord)}
                        className="font-mono bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded px-2.5 py-1 text-[11px] transition-colors font-medium border border-transparent hover:border-indigo-100 focus:outline-none"
                      >
                        {recWord}
                      </button>
                    ))}
                  </div>

                  {/* Feedback on translating error */}
                  {errorText && (
                    <div className="mt-4 p-4 text-xs font-sans text-rose-800 bg-rose-50 border border-rose-200 rounded-xl max-w-xl mx-auto text-left">
                      ⚠️ {errorText}
                    </div>
                  )}
                </div>

                {/* Single highlighted newly searched Translation display card */}
                {latestTranslation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 rounded-3xl"
                  >
                    <div className="bg-white rounded-[22px] p-6 shadow-xs relative overflow-hidden">
                      <span className="absolute right-4 top-4 bg-indigo-150 text-indigo-700 text-[9px] font-bold uppercase rounded-full px-3 py-1 tracking-wider font-mono">
                        最新查詢焦點
                      </span>

                      <div className="mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-3xl font-black text-slate-900 tracking-tight font-sans select-all">
                            {latestTranslation.word}
                          </h3>
                          <button
                            onClick={() => speakWord(latestTranslation.word)}
                            className="p-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors focus:outline-none"
                            title="聆聽發音"
                          >
                            <Volume2 size={18} />
                          </button>
                        </div>
                      </div>

                      {latestTranslation.isOfflineFallback && (
                        <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-sans flex items-start gap-2 text-left">
                          <span className="text-sm">⚠️</span>
                          <div>
                            <p className="font-bold">自動啟用智慧型本機備援字典</p>
                            <p className="text-amber-700 font-medium mt-0.5 leading-relaxed">
                              {latestTranslation.offlineReason || "翻譯服務暫時無法連線，本機已自動提供防護備援譯文。發音功能仍完美運作，您可在下方卡片手動添加自訂學習筆記！"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200/50 w-fit">
                        <span className="font-bold text-indigo-600 font-sans">
                          [{latestTranslation.partOfSpeech}]
                        </span>
                        {latestTranslation.phonetic && (
                          <span className="border-l border-slate-300 pl-3">
                            {latestTranslation.phonetic}
                          </span>
                        )}
                        <span className="border-l border-slate-300 pl-3 text-[10px] font-sans">
                          歸類：<b>{latestTranslation.category}</b>
                        </span>
                      </div>

                      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-tr from-slate-50 to-white border border-slate-100 rounded-2xl p-4">
                          <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest font-sans mb-1.5 flex items-center gap-1">
                            <Plus size={12} /> 繁體中文翻譯
                          </h4>
                          <div className="text-xl font-bold text-slate-900 mb-1 leading-tight">
                            {latestTranslation.translation}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-sans mt-1.5">
                            {latestTranslation.definitionZh}
                          </p>
                        </div>

                        <div className="bg-gradient-to-tr from-slate-50 to-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                          <div>
                            <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest font-sans mb-1.5 flex items-center gap-1.5">
                              <Sparkles size={11} className="text-amber-500 animate-pulse" />{" "}
                              情境運用推薦
                            </h4>
                            <p className="text-xs text-slate-500 font-sans leading-relaxed mb-3">
                              建議在以下生活或商務環境中主動調用此單字，最顯道地、自然：
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {latestTranslation.scenarios.map((sc, scIdx) => (
                              <span
                                key={scIdx}
                                className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium border border-indigo-100 font-sans"
                              >
                                {sc}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Display examples */}
                      {latestTranslation.examples && latestTranslation.examples.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 font-sans">
                            實景情境例句
                          </h4>
                          <div className="space-y-4">
                            {latestTranslation.examples.map((ex, exIdx) => (
                              <div key={exIdx} className="text-xs font-sans pl-3 border-l-2 border-indigo-200">
                                <span className="font-bold text-[10px] uppercase text-indigo-500 tracking-wider bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs mb-1.5 inline-block">
                                  {ex.scenario}
                                </span>
                                <p className="text-slate-800 font-mono font-medium text-sm leading-snug select-all">
                                  {ex.english}
                                </p>
                                <p className="text-indigo-600 mt-1 font-semibold leading-relaxed">
                                  {ex.chinese}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Saved Vault / Vocabulary Archive Grid */}
                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-sans">
                        歷史查閱單字庫 ({selectedCategoryName})
                      </h3>
                      <p className="text-xs text-slate-500 font-sans mt-0.5 leading-relaxed">
                        您曾查閱過的所有英文單字已自動在此封裝。支援多欄字詞動態檢索、
                        部分標記與星號快速過濾。
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative" id="vault-search">
                        <input
                          type="text"
                          value={vaultSearchQuery}
                          onChange={(e) => setVaultSearchQuery(e.target.value)}
                          placeholder="搜尋單字、中文釋義..."
                          className="text-xs font-sans pl-8 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 md:w-56"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Search size={14} />
                        </div>
                      </div>

                      <button
                        onClick={() => setStarredOnly(!starredOnly)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold font-sans flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none ${
                          starredOnly
                            ? "bg-amber-50 text-amber-700 border-amber-200 shadow-3xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                        id="toggle-starred-filter"
                      >
                        <Star size={13} fill={starredOnly ? "currentColor" : "none"} />
                        僅星號
                      </button>
                    </div>
                  </div>

                  {/* Vault lists categorized list */}
                  {sortedDates.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-sans">
                      {items.length === 0 ? (
                        <>
                          您的單字中繼庫目前空空如也！
                          <br />
                          快在最上方的英中查詢框中輸入如「<b>persistence</b>」來發起第一次查閱。
                        </>
                      ) : (
                        "沒有符合當前篩選條件的查閱單字。試著清除過濾條件或關鍵字看看！"
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sortedDates.map((dateString, grpIdx) => {
                        const dateItems = groupedItemsByDate[dateString];
                        // Parse date for visual cues
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                        const displayTitle =
                          dateString === todayStr
                            ? `${dateString} (今天)`
                            : dateString === yesterdayStr
                            ? `${dateString} (昨天)`
                            : dateString;

                        return (
                          <div key={grpIdx} className="space-y-3.5">
                            {/* Group Date line */}
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 font-sans tracking-wide select-none">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{displayTitle}</span>
                              <span className="w-full h-[1px] bg-slate-100 flex-grow" />
                              <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px]">
                                {dateItems.length} 個單字
                              </span>
                            </div>

                            {/* Card Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {dateItems.map((item) => (
                                <VocabularyCard
                                  key={item.id}
                                  item={item}
                                  onDelete={handleDeleteWord}
                                  onToggleStar={handleToggleStar}
                                  onUpdateCategory={handleUpdateCategory}
                                  onUpdateNotes={handleUpdateNotes}
                                  allCategories={categories.map((c) => c.name)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tab-sync"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <SyncPanel items={items} onMarkSynced={handleMarkSynced} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
