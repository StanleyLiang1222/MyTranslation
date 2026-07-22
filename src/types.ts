export interface ExampleSentence {
  english: string;
  chinese: string;
  scenario: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  translation: string;
  definitionZh: string;
  examples: ExampleSentence[];
  scenarios: string[];
  category: string; // collection category name
  createdDate: string; // Format: YYYY-MM-DD
  createdAt: number; // Timestamp for sorting
  starred: boolean;
  notes?: string;
  synced?: boolean;
  isOfflineFallback?: boolean;
  offlineReason?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string; // Tailwind color classes for tag rendering
}

export interface SyncConfig {
  spreadsheetId?: string;
  sheetName?: string;
  lastSyncedAt?: number;
}
