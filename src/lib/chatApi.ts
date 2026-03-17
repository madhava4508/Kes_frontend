// ─────────────────────────────────────────────────────────────────────────────
// SecureVault AI — Chat History API
//
// insert_chats      — POSTs Q&A pairs after each RAG query (fire-and-forget)
// getChats          — GETs full chat history for a user
// insertEmbedding   — POSTs a single chunk embedding to the backend
// fetchEmbeddingsFromServer — GETs all stored embeddings for a user
// ─────────────────────────────────────────────────────────────────────────────

const KES_BASE = "https://religionistic-ungnarled-ena.ngrok-free.dev/kes";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatEntry {
  question: string;
  answer: string;
}

export interface InsertChatsResponse {
  status: string;
  inserted_rows: number;
}

/** A single record returned by GET /kes/get_chats/:userId */
export interface HistoryRecord {
  id: number;
  user_id: string;
  question: string;
  response: string;
  created_at: string;
}

export interface GetChatsResponse {
  chats: HistoryRecord[];
}

/** Response shape of GET /kes/get_embeddings/:userId
 *
 * Real API returns an array of full DB records — NOT a flat array of vectors.
 * Each record has:
 *   id         — DB row id
 *   user_id    — owner
 *   embedding  — JSON-serialised number[] stored as a string in the DB
 *   chunk      — the raw text that produced this embedding (field name: "chunk")
 *   created_at — ISO timestamp
 */
export interface EmbeddingRecord {
  id: number;
  user_id: string;
  embedding: string | number[]; // DB stores it as a JSON string; parse before use
  chunk: string;
  created_at: string;
}

export interface GetEmbeddingsResponse {
  embeddings: EmbeddingRecord[];
}

/** A parsed, usable embedding+chunk pair returned by fetchEmbeddingsFromServer */
export interface ServerEmbeddingEntry {
  embedding: number[];
  chunk: string;
}

// ── insert_chats ─────────────────────────────────────────────────────────────

/**
 * POST one or more Q&A pairs to the KES insert_chats endpoint.
 * Throws on network / non-OK errors.
 */
