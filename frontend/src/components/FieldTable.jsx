import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn, LOW_CONFIDENCE_THRESHOLD } from "../lib/utils";

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text =
      typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-all"
      title="Copy value"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return value;
  return String(value);
}

function ArrayTable({ items, fieldKey, fieldConfidences }) {
  if (!items || items.length === 0) {
    return <span className="text-gray-600 italic text-sm">Not Found</span>;
  }

  if (typeof items[0] !== "object") {
    return (
      <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800/50">
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {items.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/30">
              {columns.map((col) => {
                const cellKey = `${fieldKey}[${i}].${col}`;
                const conf = fieldConfidences?.[cellKey];
                const lowConf = conf !== undefined && conf < LOW_CONFIDENCE_THRESHOLD;
                const val = row[col];
                return (
                  <td
                    key={col}
                    className={cn(
                      "px-3 py-2 text-gray-300",
                      lowConf && "bg-yellow-500/10 text-yellow-200"
                    )}
                    title={lowConf ? `Low confidence: ${(conf * 100).toFixed(0)}%` : undefined}
                  >
                    {val ?? <span className="text-gray-600 italic">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldRow({ fieldKey, value, fieldConfidences, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const conf = fieldConfidences?.[fieldKey];
  const lowConf = conf !== undefined && conf < LOW_CONFIDENCE_THRESHOLD;
  const formatted = formatValue(value);
  const isArray = Array.isArray(value);
  const isObject = formatted !== null && typeof formatted === "object" && !isArray;

  if (isArray) {
    return (
      <div className={cn("border-b border-gray-800/50 last:border-0", depth > 0 && "ml-4")}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-800/30 transition-colors group"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-300 capitalize">
            {fieldKey.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-gray-600 ml-auto">{value.length} items</span>
          {lowConf && (
            <span className="text-xs text-yellow-500 ml-2">low confidence</span>
          )}
        </button>
        {open && (
          <div className="px-4 pb-3">
            <ArrayTable
              items={value}
              fieldKey={fieldKey}
              fieldConfidences={fieldConfidences}
            />
          </div>
        )}
      </div>
    );
  }

  if (isObject) {
    return (
      <div className={cn("border-b border-gray-800/50 last:border-0", depth > 0 && "ml-4")}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-300 capitalize">
            {fieldKey.replace(/_/g, " ")}
          </span>
        </button>
        {open && (
          <div className="border-l border-gray-800 ml-6 mb-2">
            {Object.entries(value).map(([k, v]) => (
              <FieldRow
                key={k}
                fieldKey={`${fieldKey}.${k}`}
                value={v}
                fieldConfidences={fieldConfidences}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors group",
        lowConf && "bg-yellow-500/5"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5 capitalize">
          {fieldKey.replace(/_/g, " ")}
          {lowConf && (
            <span className="ml-2 text-yellow-500 normal-case">
              ({(conf * 100).toFixed(0)}% confidence)
            </span>
          )}
        </p>
        {formatted === null ? (
          <p className="text-sm text-gray-600 italic">Not Found</p>
        ) : (
          <p className="text-sm text-gray-200 break-words">{formatted}</p>
        )}
      </div>
      {formatted !== null && <CopyButton value={value} />}
    </div>
  );
}

export default function FieldTable({ fields, fieldConfidences }) {
  if (!fields || Object.keys(fields).length === 0) {
    return (
      <p className="text-gray-500 text-sm p-4">No fields extracted.</p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-hidden">
      {Object.entries(fields).map(([key, value]) => (
        <FieldRow
          key={key}
          fieldKey={key}
          value={value}
          fieldConfidences={fieldConfidences}
        />
      ))}
    </div>
  );
}
