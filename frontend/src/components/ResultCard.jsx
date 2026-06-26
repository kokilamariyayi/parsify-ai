import { useState } from "react";
import { Clock, FileText, LayoutList } from "lucide-react";
import { cn, DOC_TYPE_COLORS } from "../lib/utils";
import FieldTable from "./FieldTable";
import ExportBar from "./ExportBar";

export default function ResultCard({ result }) {
  const [activeTab, setActiveTab] = useState("fields");

  if (!result) return null;

  const badgeClass =
    DOC_TYPE_COLORS[result.document_type] || DOC_TYPE_COLORS.general;
  const confidencePct = Math.round((result.confidence || 0) * 100);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border",
              badgeClass
            )}
          >
            {result.document_type}
          </span>
          {result.filename && (
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {result.filename}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 ml-auto">
            <Clock className="h-3.5 w-3.5" />
            {result.processing_time_ms}ms
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Classification Confidence</span>
            <span className="text-xs font-medium text-gray-300">{confidencePct}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab("fields")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "fields"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          )}
        >
          <LayoutList className="h-4 w-4" />
          Structured Fields
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "preview"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          )}
        >
          <FileText className="h-4 w-4" />
          Raw Preview
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "fields" ? (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Fields highlighted in yellow have low extraction confidence (&lt;60%).
            </p>
            <FieldTable
              fields={result.fields}
              fieldConfidences={result.field_confidences}
            />
          </>
        ) : (
          <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono bg-gray-950 rounded-lg p-4 border border-gray-800 max-h-96 overflow-y-auto">
            {result.raw_text_preview}
          </pre>
        )}
      </div>

      <ExportBar result={result} />
    </div>
  );
}
