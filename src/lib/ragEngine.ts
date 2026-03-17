// ─────────────────────────────────────────────────────────────────────────────
// SecureVault AI — In-Browser RAG Engine
//
// Full retrieval-augmented generation pipeline running entirely in the browser:
//   1. Text extraction (PDF via pdfjs-dist, plain text for .txt/.md/.csv/.json)
//   2. Chunking (sentence-based with overlap, ~500 chars)
//   3. Semantic retrieval via transformer embeddings (all-MiniLM-L6-v2)
//   4. LLM generation via WebLLM (Llama-3.2-1B-Instruct, WebGPU)
//
// All embeddings are stored in memory. No backend, no external vector DB.
// File store: uploaded files are kept in-memory for the session.
// ─────────────────────────────────────────────────────────────────────────────

import * as webllm from "@mlc-ai/web-llm";
import * as pdfjsLib from "pdfjs-dist";
import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { insertEmbedding, fetchEmbeddingsFromServer, type ServerEmbeddingEntry } from "./chatApi";
// @ts-ignore — Vite-specific ?url suffix
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ── Configure transformers.js to use locally bundled model files ──────────────
//
// HuggingFace CDN returns a 307 redirect whose Location header has
// Access-Control-Allow-Origin: https://huggingface.co — which the browser
// refuses to follow from localhost. We ship the model files in /public/models/
// and point the library at them so every fetch is same-origin.
env.allowRemoteModels = false;
env.allowLocalModels = true;
// In browser context, localModelPath must be a base URL path (not a FS path)
env.localModelPath = "/models/";

console.log("[RAG] Module loaded. pdf.js workerSrc:", pdfjsWorkerUrl);
console.log("[RAG] transformers env — localModelPath:", env.localModelPath, "allowRemote:", env.allowRemoteModels);

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
  /** Embedding vectors for each chunk (populated after embedding) */
  embeddings: number[][];
}

// ── Singleton state ───────────────────────────────────────────────────────────

let llmEngine: webllm.MLCEngine | null = null;
let embeddingPipeline: FeatureExtractionPipeline | null = null;
let currentPhase: InitPhase = "idle";
let initPromise: Promise<void> | null = null;

// In-memory file store — survives navigation, lost on refresh
const fileStore: Map<string, StoredFile> = new Map();

// Currently active file for Q&A
let activeFileId = "";

// Server-fetched embedding+chunk pairs — loaded from KES after retriever-ready.
// Because the server now returns chunk text alongside vectors, these can be used
// as a full synthetic StoredFile, enabling Q&A without re-uploading documents.
let serverEmbeddings: ServerEmbeddingEntry[] = [];

// Synthetic file ID used when the vector store is rebuilt from server data
const SERVER_FILE_ID = "__server_restored__";

// ── Embedding Model ───────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

/**
 * Initialise the embedding model (all-MiniLM-L6-v2).
 * Model files are served locally from /public/models/ — no CDN required.
 */
async function initEmbeddingModel(): Promise<void> {
  if (embeddingPipeline) return;

  console.log("[RAG] Loading embedding model:", EMBEDDING_MODEL);
  embeddingPipeline = await pipeline("feature-extraction", EMBEDDING_MODEL, {
    // Use default WASM backend (works in all browsers)
    // Model files are fetched from HuggingFace CDN and cached
  });
  console.log("[RAG] Embedding model loaded successfully");
}

/**
 * Generate embeddings for an array of text chunks.
 * Uses mean pooling + L2 normalisation.
 * Each embedding is also sent to the backend with its chunk text (fire-and-forget).
 * Local storage always succeeds even if the API call fails.
 */
