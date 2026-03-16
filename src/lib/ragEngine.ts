// ─────────────────────────────────────────────────────────────────────────────
// SecureVault AI — In-Browser RAG Engine
//
// Full retrieval-augmented generation pipeline running entirely in the browser:
//   1. Text extraction (PDF via pdfjs-dist, plain text for .txt/.md/.csv/.json)
//   2. Chunking (sentence-based with overlap)
//   3. TF-IDF retrieval (pure JS, zero dependencies, no CDN)
//   4. LLM generation via WebLLM (Llama-3.2-1B-Instruct, WebGPU)
//
// File store: uploaded files are kept in-memory for the session.
// ─────────────────────────────────────────────────────────────────────────────

import * as webllm from "@mlc-ai/web-llm";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore — Vite-specific ?url suffix
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
console.log("[RAG] Module loaded. pdf.js workerSrc:", pdfjsWorkerUrl);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SourceChunk {
  index: number;
  text: string;
  score: number;
}

export interface RAGResult {
  answer: string;
  sources: SourceChunk[];
}

export type InitPhase =
  | "idle"
  | "loading-retriever"
  | "retriever-ready"
  | "loading-llm"
  | "ready"
  | "error";

export type StatusCallback = (phase: InitPhase, detail?: string) => void;
export type ProgressCallback = (current: number, total: number, msg: string) => void;

/** A stored file in the in-memory vault */
export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  rawText: string;
  chunks: string[];
}

// ── Singleton state ───────────────────────────────────────────────────────────

let llmEngine: webllm.MLCEngine | null = null;
let currentPhase: InitPhase = "idle";
let initPromise: Promise<void> | null = null;

// In-memory file store — survives navigation, lost on refresh
const fileStore: Map<string, StoredFile> = new Map();

// Currently active file for Q&A
let activeFileId = "";

// TF-IDF index for the active file
let tfidfIndex: TFIDFIndex | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the engine. The TF-IDF retriever is pure JS (instant),
 * so only the LLM needs downloading.
 */
export function initModels(onStatus?: StatusCallback): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. TF-IDF retriever — pure JS, nothing to download
      currentPhase = "loading-retriever";
      onStatus?.("loading-retriever", "Initialising retriever...");
      console.log("[RAG] Phase: loading-retriever (TF-IDF — instant)");

      // TF-IDF is ready immediately
      currentPhase = "retriever-ready";
      onStatus?.("retriever-ready", "Retriever ready — you can upload documents now");
      console.log("[RAG] Phase: retriever-ready");

      // 2. LLM (~700 MB download, requires WebGPU)
      const gpu = (navigator as any).gpu;
      console.log("[RAG] WebGPU available:", !!gpu);
      if (!gpu) {
        const msg =
          "WebGPU is not available in this browser. File upload works, but AI Q&A requires Chrome 113+ or Edge 113+.";
        console.warn("[RAG]", msg);
        currentPhase = "error";
        onStatus?.("error", msg);
        initPromise = null;
        return;
      }

      currentPhase = "loading-llm";
      onStatus?.("loading-llm", "Loading LLM (first time may take a while)...");
      console.log("[RAG] Phase: loading-llm");
      try {
        llmEngine = new webllm.MLCEngine();
        await llmEngine.reload("Llama-3.2-1B-Instruct-q4f16_1-MLC");
        console.log("[RAG] LLM loaded successfully");
      } catch (llmErr) {
        console.error("[RAG] LLM failed to load:", llmErr);
        throw llmErr;
      }

      currentPhase = "ready";
      onStatus?.("ready", "Models ready");
      console.log("[RAG] Phase: ready");
    } catch (err) {
      currentPhase = "error";
      const message = (err as Error).message || String(err);
      console.error("[RAG] Init failed:", message, err);
      let detail = message;
      if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        detail = "Network error — check your internet connection and try refreshing.";
      } else if (message.includes("WebGPU") || message.includes("GPU")) {
        detail = "WebGPU not supported in this browser. Try Chrome 113+ or Edge 113+.";
      }
      onStatus?.("error", detail);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export function getPhase(): InitPhase {
  return currentPhase;
}

export function isReady(): boolean {
  return currentPhase === "ready";
}

/** TF-IDF retriever is always ready (pure JS) — file upload can proceed immediately */
export function isEmbedderReady(): boolean {
  return currentPhase !== "idle";
}

// ── File Store ────────────────────────────────────────────────────────────────

/**
 * Upload a file → extract text → chunk → store in memory → build TF-IDF index.
 */
