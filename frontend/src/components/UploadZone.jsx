import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn, formatBytes } from "../lib/utils";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXT = [".pdf", ".docx", ".txt"];
const MAX_SIZE = 10 * 1024 * 1024;

function validateFile(file) {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return "Only PDF, DOCX, and TXT files are supported.";
  }
  if (file.size > MAX_SIZE) {
    return "File exceeds maximum size of 10MB.";
  }
  return null;
}

export default function UploadZone({ onUpload, loading, progress }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      const error = validateFile(file);
      if (error) {
        onUpload(null, error);
        return;
      }
      setSelectedFile(file);
      onUpload(file);
    },
    [onUpload]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer",
          dragOver
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900",
          loading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={onSelect}
        />
        {loading ? (
          <>
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-gray-400">Extracting structured data...</p>
            {progress > 0 && (
              <div className="w-full max-w-xs mt-4 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-500 mb-3" />
            <p className="text-sm font-medium text-gray-300">
              Drag & drop your document here
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to browse</p>
            <p className="text-xs text-gray-600 mt-3">PDF, DOCX, TXT — max 10MB</p>
          </>
        )}
      </div>

      {selectedFile && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 animate-fadeIn">
          <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
