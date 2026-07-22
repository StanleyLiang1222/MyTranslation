import { VocabularyItem } from "../types";

export interface GoogleSheetsSyncResult {
  success: boolean;
  message: string;
  count?: number;
}

/**
 * Appends a batch of vocabulary items directly to a specified Google Spreadsheet.
 * Uses the official Google Sheets API v4 endpoints.
 * 
 * @param accessToken Real auth token obtained either from standard client-side flows or from workspace integrations
 * @param spreadsheetId Full spreadsheet ID extracted from spreadsheet sharing URLs
 * @param items List of Vocabulary items to sync
 * @param sheetName Target tab name, default is "Sheet1"
 */
export async function appendVocabularyToSheet(
  accessToken: string,
  spreadsheetId: string,
  items: VocabularyItem[],
  sheetName: string = "Sheet1"
): Promise<GoogleSheetsSyncResult> {
  const cleanId = spreadsheetId.trim();
  if (!cleanId) {
    return { success: false, message: "Google 試算表 ID 為空，請檢查輸入的值。" };
  }

  try {
    const range = `${sheetName}!A1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}:append?valueInputOption=USER_ENTERED`;

    // Map vocabulary fields to column rows
    const rows = items.map((item) => [
      item.word,
      item.phonetic,
      item.partOfSpeech,
      item.translation,
      item.definitionZh,
      item.category,
      item.starred ? "★" : "",
      item.createdDate,
      item.examples
        .map((ex, i) => `【例句 ${i + 1} - ${ex.scenario}】 ${ex.english} (${ex.chinese})`)
        .join("\n"),
      item.scenarios.join(", ")
    ]);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rows,
        majorDimension: "ROWS",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiErrorMessage = errorData.error?.message || `HTTP 錯誤代碼: ${response.status}`;
      return {
        success: false,
        message: `Google Sheets API 同步失敗：${apiErrorMessage}`,
      };
    }

    const data = await response.json();
    const updatedRows = data.updates?.updatedRows || items.length;

    return {
      success: true,
      message: `恭喜！已成功將 ${updatedRows} 筆單字同步寫入 Google 試算表。`,
      count: updatedRows,
    };
  } catch (error: any) {
    console.error("Sheets REST request failed:", error);
    return {
      success: false,
      message: error.message || "發生未知網路錯誤。請確認您的網路連線與 Excel 共享權限。",
    };
  }
}

/**
 * Parses spreadsheet ID from a generic Google Spreadsheet sharing link.
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId) return "";
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}