export async function loadDocument(
  file: File,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; chunkCount: number; fileId: string }> {
  console.log("[RAG] loadDocument:", file.name, file.type, file.size, "bytes");

  // 1. Extract text
  onProgress?.(0, 1, "Reading file...");
  console.log("[RAG] Step 1: extracting text...");
  let rawText: string;
  try {
    rawText = await extractText(file, onProgress);
    console.log("[RAG] Text extracted, length:", rawText.length);
  } catch (err) {
    console.error("[RAG] Text extraction failed:", err);
    throw err;
  }
  if (!rawText.trim()) {
    throw new Error("No text could be extracted from this file");
  }

  // 2. Chunk
  console.log("[RAG] Step 2: chunking...");
  const chunks = chunkText(rawText);
  console.log("[RAG] Created", chunks.length, "chunks");
  
  // DEBUG: Log sample of chunks
  chunks.slice(0, 3).forEach((chunk, i) => {
    console.log(`[RAG] DEBUG: Chunk ${i}:`, chunk.substring(0, 150));
  });

  // 3. Store
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stored: StoredFile = {
    id,
    name: file.name,
    type: file.type || guessType(file.name),
    size: file.size,
    uploadedAt: new Date(),
    rawText,
    chunks,
  };
  fileStore.set(id, stored);
  console.log("[RAG] Stored file:", id, file.name, chunks.length, "chunks");

  // 4. Make it the active file and build TF-IDF index
  setActiveFile(id);

  return { fileName: file.name, chunkCount: chunks.length, fileId: id };
}

/** Set which stored file is active for Q&A */
export function setActiveFile(fileId: string): void {
  const stored = fileStore.get(fileId);
  if (!stored) throw new Error(`File not found: ${fileId}`);
  activeFileId = fileId;
  tfidfIndex = buildTFIDFIndex(stored.chunks);
  console.log("[RAG] Active file set:", stored.name, "TF-IDF index built");
  
  // DEBUG: Log TF-IDF index details
  if (tfidfIndex) {
    console.log("[RAG] DEBUG: TF-IDF index vocab size:", tfidfIndex.vocab.size);
    console.log("[RAG] DEBUG: TF-IDF index IDF sample (first 10):", Array.from(tfidfIndex.idf).slice(0, 10));
    console.log("[RAG] DEBUG: Sample words from vocab:", Array.from(tfidfIndex.vocab.keys()).slice(0, 20));
  }
}

/** Get all stored files */
export function getStoredFiles(): StoredFile[] {
  return Array.from(fileStore.values()).sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
  );
}

/** Remove a file from the store */
export function removeFile(fileId: string): void {
  fileStore.delete(fileId);
  if (activeFileId === fileId) {
    activeFileId = "";
    tfidfIndex = null;
  }
}

export function clearDocument(): void {
  activeFileId = "";
  tfidfIndex = null;
}

export function hasDocument(): boolean {
  return activeFileId !== "" && tfidfIndex !== null;
}

export function getDocumentName(): string {
  const stored = fileStore.get(activeFileId);
  return stored?.name ?? "";
}

export function getChunkCount(): number {
  const stored = fileStore.get(activeFileId);
  return stored?.chunks.length ?? 0;
}

// ── Pending file (cross-page upload support) ────────────────────────────────

let pendingFile: File | null = null;

export function setPendingFile(file: File): void {
  pendingFile = file;
}

export function consumePendingFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}

// ── Query pipeline ────────────────────────────────────────────────────────────

export async function query(question: string, topK = 5): Promise<RAGResult> {
  if (!llmEngine) throw new Error("LLM not initialised");
  if (!tfidfIndex) throw new Error("No document loaded");

  const stored = fileStore.get(activeFileId);
  if (!stored) throw new Error("Active file not found");

  console.log("[RAG] query:", question);

  // 1. TF-IDF retrieve
  const scores = tfidfSearch(tfidfIndex, question, stored.chunks);
  console.log("[RAG] DEBUG: All scores (top 10):", scores.slice(0, 10).map(s => ({ index: s.index, score: s.score.toFixed(4), text: s.text.substring(0, 80) + "..." })));
  
  const sources: SourceChunk[] = scores
    .slice(0, topK)
    .filter((s) => s.score > 0);

  console.log("[RAG] Retrieved", sources.length, "chunks, top score:", sources[0]?.score ?? 0);
  
  // DEBUG: Log each retrieved chunk's text
  sources.forEach((s, i) => {
    console.log(`[RAG] DEBUG: Chunk ${i} (score=${s.score.toFixed(4)}):`, s.text.substring(0, 200));
  });

  // 2. Build prompt
  const context = sources.map((s) => s.text).join("\n\n---\n\n");

  const prompt = `You are a document assistant. Answer questions strictly based on the provided context only.

Rules:
- Refrain from answering questions for which information is not provided in the context.

Context:
${context || ""}

Question: ${question}

Answer:`;

  // DEBUG: Log the full prompt being sent to LLM
  console.log("[RAG] DEBUG: Full prompt being sent to LLM:");
  console.log("=".repeat(50));
  console.log(prompt);
  console.log("=".repeat(50));

  // 3. Generate
  console.log("[RAG] Sending to LLM...");
  const reply = await llmEngine.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  const answer = reply.choices[0].message.content ?? "";
  console.log("[RAG] LLM answer length:", answer.length);
  console.log("[RAG] DEBUG: Full LLM response:", answer);

  return { answer, sources };
}

