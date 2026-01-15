const { randomUUID } = require("crypto");
const db = require("./db");
const { initStorage } = require("./storage");

function logEvent(type, payload, status = "pendente") {
  initStorage();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO events (id, type, payload, status, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, String(type), JSON.stringify(payload ?? {}), status, createdAt);
  return { id, status, created_at: createdAt };
}

function listPendingEvents(limit = 100) {
  initStorage();
  return db
    .prepare("SELECT id, type, payload, status, created_at FROM events WHERE status = 'pendente' ORDER BY created_at ASC LIMIT ?")
    .all(limit)
    .map((row) => ({
      ...row,
      payload: JSON.parse(row.payload ?? "{}"),
    }));
}

function markEventsSynced(ids) {
  initStorage();
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(
    `UPDATE events SET status = 'sincronizado' WHERE id IN (${placeholders})`
  );
  const result = stmt.run(...ids);
  return result.changes ?? 0;
}

module.exports = {
  logEvent,
  listPendingEvents,
  markEventsSynced,
};
