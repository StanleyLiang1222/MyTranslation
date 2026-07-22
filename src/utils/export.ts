import { VocabularyItem } from "../types";

/**
 * Utility to download string data as a file in the browser.
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports vocabulary items into a high-utility CSV formatted for Google Sheets or MS Excel.
 * Includes UTF-8 BOM to correctly parse Traditional Chinese characters.
 */
export function exportToCSV(items: VocabularyItem[]): void {
  const headers = ["單字 (Word)", "音標 (Phonetic)", "詞性 (POS)", "繁體中文翻譯 (Translation)", "中文詳細釋義 (Definition)", "分類群組 (Category)", "重要星號 (Starred)", "創立日期 (Created Date)", "例句與學習情境 (Examples & Scenarios)"];

  const formatCell = (val: string | boolean | number) => {
    const str = String(val === undefined || val === null ? "" : val);
    const clean = str.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = items.map((item) => {
    const examplesString = item.examples
      .map((ex, i) => `【例句 ${i + 1} - ${ex.scenario}】\n英文：${ex.english}\n中文：${ex.chinese}`)
      .join("\n\n");
    const scenariosString = `【推薦使用場景】\n${item.scenarios.join(", ")}`;
    const detailLog = `${examplesString}\n\n${scenariosString}`;

    return [
      formatCell(item.word),
      formatCell(item.phonetic),
      formatCell(item.partOfSpeech),
      formatCell(item.translation),
      formatCell(item.definitionZh),
      formatCell(item.category),
      formatCell(item.starred ? "★ 是" : "否"),
      formatCell(item.createdDate),
      formatCell(detailLog),
    ];
  });

  // Prepend UTF-8 BOM (\uFEFF) to guarantee correct encoding under dual Google Sheets and Excel setups
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(
    csvContent,
    `vocab_sheets_export_${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;"
  );
}

/**
 * Exports vocabulary into a Tab-Separated Anki-compatible import file.
 * Card Front: spelling {IPA} (part of speech)
 * Card Back: translation, dynamic traditional explanation, and structured contextual example blocks with scenario labels.
 */
export function exportToAnki(items: VocabularyItem[]): void {
  const rows = items.map((item) => {
    // Front Column Card Layout
    const front = `${item.word} <span style="color:#818cf8;font-size:0.9em;margin-left:6px;">${item.phonetic}</span> <span style="color:#94a3b8;font-style:italic;font-size:0.85em;">(${item.partOfSpeech})</span>`;

    // Back Column Card Layout with dynamic HTML formatting
    let examplesHtml = `<div style="margin-top:10px;text-align:left;border-top:1px solid #e2e8f0;padding-top:8px;">`;
    item.examples.forEach((ex, idx) => {
      examplesHtml += `
        <div style="margin-bottom:8px;">
          <span style="background-color:#eff6ff;color:#1e40af;font-size:0.75em;padding:2px 6px;border-radius:4px;font-weight:600;">${ex.scenario}</span>
          <p style="margin:4px 0 2px 0;font-family:monospace;color:#1e293b;font-weight:500;">${ex.english}</p>
          <p style="margin:0 0 4px 0;color:#2563eb;font-size:0.9em;">${ex.chinese}</p>
        </div>
      `;
    });
    examplesHtml += `</div>`;

    const back = `
      <div style="text-align:center;font-family:sans-serif;">
        <h2 style="color:#0f172a;margin-bottom:2px;font-size:1.4em;">${item.translation}</h2>
        <p style="color:#475569;font-size:0.95em;margin-top:0;margin-bottom:10px;">${item.definitionZh}</p>
        <span style="background-color:#f1f5f9;color:#475569;font-size:0.8em;padding:3px 8px;border-radius:9999px;">${item.category}</span>
        ${examplesHtml}
        <div style="margin-top:8px;font-size:0.8em;color:#64748b;">【未來最佳使用場景】<br/>${item.scenarios.join(" / ")}</div>
      </div>
    `.trim();

    // Escape raw tab and newline characters to satisfy standard Anki TSV constraints
    const cleanFront = front.replace(/\t/g, " ").replace(/\r?\n/g, " ");
    const cleanBack = back.replace(/\t/g, " ").replace(/\r?\n/g, " ");

    return `${cleanFront}\t${cleanBack}`;
  });

  const ankiContent = rows.join("\n");
  downloadFile(
    ankiContent,
    `vocab_anki_import_${new Date().toISOString().slice(0, 10)}.txt`,
    "text/plain;charset=utf-8;"
  );
}

/**
 * Creates a JSON file containing all data backup structures for migration and recovery.
 */
export function exportToJSON(items: VocabularyItem[]): void {
  const content = JSON.stringify(items, null, 2);
  downloadFile(
    content,
    `vocab_backup_restore_${new Date().toISOString().slice(0, 10)}.json`,
    "application/json;charset=utf-8;"
  );
}