// ── TF-IDF Implementation ─────────────────────────────────────────────────────

interface TFIDFIndex {
  /** Vocabulary: word → index */
  vocab: Map<string, number>;
  /** IDF values for each vocab word */
  idf: Float64Array;
  /** TF-IDF vector for each chunk (sparse, stored as dense for simplicity) */
  vectors: Float64Array[];
}

/** Tokenize text into lowercase words, strip punctuation */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Build a TF-IDF index from chunks */
function buildTFIDFIndex(chunks: string[]): TFIDFIndex {
  const n = chunks.length;
  const tokenized = chunks.map(tokenize);

  // Build vocabulary and document frequency
  const dfMap = new Map<string, number>();
  const vocabSet = new Set<string>();

  for (const tokens of tokenized) {
    const seen = new Set<string>();
    for (const t of tokens) {
      vocabSet.add(t);
      if (!seen.has(t)) {
        seen.add(t);
        dfMap.set(t, (dfMap.get(t) ?? 0) + 1);
      }
    }
  }

  // Assign indices
  const vocab = new Map<string, number>();
  let idx = 0;
  for (const word of vocabSet) {
    vocab.set(word, idx++);
  }

  const vocabSize = vocab.size;

  // Compute IDF: log(N / df) + 1
  const idf = new Float64Array(vocabSize);
  for (const [word, wordIdx] of vocab) {
    const df = dfMap.get(word) ?? 1;
    idf[wordIdx] = Math.log(n / df) + 1;
  }

  // Compute TF-IDF vectors for each chunk
  const vectors: Float64Array[] = tokenized.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    const vec = new Float64Array(vocabSize);
    const maxTf = Math.max(...tf.values(), 1);
    for (const [word, count] of tf) {
      const wi = vocab.get(word);
      if (wi !== undefined) {
        // Normalized TF * IDF
        vec[wi] = (count / maxTf) * idf[wi];
      }
    }
    // L2 normalize
    let norm = 0;
    for (let i = 0; i < vocabSize; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < vocabSize; i++) vec[i] /= norm;
    }
    return vec;
  });

  console.log("[RAG] TF-IDF index built: vocab size", vocabSize, "chunks", n);
  return { vocab, idf, vectors };
}

/** Search chunks using TF-IDF cosine similarity */
function tfidfSearch(
  index: TFIDFIndex,
  queryText: string,
  chunks: string[],
): SourceChunk[] {
  const tokens = tokenize(queryText);
  const { vocab, idf, vectors } = index;
  const vocabSize = vocab.size;

  // Build query vector
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  const qVec = new Float64Array(vocabSize);
  const maxTf = Math.max(...tf.values(), 1);
  for (const [word, count] of tf) {
    const wi = vocab.get(word);
    if (wi !== undefined) {
      qVec[wi] = (count / maxTf) * idf[wi];
    }
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < vocabSize; i++) norm += qVec[i] * qVec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vocabSize; i++) qVec[i] /= norm;
  }

  // Cosine similarity with each chunk
  const scored: SourceChunk[] = vectors.map((vec, i) => {
    let dot = 0;
    for (let j = 0; j < vocabSize; j++) dot += qVec[j] * vec[j];
    return { index: i, text: chunks[i], score: dot };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractText(file: File, onProgress?: ProgressCallback): Promise<string> {
  console.log("[RAG] extractText:", file.name, "type:", file.type);
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return extractPDF(file, onProgress);
  }
  const text = await file.text();
  console.log("[RAG] Plain text read, length:", text.length);
  return text;
}

async function extractPDF(file: File, onProgress?: ProgressCallback): Promise<string> {
  console.log("[RAG] extractPDF: reading arrayBuffer...");
  const data = await file.arrayBuffer();
  console.log("[RAG] ArrayBuffer size:", data.byteLength);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
    console.log("[RAG] PDF loaded, pages:", pdf.numPages);
  } catch (pdfErr) {
    console.error("[RAG] pdfjsLib.getDocument failed:", pdfErr);
    throw pdfErr;
  }

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages, `Reading PDF page ${i}/${pdf.numPages}`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  console.log("[RAG] PDF extraction complete, chars:", text.length);
  return text;
}

// ── Chunking ──────────────────────────────────────────────────────────────────

function chunkText(text: string, maxSize = 500, overlap = 100): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxSize) return [clean];

  // Sentence splitting
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const result: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const sent of sentences) {
    if (currentLen + sent.length > maxSize && current.length > 0) {
      result.push(current.join(" "));
      // Overlap: keep last few sentences
      const overlapSents: string[] = [];
      let overlapLen = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        if (overlapLen + current[i].length > overlap) break;
        overlapSents.unshift(current[i]);
        overlapLen += current[i].length;
      }
      current = overlapSents;
      currentLen = overlapLen;
    }
    current.push(sent);
    currentLen += sent.length;
  }
  if (current.length > 0) result.push(current.join(" "));

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
}
