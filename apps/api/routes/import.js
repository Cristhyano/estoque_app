const express = require("express");
const multer = require("multer");
const {
  importProdutos,
  importInventario,
  importAuto,
} = require("../controllers/importController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = express.Router();

/**
 * @swagger
 * /import:
 *   post:
 *     tags: [Importacao]
 *     summary: Importa produtos ou inventario com base no arquivo enviado
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resultado da importacao
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportResult'
 *       400:
 *         description: Requisicao invalida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Falha ao importar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", upload.single("file"), importAuto);
/**
 * @swagger
 * /import/produtos:
 *   post:
 *     tags: [Importacao]
 *     summary: Importa produtos do PDF Listagem do Cadastro de Produtos
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resultado da importacao
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportResult'
 *       404:
 *         description: Arquivo nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Falha ao ler PDF
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/produtos", upload.single("file"), importProdutos);
/**
 * @swagger
 * /import/inventario:
 *   post:
 *     tags: [Importacao]
 *     summary: Importa produtos do inventario.csv
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resultado da importacao
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportResult'
 *       404:
 *         description: Arquivo nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/inventario", upload.single("file"), importInventario);

module.exports = router;
