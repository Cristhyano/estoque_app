const { initStorage } = require("../utils/storage");
const { listPendingEvents, markEventsSynced } = require("../utils/events");

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

module.exports = {
  listSyncEvents,
  ackSyncEvents,
};
