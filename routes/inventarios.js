const express = require("express");
const {
  listInventarios,
  getInventario,
  createInventario,
  updateInventario,
  updateInventarioNome,
  importInventarioXlsx,
  mergeInventarios,
  deleteInventario,
  closeOpenInventario,
  exportInventario,
} = require("../controllers/inventariosController");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = express.Router();

/**
 * @swagger
 * /inventarios:
 *   get:
 *     tags: [Inventarios]
 *     summary: Lista todas as conferencias de inventario
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Pagina (opcional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Itens por pagina (opcional)
 *       - in: query
 *         name: include_totals
 *         schema:
 *           type: boolean
 *         description: Retorna objeto com totais mesmo sem paginacao
 *     responses:
 *       200:
 *         description: Lista de inventarios
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryPeriod'
 *                 - $ref: '#/components/schemas/PaginatedInventoryPeriods'
 */
router.get("/", listInventarios);
/**
 * @swagger
 * /inventarios/{id}:
 *   get:
 *     tags: [Inventarios]
 *     summary: Busca uma conferencia de inventario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryPeriod'
 *       404:
 *         description: Inventario nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id/export", exportInventario);
router.get("/:id", getInventario);
router.post("/import", upload.single("file"), importInventarioXlsx);
router.post("/merge", mergeInventarios);
/**
 * @swagger
 * /inventarios/aberto/fechar:
 *   patch:
 *     tags: [Inventarios]
 *     summary: Fecha o inventario atualmente aberto
 *     responses:
 *       200:
 *         description: Inventario fechado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryPeriod'
 *       404:
 *         description: Inventario aberto nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/aberto/fechar", closeOpenInventario);
/**
 * @swagger
 * /inventarios:
 *   post:
 *     tags: [Inventarios]
 *     summary: Cria uma conferencia de inventario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryPeriod'
 *     responses:
 *       201:
 *         description: Inventario criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryPeriod'
 *       400:
 *         description: Campos invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", createInventario);
/**
 * @swagger
 * /inventarios/{id}:
 *   put:
 *     tags: [Inventarios]
 *     summary: Atualiza uma conferencia de inventario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryPeriod'
 *     responses:
 *       200:
 *         description: Inventario atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryPeriod'
 *       400:
 *         description: Campos invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Inventario nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id/nome", updateInventarioNome);
router.put("/:id", updateInventario);
/**
 * @swagger
 * /inventarios/{id}:
 *   delete:
 *     tags: [Inventarios]
 *     summary: Remove uma conferencia de inventario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventario removido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryPeriod'
 *       404:
 *         description: Inventario nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", deleteInventario);

module.exports = router;
