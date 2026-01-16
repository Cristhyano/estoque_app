const { initStorage } = require("../utils/storage");
const { listPendingEvents, markEventsSynced } = require("../utils/events");
const { isEventProcessed, markEventProcessed } = require("../utils/syncEvents");
const { applyLeituraAdd } = require("./produtoInventarioController");
const { applyLeituraRemove } = require("./leiturasController");
const { importAutoFromBuffer } = require("./importController");
const { importInventarioFromBuffer, applyMergeInventarios } = require("./inventariosController");

const SUPPORTED_EVENT_TYPES = new Set([
  "LEITURA_ADD",
  "LEITURA_REMOVE",
  "IMPORT_PRODUCTS",
  "IMPORT_INVENTARIO",
  "MERGE_INVENTARIO",
]);

function decodeFilePayload(filePayload) {
  if (!filePayload || !filePayload.base64) return null;
  const buffer = Buffer.from(String(filePayload.base64), "base64");
  return {
    buffer,
    filename: String(filePayload.name ?? "upload"),
    mimetype: String(filePayload.type ?? "application/octet-stream"),
  };
}

function validateEvent(event) {
  if (!event || typeof event !== "object") return "Evento invalido";
  const eventId = String(event.event_id ?? "").trim();
  const eventType = String(event.event_type ?? "").trim();
  const createdAt = String(event.created_at ?? "").trim();
  const origin = String(event.origin ?? "").trim();
  const statusSync = String(event.status_sync ?? "").trim();
  if (!eventId) return "event_id invalido";
  if (!eventType || !SUPPORTED_EVENT_TYPES.has(eventType)) return "event_type invalido";
  if (!createdAt) return "created_at invalido";
  if (origin !== "web" && origin !== "desktop") return "origin invalido";
  if (statusSync !== "pendente" && statusSync !== "sincronizado")
    return "status_sync invalido";
  if (!event.payload || typeof event.payload !== "object") return "payload invalido";
  return null;
}

async function applySyncEvent(event) {
  switch (event.event_type) {
    case "LEITURA_ADD":
      return applyLeituraAdd(event.payload);
    case "LEITURA_REMOVE":
      return applyLeituraRemove(event.payload);
    case "IMPORT_PRODUCTS": {
      const fileData = decodeFilePayload(event.payload?.file);
      if (!fileData) {
        const error = new Error("Arquivo nao informado");
        error.status = 400;
        throw error;
      }
      return await importAutoFromBuffer({
        buffer: fileData.buffer,
        filename: fileData.filename,
        mimetype: fileData.mimetype,
      });
    }
    case "IMPORT_INVENTARIO": {
      const fileData = decodeFilePayload(event.payload?.file);
      if (!fileData) {
        const error = new Error("Arquivo nao informado");
        error.status = 400;
        throw error;
      }
      const inventarioId = event.payload?.extra?.inventario_id;
      return await importInventarioFromBuffer({
        buffer: fileData.buffer,
        inventarioId,
      });
    }
    case "MERGE_INVENTARIO":
      return applyMergeInventarios(event.payload);
    default: {
      const error = new Error("event_type invalido");
      error.status = 400;
      throw error;
    }
  }
}

function listSyncEvents(req, res) {
  initStorage();
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const events = listPendingEvents(limit);
  res.json({ items: events, total: events.length });
}

function ackSyncEvents(req, res) {
  initStorage();
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const normalized = ids.map((id) => String(id)).filter(Boolean);
  const updated = markEventsSynced(normalized);
  res.json({ updated });
}

async function applySyncEvents(req, res) {
  initStorage();
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  if (events.length === 0) {
    return res.status(400).json({ error: "Nenhum evento informado" });
  }

  const applied = [];
  for (const event of events) {
    const validationError = validateEvent(event);
    if (validationError) {
      return res.status(400).json({
        error: validationError,
        failed_event: event,
        applied,
      });
    }

    if (isEventProcessed(event.event_id)) {
      applied.push(event.event_id);
      continue;
    }

    try {
      await applySyncEvent(event);
      markEventProcessed(event);
      applied.push(event.event_id);
    } catch (error) {
      const status = error.status || 400;
      return res.status(status).json({
        error: error.message || "Falha ao aplicar evento",
        failed_event: event,
        applied,
      });
    }
  }

  return res.json({ applied });
}

module.exports = {
  listSyncEvents,
  ackSyncEvents,
  applySyncEvents,
};
