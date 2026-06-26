import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const DOC_TYPE_COLORS = {
  invoice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contract: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  resume: "bg-green-500/20 text-green-400 border-green-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function flattenForCsv(obj, prefix = "") {
  const rows = [];
  for (const [key, value] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      rows.push({ field: fullKey, value: "" });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          rows.push(...flattenForCsv(item, `${fullKey}[${i}]`));
        } else {
          rows.push({ field: `${fullKey}[${i}]`, value: String(item) });
        }
      });
    } else if (typeof value === "object") {
      rows.push(...flattenForCsv(value, fullKey));
    } else {
      rows.push({ field: fullKey, value: String(value) });
    }
  }
  return rows;
}

export function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