async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (!embeddingPipeline) throw new Error("Embedding model not initialised");

  console.log("[RAG] Embedding", chunks.length, "chunks...");
  const embeddings: number[][] = [];

  // Process one chunk at a time so we can send each embedding individually
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];

    console.log(
      `[RAG] Embedding chunk ${i + 1}/${chunks.length}: "${chunkText.slice(0, 60)}…"`,
    );

    const result = await embeddingPipeline(chunkText, {
      pooling: "mean",
      normalize: true,
    });

    // Tensor shape: [1, embedding_dim] → extract first row as plain number[]
    const data = result.tolist() as number[][];
    const vec = Array.from(data[0]); // explicit Array.from for Float32Array safety
    embeddings.push(vec);

    console.log(`[RAG] Chunk ${i} embedded — dim=${vec.length}. Sending to server...`);
    console.log(`[RAG] Sending chunk text: "${chunkText.slice(0, 80)}"`);

    // Send to backend with chunk text — fire-and-forget, never blocks local RAG
    insertEmbedding("yashas", vec, chunkText)
      .then(() => {
        console.log(`[RAG] Chunk ${i} stored on server OK`);
      })
      .catch((err) => {
        console.warn(`[RAG] Failed to send embedding for chunk ${i} to server:`, err);
      });
  }

  console.log("[RAG] All chunks embedded. Dimensions:", embeddings[0]?.length ?? 0);
  return embeddings;
}

/**
 * Generate embedding for a single query string.
 */
async function embedQuery(queryText: string): Promise<number[]> {
  if (!embeddingPipeline) throw new Error("Embedding model not initialised");

  const result = await embeddingPipeline(queryText, {
    pooling: "mean",
    normalize: true,
  });

  // Shape: [1, embedding_dim] → extract first row
  const data = result.tolist() as number[][];
  return data[0];
}

/**
 * Compute cosine similarity between two vectors.
 * Since vectors are L2-normalised, this is just the dot product.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

/**
 * Retrieve the top-K most relevant chunks using cosine similarity
 * between the query embedding and stored chunk embeddings.
 */
async function retrieveRelevantChunks(
  queryText: string,
  chunks: string[],
  embeddings: number[][],
  topK: number,
): Promise<SourceChunk[]> {
  console.log("[RAG] Embedding query:", queryText);
  const queryVec = await embedQuery(queryText);
  console.log("[RAG] Query embedding dimensions:", queryVec.length);

  // Score each chunk
  const scored: SourceChunk[] = embeddings.map((chunkVec, i) => ({
    index: i,
    text: chunks[i],
    score: cosineSimilarity(queryVec, chunkVec),
  }));

  // Sort by descending similarity
  scored.sort((a, b) => b.score - a.score);

  const topChunks = scored.slice(0, topK).filter((s) => s.score > 0);

  console.log("[RAG] Top-K retrieval results:");
  topChunks.forEach((s, i) => {
    console.log(`  [${i}] score=${s.score.toFixed(4)} chunk#${s.index}: "${s.text.substring(0, 80)}..."`);
  });

  return topChunks;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the engine:
 *   1. Load embedding model (Xenova/all-MiniLM-L6-v2, ~23MB)
 *   2. Load LLM via WebLLM (Llama-3.2-1B-Instruct, ~879MB, requires WebGPU)
 */
export function initModels(onStatus?: StatusCallback): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Embedding model
      currentPhase = "loading-retriever";
      onStatus?.("loading-retriever", "Loading embedding model (~23MB)...");
      console.log("[RAG] Phase: loading-retriever");

      await initEmbeddingModel();

      currentPhase = "retriever-ready";
      onStatus?.("retriever-ready", "Retriever ready — you can upload documents now");
      console.log("[RAG] Phase: retriever-ready");

      // 1b. Non-blocking: fetch previously stored embeddings from the KES backend.
      //     Falls back silently — local RAG still works if the API is unreachable.
      fetchServerEmbeddings("yashas").catch((err) => {
        console.warn("[RAG] Could not load server embeddings (non-fatal):", err);
      });

      // 2. LLM (~879 MB download, requires WebGPU)
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

/** Embedding model is ready — file upload can proceed */
export function isEmbedderReady(): boolean {
  return embeddingPipeline !== null;
}

/**
 * Fetch all embedding+chunk pairs from KES for a user, cache them, and
 * restore a synthetic StoredFile in the file store so Q&A works immediately
 * after page load without re-uploading any document.
 *
 * If the server returns 0 valid records (first visit, no uploads yet), the
 * file store is left empty and the user must upload a document as normal.
 * Safe to call multiple times — later calls replace the previous cache.
 */
export async function fetchServerEmbeddings(userId: string): Promise<void> {
  const entries = await fetchEmbeddingsFromServer(userId);
  serverEmbeddings = entries;

  console.log(
    `[RAG] Server embeddings loaded: ${entries.length} entries for user "${userId}"`,
  );

  if (entries.length === 0) {
    console.log("[RAG] No server embeddings — user must upload a document.");
    return;
  }

  // Rebuild a synthetic StoredFile from server data so the RAG pipeline has
  // something to query against without requiring a re-upload.
  const chunks = entries.map((e) => e.chunk);
  const embeddings = entries.map((e) => e.embedding);

  const syntheticFile: StoredFile = {
    id: SERVER_FILE_ID,
    name: "(restored from server)",
    type: "text/plain",
    size: 0,
    uploadedAt: new Date(),
    rawText: chunks.join("\n\n"),
    chunks,
    embeddings,
  };

  fileStore.set(SERVER_FILE_ID, syntheticFile);
  activeFileId = SERVER_FILE_ID;

  console.log(
    `[RAG] Restored synthetic file from server: ${chunks.length} chunks, dim=${embeddings[0]?.length ?? 0}. Q&A available immediately.`,
  );
}

/** Number of embedding+chunk pairs currently cached from the KES server */
export function getServerEmbeddingCount(): number {
  return serverEmbeddings.length;
}

// ── File Store ────────────────────────────────────────────────────────────────

/**
 * Upload a file → extract text → chunk → embed → store in memory.
 */
export async function loadDocument(
  file: File,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; chunkCount: number; fileId: string }> {
  console.log("[RAG] loadDocument:", file.name, file.type, file.size, "bytes");

  if (!embeddingPipeline) {
    throw new Error("Embedding model not ready yet. Please wait for initialisation.");
  }

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
    console.log(`[RAG] Chunk ${i}:`, chunk.substring(0, 150));
  });

  // 3. Generate embeddings for all chunks
  onProgress?.(0, 1, "Generating embeddings...");
  console.log("[RAG] Step 3: embedding chunks...");
  const embeddings = await embedChunks(chunks);

  // 4. Store
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stored: StoredFile = {
    id,
    name: file.name,
    type: file.type || guessType(file.name),
    size: file.size,
    uploadedAt: new Date(),
    rawText,
    chunks,
    embeddings,
  };
  fileStore.set(id, stored);
  console.log("[RAG] Stored file:", id, file.name, chunks.length, "chunks,", embeddings.length, "embeddings");

  // 5. Make it the active file
  activeFileId = id;

  return { fileName: file.name, chunkCount: chunks.length, fileId: id };
}

