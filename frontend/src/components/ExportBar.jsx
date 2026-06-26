import { Download, Copy, Check, FileJson } from "lucide-react";
import { useState } from "react";
import { downloadBlob, flattenForCsv } from "../lib/utils";

export default function ExportBar({ result }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const exportData = {
    document_type: result.document_type,
    confidence: result.confidence,
    fields: result.fields,
    field_confidences: result.field_confidences,
    processing_time_ms: result.processing_time_ms,
  };

  const downloadJson = () => {
    downloadBlob(
      JSON.stringify(exportData, null, 2),
      `parsify-ai-${result.document_type}-export.json`,
      "application/json"
    );
  };

  const downloadCsv = () => {
    const rows = flattenForCsv(result.fields);
    const header = "field,value\n";
    const body = rows
      .map((r) => `"${r.field.replace(/"/g, '""')}","${r.value.replace(/"/g, '""')}"`)
      .join("\n");
    downloadBlob(
      header + body,
      `parsify-ai-${result.document_type}-export.csv`,
      "text/csv"
    );
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 border-t border-gray-800 bg-gray-900/80">
      <button
        onClick={downloadJson}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
      >
        <FileJson className="h-4 w-4" />
        Download JSON
      </button>
      <button
        onClick={downloadCsv}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
      >
        <Download className="h-4 w-4" />
        Download CSV
      </button>
      <button
        onClick={copyAll}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-sm transition-colors"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : "Copy All"}
      </button>
    </div>
  );
}
