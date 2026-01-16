const db = require("./db");

function isEventProcessed(eventId) {
  if (!eventId) return false;
  const row = db
    .prepare("SELECT event_id FROM processed_events WHERE event_id = ?")
    .get(String(eventId));
  return Boolean(row);
}

function markEventProcessed({ event_id, event_type, origin, created_at }) {
  const received_at = new Date().toISOString();
  db.prepare(
    "INSERT INTO processed_events (event_id, event_type, origin, created_at, received_at) VALUES (?, ?, ?, ?, ?)"
  ).run(
    String(event_id),
    String(event_type),
    String(origin || "web"),
    String(created_at),
    received_at
  );
}

module.exports = {
  isEventProcessed,
  markEventProcessed,
};
