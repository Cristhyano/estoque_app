import { openDB } from "idb";
import { apiBaseUrl, appOrigin } from "./config";

type OfflineFilePayload = {
  name: string;
  type: string;
  base64: string;
};

type SyncEvent = {
  event_id: string;
  event_type:
    | "LEITURA_ADD"
    | "LEITURA_REMOVE"
    | "IMPORT_PRODUCTS"
    | "IMPORT_INVENTARIO"
    | "MERGE_INVENTARIO";
  payload: Record<string, unknown>;
  created_at: string;
  origin: "web" | "desktop";
  status_sync: "pendente" | "sincronizado";
};

type QueuedResult = { queued: true };

type QueueKind =
  | "scan"
  | "remove_read"
  | "import_products"
  | "import_inventory"
  | "merge_inventory";

const DB_NAME = "estoque_offline";
const STORE_NAME = "event_queue";
const DB_VERSION = 2;
const QUEUE_INTERVAL_MS = 20000;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_OFFLINE_FILE_BYTES = 15 * 1024 * 1024;
const OFFLINE_FILE_TOO_LARGE_MESSAGE =
  "Arquivo grande demais para importacao offline. Conecte-se para importar online.";

let queueProcessing = false;
let queueInitialized = false;

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (db.objectStoreNames.contains("mutation_queue")) {
        db.deleteObjectStore("mutation_queue");
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "event_id" });
      }
    },
  });

const createQueueId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveEventType = (kind: QueueKind): SyncEvent["event_type"] => {
  switch (kind) {
    case "scan":
      return "LEITURA_ADD";
    case "remove_read":
      return "LEITURA_REMOVE";
    case "import_products":
      return "IMPORT_PRODUCTS";
    case "import_inventory":
      return "IMPORT_INVENTARIO";
    case "merge_inventory":
      return "MERGE_INVENTARIO";
    default:
      return "LEITURA_ADD";
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
};

const serializeFile = async (file: File): Promise<OfflineFilePayload> => {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name || "upload",
    type: file.type || "application/octet-stream",
    base64: arrayBufferToBase64(buffer),
  };
};

const buildEvent = (event_type: SyncEvent["event_type"], payload: Record<string, unknown>): SyncEvent => ({
  event_id: createQueueId(),
  event_type,
  payload,
  created_at: new Date().toISOString(),
  origin: appOrigin,
  status_sync: "pendente",
});

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const isOfflineError = (error: unknown) => {
  if (!error || !(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  if (error instanceof TypeError) return true;
  return error.message.toLowerCase().includes("failed to fetch");
};

const enqueueEvent = async (event: SyncEvent) => {
  const db = await getDb();
  await db.put(STORE_NAME, event);
};

const syncPendingEvents = async (events: SyncEvent[]) => {
  const response = await fetchWithTimeout(`${apiBaseUrl}/sync/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ events }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || "Falha ao sincronizar eventos");
    (error as Error & { applied?: string[] }).applied = Array.isArray(payload?.applied)
      ? payload.applied
      : [];
    throw error;
  }
  return payload;
};

const processOfflineQueue = async () => {
  if (queueProcessing) return;
  queueProcessing = true;
  try {
    const db = await getDb();
    const items = await db.getAll(STORE_NAME);
    if (items.length === 0) return;
    const sorted = items.sort((a, b) => a.created_at.localeCompare(b.created_at));
    try {
      const payload = await syncPendingEvents(sorted);
      const appliedIds = Array.isArray(payload?.applied) ? payload.applied : [];
      for (const eventId of appliedIds) {
        await db.delete(STORE_NAME, eventId);
      }
    } catch (error) {
      const applied = (error as Error & { applied?: string[] }).applied ?? [];
      for (const eventId of applied) {
        await db.delete(STORE_NAME, eventId);
      }
    }
  } finally {
    queueProcessing = false;
  }
};

const initOfflineQueue = () => {
  if (queueInitialized) return;
  queueInitialized = true;
  window.addEventListener("online", () => {
    processOfflineQueue();
  });
  window.setInterval(() => {
    processOfflineQueue();
  }, QUEUE_INTERVAL_MS);
  processOfflineQueue();
};

const queueJsonMutation = async (input: {
  kind: QueueKind;
  payload: Record<string, unknown>;
}) => {
  const event = buildEvent(resolveEventType(input.kind), input.payload);
  await enqueueEvent(event);
  return { queued: true } satisfies QueuedResult;
};

const queueFileMutation = async (input: {
  kind: QueueKind;
  file: File;
  extra?: Record<string, string>;
}) => {
  if (input.file.size > MAX_OFFLINE_FILE_BYTES) {
    throw new Error(OFFLINE_FILE_TOO_LARGE_MESSAGE);
  }
  const filePayload = await serializeFile(input.file);
  const payload: Record<string, unknown> = { file: filePayload };
  if (input.extra) {
    payload.extra = input.extra;
  }
  const event = buildEvent(resolveEventType(input.kind), payload);
  await enqueueEvent(event);
  return { queued: true } satisfies QueuedResult;
};

export {
  initOfflineQueue,
  processOfflineQueue,
  fetchWithTimeout,
  isOfflineError,
  queueJsonMutation,
  queueFileMutation,
  type QueuedResult,
};