/** Set which stored file is active for Q&A */
export function setActiveFile(fileId: string): void {
  const stored = fileStore.get(fileId);
  if (!stored) throw new Error(`File not found: ${fileId}`);
  activeFileId = fileId;
  console.log("[RAG] Active file set:", stored.name, "with", stored.embeddings.length, "embeddings");
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
  }
}

export function clearDocument(): void {
  activeFileId = "";
}

export function hasDocument(): boolean {
  const stored = fileStore.get(activeFileId);
  return !!stored && stored.embeddings.length > 0;
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
  if (!embeddingPipeline) throw new Error("Embedding model not initialised");

  const stored = fileStore.get(activeFileId);
  if (!stored) throw new Error("Active file not found");
  if (stored.embeddings.length === 0) throw new Error("No embeddings for active file");

  console.log("[RAG] query:", question);

  // 1. Semantic retrieval using embeddings
  const sources = await retrieveRelevantChunks(
    question,
    stored.chunks,
    stored.embeddings,
    topK,
  );

  console.log("[RAG] Retrieved", sources.length, "chunks, top score:", sources[0]?.score ?? 0);

  // 2. Build prompt
  const context = sources.map((s) => s.text).join("\n\n---\n\n");

  const prompt = `You are a document assistant. Answer questions strictly based on the provided context only.

Rules:
  
- Never use outside knowledge or make assumptions beyond what is in the context.
- Keep your answer concise and directly based on the context.

Context:
${context || ""}

Question: ${question}

Answer:`;

  // DEBUG: Log the full prompt being sent to LLM
  console.log("[RAG] Full prompt being sent to LLM:");
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
  console.log("[RAG] Full LLM response:", answer);

  return { answer, sources };
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
