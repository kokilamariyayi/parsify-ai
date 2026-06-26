import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  FileUp,
  AlignLeft,
  Music,
  RefreshCw,
  Loader2,
} from "lucide-react";
import UploadZone from "./components/UploadZone";
import VoiceInput from "./components/VoiceInput";
import ResultCard from "./components/ResultCard";
import ExtractionHistory from "./components/ExtractionHistory";
import { apiFetch } from "./lib/api";
import { saveExtractionToHistory } from "./lib/history";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-6 w-20 bg-gray-800 rounded-full" />
        <div className="h-6 w-32 bg-gray-800 rounded" />
      </div>
      <div className="h-2 bg-gray-800 rounded-full w-full" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800/50 rounded" />
        ))}
      </div>
    </div>
  );
}

function persistHistory(meta) {
  saveExtractionToHistory(meta);
  toast.success("Saved to history", { duration: 2000 });
}

export default function App() {
  const [mode, setMode] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [lastRequest, setLastRequest] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const resultRef = useRef(null);

  const bumpHistory = useCallback(() => {
    setHistoryRefresh((v) => v + 1);
  }, []);

  const handleViewHistoryResult = useCallback((historicalResult) => {
    setResult(historicalResult);
    setError(null);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const simulateProgress = () => {
    setProgress(10);
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 15));
    }, 400);
    return () => {
      clearInterval(interval);
      setProgress(100);
    };
  };

  const handleExtractFile = useCallback(async (file, validationError) => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);
    const stopProgress = simulateProgress();
    setLastRequest({ type: "file", file });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiFetch("/extract", {
        method: "POST",
        body: formData,
      }, 1);

      setResult(data);
      persistHistory({
        filename: data.filename || file.name,
        document_type: data.document_type,
        confidence: (data.confidence || 0) * 100,
        source: "file",
        result: data,
      });
      bumpHistory();
      toast.success(`Extracted ${Object.keys(data.fields || {}).length} fields`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      stopProgress();
      setLoading(false);
    }
  }, [bumpHistory]);

  const handleExtractText = async (textOverride, sourceMeta) => {
    const text = (textOverride ?? textInput).trim();
    if (!text) {
      toast.error("Please paste some document text.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    const stopProgress = simulateProgress();
    setLastRequest({ type: "text", text });

    try {
      const data = await apiFetch("/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }, 1);

      setResult(data);
      persistHistory({
        filename: sourceMeta?.filename || "Pasted Text",
        document_type: data.document_type,
        confidence: (data.confidence || 0) * 100,
        source: sourceMeta?.source || "text",
        result: data,
      });
      bumpHistory();
      toast.success(`Extracted ${Object.keys(data.fields || {}).length} fields`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      stopProgress();
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!lastRequest) return;
    if (lastRequest.type === "file") {
      await handleExtractFile(lastRequest.file);
    } else {
      await handleExtractText(lastRequest.text);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <span className="text-lg font-bold text-gray-100">Parsify AI</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Parsify AI
          </h1>
          <p className="text-base sm:text-lg font-medium text-indigo-400 tracking-widest uppercase">
            Intelligent Document Extraction
          </p>
          <p className="text-sm text-gray-400 max-w-md mx-auto pt-1">
            Transform invoices, contracts, and resumes into structured data instantly.
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setMode("upload")}
              className={`flex items-center gap-2 flex-1 justify-center px-4 py-3 text-sm font-medium transition-colors ${
                mode === "upload"
                  ? "text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <FileUp className="h-4 w-4" />
              File Upload
            </button>
            <button
              onClick={() => setMode("text")}
              className={`flex items-center gap-2 flex-1 justify-center px-4 py-3 text-sm font-medium transition-colors ${
                mode === "text"
                  ? "text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <AlignLeft className="h-4 w-4" />
              Paste Text
            </button>
            <button
              onClick={() => setMode("audio")}
              className={`flex items-center gap-2 flex-1 justify-center px-4 py-3 text-sm font-medium transition-colors ${
                mode === "audio"
                  ? "text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Music className="h-4 w-4" />
              Audio
            </button>
          </div>

          <div className="p-5">
            {mode === "upload" && (
              <UploadZone
                onUpload={handleExtractFile}
                loading={loading}
                progress={progress}
              />
            )}
            {mode === "text" && (
              <div className="space-y-4">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your document text here..."
                  rows={10}
                  disabled={loading}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-y disabled:opacity-50"
                />
                <button
                  onClick={() => handleExtractText()}
                  disabled={loading || !textInput.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Extract Fields
                    </>
                  )}
                </button>
              </div>
            )}
            {mode === "audio" && (
              <VoiceInput
                extracting={loading}
                onExtractStart={() => {
                  setLoading(true);
                  setResult(null);
                  setError(null);
                }}
                onExtractComplete={(data) => {
                  setResult(data);
                  setLastRequest({ type: "text", text: data.raw_text_preview });
                  setLoading(false);
                  persistHistory({
                    filename: "Audio Upload",
                    document_type: data.document_type,
                    confidence: (data.confidence || 0) * 100,
                    source: "audio",
                    result: data,
                  });
                  bumpHistory();
                  toast.success(
                    `Extracted ${Object.keys(data.fields || {}).length} fields`
                  );
                }}
                onExtractError={(message) => {
                  setError(message);
                  setLoading(false);
                }}
              />
            )}
          </div>
        </div>

        {loading && <SkeletonCard />}

        {error && !loading && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 animate-fadeIn">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        <div ref={resultRef}>
          {result && !loading && <ResultCard result={result} />}
        </div>

        <ExtractionHistory
          refreshKey={historyRefresh}
          onViewResult={handleViewHistoryResult}
        />
      </main>

      <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-600">
        Parsify AI — Intelligent Document Extraction
      </footer>
    </div>
  );
}
