const HISTORY_KEY = "parsify_history";
const MAX_ENTRIES = 10;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExtractionToHistory({ filename, document_type, confidence, source, result }) {
  const entry = {
    id: Date.now(),
    filename,
    document_type,
    confidence: Math.round(confidence ?? (result.confidence || 0) * 100),
    timestamp: new Date().toISOString(),
    source,
    result,
  };

  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
}

export function deleteHistoryEntry(id) {
  const history = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
  return [];
}

export function formatTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export { HISTORY_KEY, MAX_ENTRIES };
