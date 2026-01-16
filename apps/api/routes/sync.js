const express = require("express");
const { listSyncEvents, ackSyncEvents, applySyncEvents } = require("../controllers/syncController");

const router = express.Router();

router.get("/pending", listSyncEvents);
router.post("/ack", ackSyncEvents);
/**
 * /sync/events:
 *   post:
 *     summary: Sincroniza eventos offline
 *     tags:
 *       - Sync
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - event_id
 *                     - event_type
 *                     - payload
 *                     - created_at
 *                     - origin
 *                     - status_sync
 *                   properties:
 *                     event_id:
 *                       type: string
 *                     event_type:
 *                       type: string
 *                       example: LEITURA_ADD
 *                     payload:
 *                       type: object
 *                     created_at:
 *                       type: string
 *                     origin:
 *                       type: string
 *                       example: web
 *                     status_sync:
 *                       type: string
 *                       example: pendente
 *     responses:
 *       200:
 *         description: Eventos aplicados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 applied:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Falha ao aplicar evento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 failed_event:
 *                   type: object
 *                 applied:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post("/events", applySyncEvents);

module.exports = router;
