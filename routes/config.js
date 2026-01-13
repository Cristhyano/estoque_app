const express = require("express");
const {
  getConfig,
  createConfig,
  updateConfig,
  resetConfig,
} = require("../controllers/configController");

const router = express.Router();

/**
 * @swagger
 * /config:
 *   get:
 *     tags: [Configuracoes]
 *     summary: Consulta o fator de conversao
 *     responses:
 *       200:
 *         description: Configuracao atual
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Config'
 */
router.get("/", getConfig);
/**
 * @swagger
 * /config:
 *   post:
 *     tags: [Configuracoes]
 *     summary: Cria/atualiza o fator de conversao
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Config'
 *     responses:
 *       200:
 *         description: Configuracao salva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Config'
 *       400:
 *         description: Campos invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", createConfig);
/**
 * @swagger
 * /config:
 *   put:
 *     tags: [Configuracoes]
 *     summary: Atualiza o fator de conversao
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Config'
 *     responses:
 *       200:
 *         description: Configuracao salva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Config'
 *       400:
 *         description: Campos invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/", updateConfig);
/**
 * @swagger
 * /config:
 *   delete:
 *     tags: [Configuracoes]
 *     summary: Reseta o fator de conversao para o padrao (100)
 *     responses:
 *       200:
 *         description: Configuracao resetada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Config'
 */
router.delete("/", resetConfig);

module.exports = router;
