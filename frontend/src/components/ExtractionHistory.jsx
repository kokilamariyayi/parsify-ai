import { useEffect, useState } from "react";
import {
  Clock,
  FileText,
  FileAudio,
  File,
  Trash2,
  Eye,
} from "lucide-react";
import { cn, DOC_TYPE_COLORS } from "../lib/utils";
import {
  loadHistory,
  deleteHistoryEntry,
  clearAllHistory,
  formatTimeAgo,
} from "../lib/history";

function SourceIcon({ source, filename }) {
  if (source === "audio") {
    return <FileAudio className="h-5 w-5 text-indigo-400 shrink-0" />;
  }
  if (source === "text") {
    return <FileText className="h-5 w-5 text-indigo-400 shrink-0" />;
  }
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return <File className="h-5 w-5 text-red-400 shrink-0" />;
  }
  return <FileText className="h-5 w-5 text-indigo-400 shrink-0" />;
}

function formatDocType(type) {
  if (!type) return "General";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function ExtractionHistory({ onViewResult, refreshKey }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, [refreshKey]);

  if (history.length === 0) return null;

  const handleDelete = (id) => {
    setHistory(deleteHistoryEntry(id));
  };

  const handleClearAll = () => {
    setHistory(clearAllHistory());
  };

  const handleView = (entry) => {
    onViewResult(entry.result);
  };

  return (
    <section className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-100">Recent Extractions</h2>
        </div>
        <button
          onClick={handleClearAll}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {history.map((entry) => {
          const badgeClass =
            DOC_TYPE_COLORS[entry.document_type] || DOC_TYPE_COLORS.general;

          return (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-indigo-500 animate-fadeIn"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <SourceIcon source={entry.source} filename={entry.filename} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {entry.filename}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border",
                        badgeClass
                      )}
                    >
                      {formatDocType(entry.document_type)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {entry.confidence}% confidence
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleView(entry)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-400 text-xs font-medium hover:bg-indigo-500/10 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Results
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
