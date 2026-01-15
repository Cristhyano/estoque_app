const express = require("express");
const { listSyncEvents, ackSyncEvents } = require("../controllers/syncController");

const router = express.Router();

router.get("/pending", listSyncEvents);
router.post("/ack", ackSyncEvents);

module.exports = router;
