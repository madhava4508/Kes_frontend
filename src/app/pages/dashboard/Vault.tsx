import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Input } from "../../components/Input";
import { 
  FileText, 
  Upload, 
  Search,
  Eye,
  MessageSquare,
  Download,
  Trash2,
  Filter
} from "lucide-react";
import { vaultFiles, storage } from "../../../data/mockData";
import {
  setPendingFile,
  getStoredFiles,
  removeFile,
  setActiveFile,
  type StoredFile,
} from "../../../lib/ragEngine";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileExt(name: string): string {
  return (name.split(".").pop() ?? "").toUpperCase() || "FILE";
}

export function Vault() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, forceUpdate] = useState(0);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storedFiles = getStoredFiles();

  // Combine mock files and uploaded files for display
  const allFiles = [
    // Uploaded files first (real files from in-memory store)
    ...storedFiles.map((sf) => ({
      kind: "uploaded" as const,
      id: sf.id,
      name: sf.name,
      type: getFileExt(sf.name),
      size: formatFileSize(sf.size),
      uploaded: formatDate(sf.uploadedAt),
      status: "Uploaded" as const,
      stored: sf,
    })),
    // Then mock files
    ...vaultFiles.map((f) => ({
      kind: "mock" as const,
      id: String(f.id),
      name: f.name,
      type: f.type,
      size: f.size,
      uploaded: f.uploaded,
      status: f.status,
      stored: null as StoredFile | null,
    })),
  ];

  const filteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Store the file and navigate to AI Assistant for processing
    setPendingFile(file);
    navigate("/dashboard/ai-assistant");
  };

  const handleAskAI = (file: typeof allFiles[0]) => {
    if (file.kind === "uploaded" && file.stored) {
      // Set as active file and navigate
      setActiveFile(file.stored.id);
      navigate("/dashboard/ai-assistant");
    } else {
      // Mock file — just navigate
      navigate("/dashboard/ai-assistant");
    }
  };

  const handleRemoveFile = (file: typeof allFiles[0]) => {
    if (file.kind === "uploaded") {
      removeFile(file.id);
      forceUpdate((n) => n + 1);
    }
  };

  return (
    <div className="p-10">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Vault</h1>
        <p className="text-muted-foreground">Manage your encrypted documents</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-in stagger-1">
        <div className="flex-1">
          <Input 
            icon={<Search className="w-5 h-5" />}
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        <Button variant="primary" className="flex items-center gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4" />
          Upload Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.md,.json,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Storage Info */}
      <Card className="mb-10 animate-fade-in stagger-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Storage Used</p>
            <p className="text-2xl font-bold">{storage.usedGB} GB <span className="text-sm font-normal text-muted-foreground">of {storage.totalGB} GB</span></p>
          </div>
          <Badge variant="success">{storage.usedPercent}% Used</Badge>
        </div>
        <div className="mt-4 h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-foreground/80 to-foreground/40 rounded-full" style={{ width: storage.barWidth }}></div>
        </div>
      </Card>

      {/* Files Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFiles.map((file, index) => (
          <Card key={file.id} hover className={`flex flex-col animate-fade-in-up stagger-${Math.min(index + 1, 8)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-white/5 rounded-[12px]">
                <FileText className="w-8 h-8 text-foreground" />
              </div>
              <Badge variant={file.kind === "uploaded" ? "primary" : "success"}>
                {file.kind === "uploaded" ? "Uploaded" : file.status}
              </Badge>
            </div>
            
            <h3 className="font-semibold mb-2 line-clamp-2">{file.name}</h3>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <span>{file.type}</span>
              <span>·</span>
              <span>{file.size}</span>
              {file.kind === "uploaded" && file.stored && (
                <>
                  <span>·</span>
                  <span>{file.stored.chunks.length} chunks</span>
                </>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              Uploaded {file.uploaded}
            </p>
            
            <div className="mt-auto flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-[8px] transition-all duration-200 text-sm">
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => handleAskAI(file)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-[8px] transition-all duration-200 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Ask AI
              </button>
            </div>
            
            <div className="flex gap-2 mt-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-white/[0.03] rounded-[8px] transition-all duration-200 text-sm text-muted-foreground">
                <Download className="w-4 h-4" />
                Download
              </button>
              {file.kind === "uploaded" ? (
                <button
                  onClick={() => handleRemoveFile(file)}
                  className="px-3 py-2 hover:bg-destructive/10 rounded-[8px] transition-all duration-200 text-sm text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button className="px-3 py-2 hover:bg-destructive/10 rounded-[8px] transition-all duration-200 text-sm text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-20 animate-fade-in">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">No files found</p>
        </div>
      )}
    </div>
  );
}
