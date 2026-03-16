import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "../../components/Input";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import {
  Send,
  Bot,
  User,
  FileText,
  Sparkles,
  Upload,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { initialMessages } from "../../../data/mockData";
import type { Message } from "../../../data/mockData";
import {
  initModels,
  isReady,
  isEmbedderReady,
  loadDocument,
  clearDocument,
  hasDocument,
  getDocumentName,
  getChunkCount,
  query as ragQuery,
  consumePendingFile,
  type InitPhase,
} from "../../../lib/ragEngine";

// ── Component ─────────────────────────────────────────────────────────────────

export function AIAssistant() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);

  // Model state
  const [modelPhase, setModelPhase] = useState<InitPhase>("idle");
  const [modelDetail, setModelDetail] = useState("");

  // Document state
  const [docName, setDocName] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Init models on mount ───────────────────────────────────────────────────

  useEffect(() => {
    console.log("[AIAssistant] Mounting — calling initModels...");
    initModels((phase, detail) => {
      console.log("[AIAssistant] Model phase:", phase, "detail:", detail);
      setModelPhase(phase);
      setModelDetail(detail ?? "");
    }).catch((err) => {
      console.error("[AIAssistant] initModels rejected:", err);
    });
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addMessage = useCallback(
    (msg: Omit<Message, "id">) => {
      setMessages((prev) => [...prev, { ...msg, id: prev.length + 1 }]);
    },
    [],
  );

  const ts = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Shared file processing ────────────────────────────────────────────────

  const processFile = useCallback(
    async (file: File) => {
      console.log("[AIAssistant] processFile:", file.name, "embedderReady:", isEmbedderReady());

      setIsLoadingDoc(true);
      setLoadProgress("Reading file...");

      addMessage({
        sender: "ai",
        text: `Processing "${file.name}"...`,
        timestamp: ts(),
      });

      try {
        console.log("[AIAssistant] Calling loadDocument...");
        const result = await loadDocument(file, (_cur, _total, msg) => {
          setLoadProgress(msg);
        });

        console.log("[AIAssistant] loadDocument succeeded:", result);
        setDocName(result.fileName);
        setChunkCount(result.chunkCount);

        addMessage({
          sender: "ai",
          text: `"${result.fileName}" loaded successfully — ${result.chunkCount} chunks indexed. Ask me anything about it!`,
          timestamp: ts(),
        });
      } catch (err) {
        console.error("[AIAssistant] loadDocument failed:", err);
        addMessage({
          sender: "ai",
          text: `Failed to load document: ${(err as Error).message}`,
          timestamp: ts(),
        });
      } finally {
        setIsLoadingDoc(false);
        setLoadProgress("");
      }
    },
    [addMessage],
  );

  // ── Check for pending file from Vault ─────────────────────────────────────

  useEffect(() => {
    console.log("[AIAssistant] modelPhase changed to:", modelPhase);
    // TF-IDF retriever is instant, so process pending file as soon as we're past idle
    if (modelPhase !== "idle") {
      const pending = consumePendingFile();
      console.log("[AIAssistant] Checking pending file:", pending?.name ?? "none");
      if (pending) {
        processFile(pending);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPhase]);

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[AIAssistant] handleFileSelect:", file?.name ?? "no file");
    if (!file) return;

    // Reset for re-uploads
    if (fileInputRef.current) fileInputRef.current.value = "";

    await processFile(file);
  };

  const handleClearDoc = () => {
    clearDocument();
    setDocName("");
    setChunkCount(0);
    addMessage({
      sender: "ai",
      text: "Document cleared. Upload a new file to continue.",
      timestamp: ts(),
    });
  };

  // ── Send question ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;

    // Add user message
    addMessage({ sender: "user", text, timestamp: ts() });
    setInputValue("");

    // Validate state
    if (!isReady()) {
      addMessage({
        sender: "ai",
        text: "The LLM is still loading. Please wait until initialisation completes.",
        timestamp: ts(),
      });
      return;
    }

    if (!hasDocument()) {
      addMessage({
        sender: "ai",
        text: "No document loaded yet. Please upload a file first.",
        timestamp: ts(),
      });
      return;
    }

    // Run RAG query
    setIsQuerying(true);
    try {
      const result = await ragQuery(text);

      addMessage({
        sender: "ai",
        text: result.answer,
        timestamp: ts(),
        relatedFiles: [getDocumentName()],
        sourceChunks: result.sources.map((s) => ({
          index: s.index,
          text: s.text,
          score: s.score,
        })),
      });
    } catch (err) {
      addMessage({
        sender: "ai",
        text: `Error: ${(err as Error).message}`,
        timestamp: ts(),
      });
    } finally {
      setIsQuerying(false);
    }
  };

  // ── Status badge ───────────────────────────────────────────────────────────

  const statusBadge = () => {
    if (modelPhase === "ready") {
      return (
        <Badge variant="success" className="flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          AI Ready
        </Badge>
      );
    }
    if (modelPhase === "retriever-ready" || modelPhase === "loading-llm") {
      return (
        <Badge variant="secondary" className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Upload Ready
        </Badge>
      );
    }
    if (modelPhase === "error") {
      return (
        <Badge variant="primary" className="flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          Error
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading...
      </Badge>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-8 pb-6 border-b border-border animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">AI Assistant</h1>
            <p className="text-muted-foreground">
              {modelPhase === "ready"
                ? "Upload a document and ask questions"
                : modelPhase === "retriever-ready" || modelPhase === "loading-llm"
                  ? "Upload a document now — LLM still loading for Q&A..."
                  : modelPhase === "error"
                    ? modelDetail
                    : "Initialising..."}
            </p>
          </div>
          {statusBadge()}
        </div>

        {/* Document status bar */}
        {docName && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-[12px] animate-fade-in">
            <FileText className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">{docName}</span>
            <span className="text-xs text-muted-foreground">{chunkCount} chunks</span>
            <button
              onClick={handleClearDoc}
              className="ml-auto p-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
              title="Clear document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading progress */}
        {isLoadingDoc && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{loadProgress}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-8 space-y-6">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-4 animate-chat-in ${message.sender === "user" ? "flex-row-reverse" : ""}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                message.sender === "ai"
                  ? "bg-white/10 text-foreground"
                  : "bg-white/5 text-muted-foreground"
              }`}
            >
              {message.sender === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>

            <div className={`flex-1 max-w-2xl ${message.sender === "user" ? "flex justify-end" : ""}`}>
              <Card className={message.sender === "user" ? "bg-white/5" : ""}>
                <div className="mb-2 text-sm text-muted-foreground">
                  {message.sender === "ai" ? "SecureVault AI" : "You"} · {message.timestamp}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{message.text}</div>

                {/* Related files */}
                {message.relatedFiles && message.relatedFiles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Related Documents:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.relatedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-[8px] text-sm transition-colors duration-200 hover:bg-white/10"
                        >
                          <FileText className="w-4 h-4 text-foreground" />
                          <span>{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source chunks */}
                {message.sourceChunks && message.sourceChunks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Retrieved Sources:</p>
                    <div className="space-y-2">
                      {message.sourceChunks.map((chunk, i) => (
                        <details
                          key={i}
                          className="bg-white/5 rounded-[8px] overflow-hidden transition-colors duration-200 hover:bg-white/[0.07]"
                        >
                          <summary className="flex items-center justify-between px-3 py-2 cursor-pointer text-sm">
                            <span className="text-muted-foreground">
                              Chunk {chunk.index + 1}
                            </span>
                            <span className="text-foreground font-semibold">
                              {(chunk.score * 100).toFixed(0)}% match
                            </span>
                          </summary>
                          <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">
                            {chunk.text}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isQuerying && (
          <div className="flex gap-4 animate-chat-in">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-foreground">
              <Bot className="w-5 h-5" />
            </div>
            <Card>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching document and generating answer...
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-8 border-t border-border bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.md,.json,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload button — always enabled (TF-IDF is instant) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingDoc}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 text-foreground rounded-[12px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload document (.txt, .pdf, .md, .json, .csv)"
            >
              <Upload className="w-5 h-5" />
            </button>

            {/* Text input */}
            <div className="flex-1">
              <Input
                placeholder={
                  hasDocument()
                    ? "Ask a question about your document..."
                    : "Upload a document first..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isQuerying) {
                    handleSend();
                  }
                }}
                disabled={isQuerying}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-[12px] hover:opacity-90 transition-all duration-200 disabled:opacity-50"
              disabled={!inputValue.trim() || isQuerying || modelPhase !== "ready"}
            >
              {isQuerying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {modelPhase === "ready"
              ? "All processing happens in your browser. Your documents never leave your device."
              : modelPhase === "retriever-ready" || modelPhase === "loading-llm"
                ? "You can upload files now. LLM is still loading for Q&A..."
                : "Initialising — this may take a moment on first visit."}
          </p>
        </div>
      </div>
    </div>
  );
}
