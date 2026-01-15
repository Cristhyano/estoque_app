const express = require("express");
const { getStatus } = require("../controllers/statusController");

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Status da API
 *     responses:
 *       200:
 *         description: API ativa
 */
router.get("/", getStatus);

module.exports = router;
