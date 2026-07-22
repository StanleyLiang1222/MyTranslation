import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  Trash2,
  Star,
  Folder,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  Sparkles,
  Bookmark
} from "lucide-react";
import { VocabularyItem } from "../types";
import { speakWord } from "../utils/speech";

interface VocabularyCardProps {
  key?: string | number;
  item: VocabularyItem;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onUpdateCategory: (id: string, newCat: string) => void;
  onUpdateNotes: (id: string, newNotes: string) => void;
  allCategories: string[];
}

export default function VocabularyCard({
  item,
  onDelete,
  onToggleStar,
  onUpdateCategory,
  onUpdateNotes,
  allCategories,
}: VocabularyCardProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNoteText, setEditNoteText] = useState(item.notes || "");
  const [isHovered, setIsHovered] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakWord(item.word);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(item.id, editNoteText);
    setIsEditingNotes(false);
  };

  const handleCancelNotesEdit = () => {
    setEditNoteText(item.notes || "");
    setIsEditingNotes(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden group text-left"
      id={`card-${item.id}`}
    >
      {/* Decorative colored left border representing categorization accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-l-2xl" />

      <div>
        {/* Row 1: Word & Play Audio & Quick Actions */}
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap text-left">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
              {item.word}
            </h3>
            <button
              onClick={handlePlayAudio}
              className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-150 text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
              title="發音"
              id={`play-audio-${item.id}`}
            >
              <Volume2 size={15} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleStar(item.id)}
              className={`p-1.5 rounded-lg transition-colors focus:outline-none cursor-pointer ${
                item.starred
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-300 hover:text-slate-500"
              }`}
              id={`toggle-star-${item.id}`}
            >
              <Star size={17} fill={item.starred ? "currentColor" : "none"} />
            </button>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-lg p-1 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-sans font-bold text-rose-700 select-none">確定？</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="p-1 text-rose-650 hover:text-white hover:bg-rose-600 rounded transition-all cursor-pointer"
                  title="確認刪除"
                  id={`confirm-delete-${item.id}`}
                >
                  <Check size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded transition-all cursor-pointer"
                  title="取消"
                  id={`cancel-delete-${item.id}`}
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(true);
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors focus:outline-none cursor-pointer"
                id={`delete-${item.id}`}
                title="刪除單字"
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Phonetic Symbols & Part of Speech Badge */}
        <div className="flex items-center gap-3 mb-4 text-xs font-mono text-slate-500 select-all flex-wrap">
          <span className="font-bold text-indigo-600 font-sans tracking-wide uppercase">
            {item.partOfSpeech}
          </span>
          {item.phonetic && (
            <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-bold font-mono text-[11px]">
              {item.phonetic}
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-sans font-medium">
            {item.createdDate}
          </span>
          {item.isOfflineFallback && (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded font-sans tracking-wide">
              智慧本機備援
            </span>
          )}
        </div>

        {/* Row 3: Translation and Chinese definition */}
        <div className="mb-4 text-left">
          <div className="text-lg font-bold text-slate-900 mb-1 tracking-tight select-all">
            {item.translation}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-sans select-all">
            {item.definitionZh}
          </p>
        </div>

        {/* Future scenario usage predictions */}
        {item.scenarios && item.scenarios.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-slate-400 flex items-center gap-1 font-sans mr-1">
              <Sparkles size={11} className="text-amber-500 animate-pulse" />
              推薦場景：
            </span>
            {item.scenarios.map((sc, scIdx) => (
              <span
                key={scIdx}
                className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-medium font-sans border border-indigo-100"
              >
                {sc}
              </span>
            ))}
          </div>
        )}

        {/* Expandable Example Sentences */}
        <div className="mb-4">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold focus:outline-none tracking-wide"
            id={`toggle-examples-${item.id}`}
          >
            {showExamples ? (
              <>
                <EyeOff size={13} /> 收合情境例句
              </>
            ) : (
              <>
                <Eye size={13} /> 展開 {item.examples.length} 個實景例句
              </>
            )}
          </button>

          <AnimatePresence>
            {showExamples && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100"
              >
                <div className="space-y-3.5">
                  {item.examples.map((ex, exIdx) => (
                    <div key={exIdx} className="text-xs font-sans">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded uppercase">
                          {ex.scenario}
                        </span>
                      </div>
                      <p className="text-slate-800 font-mono select-all leading-tight">
                        {ex.english}
                      </p>
                      <p className="text-indigo-600 mt-0.5 font-medium leading-tight">
                        {ex.chinese}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-2 border-t border-slate-100 pt-4 flex flex-col gap-3">
        {/* Interactive Notes Section */}
        <div className="text-xs text-slate-500">
          {isEditingNotes ? (
            <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <textarea
                value={editNoteText}
                onChange={(e) => setEditNoteText(e.target.value)}
                placeholder="輸入單字筆記或學習補充（如相關字首字根、易混淆字...）"
                className="w-full text-xs font-sans text-slate-700 bg-white border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16"
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={handleCancelNotesEdit}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  title="取消"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="p-1 text-emerald-500 hover:text-emerald-600 rounded"
                  title="儲存筆記"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="group/note flex justify-between items-start gap-1">
              <span className="font-sans leading-relaxed italic text-slate-500 break-all select-all flex-grow">
                {item.notes ? `筆記：${item.notes}` : "點選右側加入個人筆記..."}
              </span>
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-slate-300 group-hover/note:text-slate-500 hover:text-indigo-600 p-0.5 rounded transition-colors"
                title="編輯筆記"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Collection Dropdown Category Setup */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Bookmark size={13} className="text-slate-400" />
            <span>分類收藏：</span>
          </div>
          <select
            value={item.category}
            onChange={(e) => onUpdateCategory(item.id, e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
            id={`category-select-${item.id}`}
          >
            {allCategories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