export async function insertChats(
  userId: string,
  chats: ChatEntry[],
): Promise<InsertChatsResponse> {
  const res = await fetch(`${KES_BASE}/insert_chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, chats }),
  });

  if (!res.ok) {
    throw new Error(`KES API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<InsertChatsResponse>;
}

// ── insert_embedding ─────────────────────────────────────────────────────────

/**
 * POST a single chunk embedding + its source text to the KES backend.
 *
 * Request body:
 *   { user_id: string, embedding: number[], chunks: string }
 *
 * `chunkText` is REQUIRED — TypeScript will catch any call site that omits it.
 * If it arrives empty at runtime (should never happen) the function warns and
 * skips the request rather than silently storing a useless record.
 *
 * Fire-and-forget safe: caller wraps in .catch() so errors never propagate to
 * the local RAG pipeline.
 */
export async function insertEmbedding(
  userId: string,
  embedding: number[] | Float32Array,
  chunkText: string,
): Promise<void> {
  // Safety guard: warn loudly if chunkText is somehow empty at runtime
  if (!chunkText || chunkText.trim() === "") {
    console.warn(
      "[ChatAPI] insertEmbedding — chunkText is empty. Skipping server call to avoid storing a useless record.",
    );
    return;
  }

  const vector = Array.from(embedding); // Float32Array → plain number[]

  console.log(
    `[ChatAPI] insertEmbedding — user="${userId}" dim=${vector.length} chunkPreview="${chunkText.slice(0, 80)}"`,
  );

  const payload = { user_id: userId, embedding: vector, chunks: chunkText };
  console.log("[ChatAPI] Request payload keys:", Object.keys(payload), "chunks length:", chunkText.length);

  const res = await fetch(`${KES_BASE}/insert_embedding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `KES API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  console.log(`[ChatAPI] insertEmbedding — stored OK (status ${res.status})`);
}

// ── get_embeddings ────────────────────────────────────────────────────────────

/**
 * GET all stored embeddings for a user from the KES backend.
 *
 * Returns an array of { embedding: number[], chunk: string } pairs, ready to
 * be loaded directly into the ragEngine vector store so users never need to
 * re-upload documents after a page refresh.
 *
 * Handles the real API quirks:
 *   - `embedding` is stored in the DB as a JSON string — parsed here to number[]
 *   - field is named `chunk` (not `chunks`) in GET responses
 *   - records with unparseable embeddings or empty chunks are skipped with a warn
 *
 * Throws on network / non-OK / non-JSON errors so callers fall back gracefully.
 */
export async function fetchEmbeddingsFromServer(userId: string): Promise<ServerEmbeddingEntry[]> {
  const url = `${KES_BASE}/get_embeddings/${encodeURIComponent(userId)}`;
  console.log("[ChatAPI] GET", url);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error("[ChatAPI] Network error — could not reach KES server:", networkErr);
    throw networkErr;
  }

  console.log(`[ChatAPI] Response status: ${res.status} ${res.statusText}`);
  console.log("[ChatAPI] Content-Type:", res.headers.get("content-type"));

  const rawText = await res.text();
  console.log(`[ChatAPI] Raw response body (first 500 chars):\n${rawText.slice(0, 500)}`);

  // Detect HTML error pages (nginx / proxy 500 pages)
  if (rawText.trimStart().startsWith("<")) {
    const msg = `KES /get_embeddings returned HTML instead of JSON (status ${res.status}). First 200 chars: ${rawText.slice(0, 200)}`;
    console.error("[ChatAPI]", msg);
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = `KES API error: ${res.status} ${res.statusText} — ${rawText.slice(0, 200)}`;
    console.error("[ChatAPI]", msg);
    throw new Error(msg);
  }

  let data: GetEmbeddingsResponse;
  try {
    data = JSON.parse(rawText) as GetEmbeddingsResponse;
  } catch (parseErr) {
    console.error("[ChatAPI] JSON parse failed. Raw text:", rawText.slice(0, 500));
    throw new Error(`KES /get_embeddings returned non-JSON: ${(parseErr as Error).message}`);
  }

  console.log("[ChatAPI] Parsed response keys:", Object.keys(data));

  if (!Array.isArray(data.embeddings)) {
    console.warn("[ChatAPI] 'embeddings' field missing or not an array:", JSON.stringify(data).slice(0, 300));
    return [];
  }

  console.log(`[ChatAPI] Raw records from server: ${data.embeddings.length}`);

  const result: ServerEmbeddingEntry[] = [];

  for (const rec of data.embeddings) {
    // Parse embedding — stored as a JSON string in the DB (e.g. "[-0.12, 0.44, ...]")
    let vec: number[];
    if (typeof rec.embedding === "string") {
      try {
        vec = JSON.parse(rec.embedding) as number[];
      } catch {
        console.warn(`[ChatAPI] Skipping record id=${rec.id} — embedding is not valid JSON:`, rec.embedding.slice(0, 80));
        continue;
      }
    } else if (Array.isArray(rec.embedding)) {
      vec = rec.embedding;
    } else {
      console.warn(`[ChatAPI] Skipping record id=${rec.id} — unexpected embedding type:`, typeof rec.embedding);
      continue;
    }

    // Skip records with empty chunk text — useless for retrieval
    if (!rec.chunk || rec.chunk.trim() === "") {
      console.warn(`[ChatAPI] Skipping record id=${rec.id} — chunk text is empty`);
      continue;
    }

    result.push({ embedding: Array.from(vec), chunk: rec.chunk });
  }

  console.log(
    `[ChatAPI] fetchEmbeddingsFromServer — loaded ${result.length}/${data.embeddings.length} valid entries for user "${userId}"` +
      (result.length > 0 ? ` (dim=${result[0].embedding.length})` : ""),
  );

  return result;
}

// ── ngrok upload ──────────────────────────────────────────────────────────────

const NGROK_UPLOAD_URL =
  "https://c6ba-2401-4900-c32c-e5e6-f8e4-a42a-b881-1fae.ngrok-free.app/kes/upload";

export interface UploadToNgrokOptions {
  /** "new" to create a new folder, "existing" to add to an existing one */
  folder_action?: "new" | "existing";
  /** Name of the folder to create or target */
  folder_name?: string;
}

/**
 * POST a file to the ngrok /kes/upload endpoint as multipart/form-data.
 *
 * Mirrors the curl command:
 *   curl -X POST "<NGROK_UPLOAD_URL>" \
 *     -H "Accept: application/json" \
 *     -F "file=@/path/to/file" \
 *     -F "folder_action=new" \
 *     -F "folder_name=my_folder"
 *
 * Called fire-and-forget alongside the local RAG pipeline — a failure here
 * never blocks or affects local embedding / Q&A functionality.
 */
export async function uploadToNgrok(
  file: File,
  options: UploadToNgrokOptions = {},
): Promise<void> {
  const { folder_action = "new", folder_name = "my_folder" } = options;

  console.log(
    `[ChatAPI] uploadToNgrok — file="${file.name}" size=${file.size}B folder_action="${folder_action}" folder_name="${folder_name}"`,
  );
  console.log("[ChatAPI] POST", NGROK_UPLOAD_URL);

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("folder_action", folder_action);
  formData.append("folder_name", folder_name);

  let res: Response;
  try {
    res = await fetch(NGROK_UPLOAD_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
  } catch (networkErr) {
    console.error("[ChatAPI] uploadToNgrok — network error:", networkErr);
    throw networkErr;
  }

  console.log(`[ChatAPI] uploadToNgrok — response status: ${res.status} ${res.statusText}`);

  const rawText = await res.text().catch(() => "");
  if (rawText) {
    console.log(`[ChatAPI] uploadToNgrok — response body: ${rawText.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(
      `KES /upload error: ${res.status} ${res.statusText}${rawText ? ` — ${rawText.slice(0, 200)}` : ""}`,
    );
  }

  console.log("[ChatAPI] uploadToNgrok — upload succeeded for:", file.name);
}
// ── get_chats ────────────────────────────────────────────────────────────────

/**
 * GET full chat history for a user from the KES endpoint.
 * Returns records sorted by the server (newest first).
 * Throws on network / non-OK errors.
 */
export async function getChats(userId: string): Promise<HistoryRecord[]> {
  const res = await fetch(`${KES_BASE}/get_chats/${encodeURIComponent(userId)}`);

  if (!res.ok) {
    throw new Error(`KES API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GetChatsResponse;
  return data.chats;
}

// ── inventory summary ────────────────────────────────────────────────────────

const NGROK_BASE =
  "https://c6ba-2401-4900-c32c-e5e6-f8e4-a42a-b881-1fae.ngrok-free.app/kes";

export interface InventorySummary {
  user: string;
  storage: {
    limit: number;
    usage: number;
    usage_in_drive: number;
    percent_used: number;
  };
  counts: {
    folders: number;
    files: number;
    total_items: number;
  };
  file_types: Record<string, number>;
}

/**
 * GET the inventory summary from the ngrok endpoint.
 * Throws on network / non-OK / non-JSON errors.
 */
export async function fetchInventorySummary(): Promise<InventorySummary> {
  const url = `${NGROK_BASE}/inventory/summary`;
  console.log("[ChatAPI] GET", url);

  let res: Response;

  try {
    res = await fetch(url);
  } catch (err) {
    console.error("[ChatAPI] Network error:", err);
    throw new Error("Failed to reach inventory API");
  }

  console.log(`[ChatAPI] Status: ${res.status} ${res.statusText}`);
  console.log("[ChatAPI] Content-Type:", res.headers.get("content-type"));

  const rawText = await res.text();

  // 🔥 IMPORTANT: Detect HTML error page (ngrok / server issues)
  if (rawText.trim().startsWith("<")) {
    console.error("[ChatAPI] Received HTML instead of JSON:", rawText.slice(0, 300));
    throw new Error("Inventory API returned HTML instead of JSON (ngrok/backend issue)");
  }

  if (!res.ok) {
    throw new Error(
      `Inventory API error: ${res.status} ${res.statusText} — ${rawText.slice(0, 200)}`
    );
  }

  let data: InventorySummary;

  try {
    data = JSON.parse(rawText) as InventorySummary;
  } catch (err) {
    console.error("[ChatAPI] JSON parse failed:", rawText.slice(0, 300));
    throw new Error("Invalid JSON from inventory API");
  }

  console.log("[ChatAPI] Inventory summary loaded for user:", data.user);

  return data;
}
