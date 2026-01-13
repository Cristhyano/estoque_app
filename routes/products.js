const express = require("express");
const {
  listProducts,
  listProductSelect,
  getProductByCodigo,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productsController");

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Produtos]
 *     summary: Lista todos os produtos
 *     parameters:
 *       - in: query
 *         name: codigo
 *         schema:
 *           type: string
 *         description: Filtro exato por codigo
 *       - in: query
 *         name: codigo_barras
 *         schema:
 *           type: string
 *         description: Filtro exato por codigo de barras
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtro por contem no nome (case-insensitive)
 *       - in: query
 *         name: quantidade_min
 *         schema:
 *           type: integer
 *       - in: query
 *         name: quantidade_max
 *         schema:
 *           type: integer
 *       - in: query
 *         name: preco_min
 *         schema:
 *           type: integer
 *         description: Valor inteiro armazenado
 *       - in: query
 *         name: preco_max
 *         schema:
 *           type: integer
 *         description: Valor inteiro armazenado
 *       - in: query
 *         name: preco_decimal_min
 *         schema:
 *           type: number
 *         description: Valor decimal usando fator de conversao
 *       - in: query
 *         name: preco_decimal_max
 *         schema:
 *           type: number
 *         description: Valor decimal usando fator de conversao
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
 *         description: Lista de produtos
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 - $ref: '#/components/schemas/PaginatedProducts'
 */
router.get("/", listProducts);
/**
 * @swagger
 * /products/select:
 *   get:
 *     tags: [Produtos]
 *     summary: Lista enxuta para selects com filtro por codigo
 *     parameters:
 *       - in: query
 *         name: codigo
 *         schema:
 *           type: string
 *         description: Filtro por codigo (parcial)
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
 *         description: Lista enxuta de produtos
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductSelect'
 *                 - $ref: '#/components/schemas/PaginatedProductSelect'
 */
router.get("/select", listProductSelect);
/**
 * @swagger
 * /products/{codigo}:
 *   get:
 *     tags: [Produtos]
 *     summary: Busca um produto pelo codigo
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produto nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:codigo", getProductByCodigo);
/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Produtos]
 *     summary: Cadastra um novo produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Produto criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Campos invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Codigo ja cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", createProduct);
/**
 * @swagger
 * /products/{codigo}:
 *   put:
 *     tags: [Produtos]
 *     summary: Atualiza um produto pelo codigo
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Produto atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Campos invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Produto nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:codigo", updateProduct);
/**
 * @swagger
 * /products/{codigo}:
 *   delete:
 *     tags: [Produtos]
 *     summary: Remove um produto pelo codigo
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produto removido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produto nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:codigo", deleteProduct);

module.exports = router;
