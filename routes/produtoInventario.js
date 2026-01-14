const express = require("express");
const {
  listProdutoInventario,
  listOpenProdutoInventario,
  createProdutoInventario,
  updateProdutoInventario,
  deleteProdutoInventario,
} = require("../controllers/produtoInventarioController");

const router = express.Router();

/**
 * @swagger
 * /produto-inventario:
 *   get:
 *     tags: [ProdutoInventario]
 *     summary: Lista relacionamentos de produto e inventario
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: include_totals
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de relacionamentos
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProdutoInventario'
 *                 - $ref: '#/components/schemas/PaginatedProdutoInventario'
 */
router.get("/", listProdutoInventario);
/**
 * @swagger
 * /produto-inventario/aberto:
 *   get:
 *     tags: [ProdutoInventario]
 *     summary: Lista produtos lidos no inventario aberto
 *     responses:
 *       200:
 *         description: Inventario aberto e itens lidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoInventarioOpen'
 */
router.get("/aberto", listOpenProdutoInventario);
/**
 * @swagger
 * /produto-inventario:
 *   post:
 *     tags: [ProdutoInventario]
 *     summary: Registra leitura de produto no inventario aberto (incrementa quantidade)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProdutoInventarioInput'
 *     responses:
 *       200:
 *         description: Relacionamento atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoInventarioResponse'
 *       400:
 *         description: Codigo nao informado
 *       404:
 *         description: Produto nao encontrado
 */
router.post("/", createProdutoInventario);
/**
 * @swagger
 * /produto-inventario:
 *   put:
 *     tags: [ProdutoInventario]
 *     summary: Atualiza quantidade de produto em inventario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProdutoInventarioUpdate'
 *     responses:
 *       200:
 *         description: Relacionamento atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoInventario'
 *       400:
 *         description: Requisicao invalida
 *       404:
 *         description: Produto ou inventario nao encontrado
 */
router.put("/", updateProdutoInventario);
/**
 * @swagger
 * /produto-inventario:
 *   delete:
 *     tags: [ProdutoInventario]
 *     summary: Remove relacionamento de produto no inventario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProdutoInventarioInput'
 *     responses:
 *       200:
 *         description: Relacionamento removido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoInventario'
 *       400:
 *         description: Requisicao invalida
 *       404:
 *         description: Registro nao encontrado
 */
router.delete("/", deleteProdutoInventario);

module.exports = router;
