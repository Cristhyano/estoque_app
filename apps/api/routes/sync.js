const express = require("express");
const { listSyncEvents, ackSyncEvents, applySyncEvents } = require("../controllers/syncController");

const router = express.Router();

router.get("/pending", listSyncEvents);
router.post("/ack", ackSyncEvents);
router.post("/events", applySyncEvents);

module.exports = router;
