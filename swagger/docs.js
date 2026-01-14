/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - nome
 *         - quantidade
 *         - preco_unitario
 *       properties:
 *         codigo:
 *           type: string
 *           example: P001
 *         codigo_barras:
 *           type: string
 *           example: 7891234567890
 *         nome:
 *           type: string
 *           example: Teclado
 *         quantidade:
 *           type: integer
 *           example: 10
 *         preco_unitario:
 *           type: integer
 *           example: 10000
 *           description: Valor em inteiro, sem casas decimais
 *         preco_decimal:
 *           type: number
 *           example: 100
 *           description: Valor calculado pelo fator de conversao
 *     ProductSelect:
 *       type: object
 *       properties:
 *         codigo:
 *           type: string
 *         nome:
 *           type: string
 *     PaginatedProducts:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         total_items:
 *           type: integer
 *         total_pages:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totals:
 *           type: object
 *     PaginatedProductSelect:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductSelect'
 *         total_items:
 *           type: integer
 *         total_pages:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totals:
 *           type: object
 *     Config:
 *       type: object
 *       required:
 *         - fator_conversao
 *       properties:
 *         fator_conversao:
 *           type: integer
 *           example: 100
 *           description: Fator para converter inteiro em decimal
 *     ImportResult:
 *       type: object
 *       properties:
 *         created:
 *           type: integer
 *         updated:
 *           type: integer
 *         skipped:
 *           type: integer
 *     InventoryPeriod:
 *       type: object
 *       required:
 *         - nome
 *         - inicio
 *       properties:
 *         id:
 *           type: string
 *           example: INV-20240101-001
 *         nome:
 *           type: string
 *           example: Conferencia Janeiro
 *         inicio:
 *           type: string
 *           format: date-time
 *         fim:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           example: aberto
 *     PaginatedInventoryPeriods:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryPeriod'
 *         total_items:
 *           type: integer
 *         total_pages:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totals:
 *           type: object
 *     ProdutoInventario:
 *       type: object
 *       required:
 *         - id_produto
 *         - id_inventario
 *         - quantidade
 *       properties:
 *         id_produto:
 *           type: string
 *           example: P001
 *         id_inventario:
 *           type: string
 *           example: INV-20240101-001
 *         quantidade:
 *           type: integer
 *           example: 3
 *     ProdutoInventarioInput:
 *       type: object
 *       properties:
 *         codigo:
 *           type: string
 *         codigo_barras:
 *           type: string
 *     ProdutoInventarioUpdate:
 *       type: object
 *       required:
 *         - quantidade
 *       properties:
 *         codigo:
 *           type: string
 *         codigo_barras:
 *           type: string
 *         id_inventario:
 *           type: string
 *         quantidade:
 *           type: integer
 *     ProdutoInventarioResponse:
 *       type: object
 *       properties:
 *         produto:
 *           $ref: '#/components/schemas/Product'
 *         inventario:
 *           $ref: '#/components/schemas/InventoryPeriod'
 *         relacionamento:
 *           $ref: '#/components/schemas/ProdutoInventario'
 *     PaginatedProdutoInventario:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProdutoInventario'
 *         total_items:
 *           type: integer
 *         total_pages:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totals:
 *           type: object
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         fields:
 *           type: array
 *           items:
 *             type: string
 * tags:
 *   - name: Produtos
 *     description: Operacoes do estoque
 *   - name: Configuracoes
 *     description: Configuracao do fator de conversao
 *   - name: Importacao
 *     description: Importacao de dados do inventario
 *   - name: Inventarios
 *     description: Conferencias de estoque com inicio e fim
 *   - name: ProdutoInventario
 *     description: Leitura de produtos em inventario aberto
 */
