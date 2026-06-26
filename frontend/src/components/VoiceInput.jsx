import { useRef, useState } from "react";
import { Loader2, Sparkles, Upload, FileAudio, X } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "../lib/utils";
import { apiFetch } from "../lib/api";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".webm", ".ogg", ".m4a"];
const FORMAT_BADGES = ["MP3", "WAV", "M4A", "OGG", "WEBM"];

export default function VoiceInput({ onExtractStart, onExtractComplete, onExtractError, extracting }) {
  const [state, setState] = useState("idle"); // idle | processing | transcript
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const fileInputRef = useRef(null);

  const sendToTranscribe = async (formData) => {
    setState("processing");

    try {
      const res = await apiFetch("/transcribe", {
        method: "POST",
        body: formData,
      }, 1);
      const data = res;

      if (!data.transcribed_text?.trim()) {
        throw new Error("No speech detected, please try again");
      }

      setTranscript(data.transcribed_text);
      setLanguage(data.language_detected);
      setState("transcript");
      toast.success("Transcription complete");
    } catch (err) {
      setState("idle");
      toast.error(err.message);
    }
  };

  const validateAudioFile = (file) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return "Unsupported format. Allowed: MP3, WAV, WEBM, OGG, M4A.";
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return "File exceeds maximum size of 25MB.";
    }
    if (file.size === 0) {
      return "Audio file is empty.";
    }
    return null;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateAudioFile(file);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadedFile(file);
    setTranscript("");
    setLanguage(null);

    const formData = new FormData();
    formData.append("file", file, file.name);

    await sendToTranscribe(formData);
  };

  const handleClear = () => {
    setTranscript("");
    setLanguage(null);
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setState("idle");
  };

  const handleExtract = async () => {
    const transcribedText = transcript.trim();
    if (!transcribedText) {
      toast.error("No transcript to extract from.");
      return;
    }

    const body = { text: transcribedText };
    console.log("POST /extract-text request:", body);

    onExtractStart?.();

    try {
      const data = await apiFetch("/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, 1);

      console.log("POST /extract-text response:", data);

      onExtractComplete?.(data, transcribedText);
    } catch (err) {
      onExtractError?.(err.message);
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {state === "idle" && (
        <div className="flex flex-col items-center rounded-xl border border-gray-800 bg-gray-950/50 py-8 px-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.webm,.ogg,.m4a"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors border border-gray-700"
          >
            <Upload className="h-4 w-4" />
            Upload Audio File
          </button>

          <div className="flex flex-wrap justify-center gap-1.5">
            {FORMAT_BADGES.map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-xs text-gray-500"
              >
                {fmt}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-600">Max 25MB</p>

          {uploadedFile && (
            <div className="flex items-center gap-2 w-full max-w-xs rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
              <FileAudio className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500">{formatBytes(uploadedFile.size)}</p>
              </div>
              <button
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {state === "processing" && (
        <div className="flex flex-col items-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-400">Transcribing...</p>
          {uploadedFile && (
            <p className="text-xs text-gray-500">
              {uploadedFile.name} ({formatBytes(uploadedFile.size)})
            </p>
          )}
        </div>
      )}

      {state === "transcript" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">Transcript</p>
            <div className="flex items-center gap-3">
              {uploadedFile && (
                <span className="text-xs text-gray-500 truncate max-w-[160px]">
                  {uploadedFile.name} ({formatBytes(uploadedFile.size)})
                </span>
              )}
              {language && (
                <span className="text-xs text-gray-500 uppercase">
                  Language: {language}
                </span>
              )}
            </div>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={6}
            disabled={extracting}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-y disabled:opacity-50"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExtract}
              disabled={extracting || !transcript.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract from this text
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={extracting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
