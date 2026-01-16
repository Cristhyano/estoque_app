const db = require("./db");

function getEventState(eventId) {
  if (!eventId) return null;
  return db
    .prepare(
      "SELECT event_id, status, updated_at FROM processed_events WHERE event_id = ?"
    )
    .get(String(eventId));
}

function markEventProcessing({ event_id, event_type, origin, created_at }) {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO processed_events (event_id, event_type, origin, created_at, received_at, status, updated_at) VALUES (?, ?, ?, ?, ?, 'processing', ?)"
  ).run(
    String(event_id),
    String(event_type),
    String(origin || "web"),
    String(created_at),
    now,
    now
  );
  db.prepare(
    "UPDATE processed_events SET status = 'processing', updated_at = ? WHERE event_id = ?"
  ).run(now, String(event_id));
}

function markEventApplied({ event_id }) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE processed_events SET status = 'applied', updated_at = ? WHERE event_id = ?"
  ).run(now, String(event_id));
}

module.exports = {
  getEventState,
  markEventProcessing,
  markEventApplied,
};
