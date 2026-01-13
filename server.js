const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "products.json");
const configFile = path.join(dataDir, "config.json");
const inventoryPeriodsFile = path.join(dataDir, "inventarios.json");
const inventoryFile = path.join(__dirname, "..", "resources", "inventario.csv");

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf8");
  }
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(
      configFile,
      JSON.stringify({ fator_conversao: 100 }, null, 2),
      "utf8"
    );
  }
}

function readProducts() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, "utf8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2), "utf8");
}

function readInventoryPeriods() {
  ensureDataFile();
  if (!fs.existsSync(inventoryPeriodsFile)) {
    fs.writeFileSync(inventoryPeriodsFile, "[]", "utf8");
  }
  const raw = fs.readFileSync(inventoryPeriodsFile, "utf8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeInventoryPeriods(periods) {
  fs.writeFileSync(
    inventoryPeriodsFile,
    JSON.stringify(periods, null, 2),
    "utf8"
  );
}

function parseInventoryPeriodInput(body) {
  const nomeRaw = body.nome ?? body.name ?? "";
  const inicioRaw = body.inicio ?? body.data_inicio ?? body.start;
  const fimRaw = body.fim ?? body.data_fim ?? body.end ?? null;
  const statusRaw = body.status ?? body.estado ?? "";

  const nome = String(nomeRaw).trim();
  const inicio = String(inicioRaw ?? "").trim();
  const fim = fimRaw === null ? null : String(fimRaw ?? "").trim();
  const status = String(statusRaw).trim().toLowerCase();

  const errors = [];
  if (!nome) errors.push("nome");
  if (!inicio) errors.push("inicio");
  if (status && !["aberto", "fechado"].includes(status)) errors.push("status");

  let inicioIso = null;
  if (inicio) {
    const parsed = new Date(inicio);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("inicio");
    } else {
      inicioIso = parsed.toISOString();
    }
  }

  let fimIso = null;
  if (fim !== null && fim !== "") {
    const parsed = new Date(fim);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("fim");
    } else {
      fimIso = parsed.toISOString();
    }
  }

  if (inicioIso && fimIso && new Date(fimIso) < new Date(inicioIso)) {
    errors.push("fim");
  }

  return {
    errors,
    period: {
      nome,
      inicio: inicioIso,
      fim: fimIso,
      status: status || (fimIso ? "fechado" : "aberto"),
    },
  };
}

function toDecimalValue(preco_unitario, fator_conversao) {
  return preco_unitario / fator_conversao;
}

function withDecimalValue(product, config) {
  return {
    ...product,
    preco_decimal: toDecimalValue(product.preco_unitario, config.fator_conversao),
  };
}

function computeProductTotals(products, config) {
  const totals = products.reduce(
    (acc, item) => {
      acc.quantidade += item.quantidade;
      acc.preco_unitario += item.preco_unitario;
      return acc;
    },
    { quantidade: 0, preco_unitario: 0 }
  );
  return {
    ...totals,
    preco_decimal: toDecimalValue(totals.preco_unitario, config.fator_conversao),
  };
}

function applyProductFilters(products, query) {
  let result = products;

  const codigo = String(query.codigo ?? "").trim();
  if (codigo) {
    result = result.filter((item) => item.codigo === codigo);
  }

  const nome = String(query.nome ?? "").trim().toLowerCase();
  if (nome) {
    result = result.filter((item) =>
      item.nome.toLowerCase().includes(nome)
    );
  }

  const quantidadeMin = Number(query.quantidade_min);
  if (Number.isFinite(quantidadeMin)) {
    result = result.filter((item) => item.quantidade >= quantidadeMin);
  }

  const quantidadeMax = Number(query.quantidade_max);
  if (Number.isFinite(quantidadeMax)) {
    result = result.filter((item) => item.quantidade <= quantidadeMax);
  }

  const precoMin = Number(query.preco_min);
  if (Number.isFinite(precoMin)) {
    result = result.filter((item) => item.preco_unitario >= precoMin);
  }

  const precoMax = Number(query.preco_max);
  if (Number.isFinite(precoMax)) {
    result = result.filter((item) => item.preco_unitario <= precoMax);
  }

  return result;
}

function getPaginationParams(query) {
  const page = Number(query.page);
  const limit = Number(query.limit);
  if (!Number.isFinite(page) && !Number.isFinite(limit)) {
    return null;
  }

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return { page: safePage, limit: safeLimit };
}

function shouldIncludeTotals(query) {
  const raw = String(query.include_totals ?? query.includeTotals ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "y"].includes(raw);
}

function buildListResponse(items, query, totals) {
  const params = getPaginationParams(query);
  const includeTotals = shouldIncludeTotals(query);
  if (!params && !includeTotals) {
    return { pagedItems: items, response: null };
  }

  const total_items = items.length;
  const page = params ? params.page : 1;
  const limit = params ? params.limit : total_items;
  const total_pages =
    limit > 0 ? (total_items === 0 ? 0 : Math.ceil(total_items / limit)) : 0;
  const start = (page - 1) * limit;
  const pagedItems = params ? items.slice(start, start + limit) : items;

  return {
    pagedItems,
    response: {
      items: pagedItems,
      total_items,
      total_pages,
      page,
      limit,
      totals: totals ?? {},
    },
  };
}

function readConfig() {
  ensureDataFile();
  const raw = fs.readFileSync(configFile, "utf8");
  try {
    const data = JSON.parse(raw);
    if (
      data &&
      Number.isFinite(Number(data.fator_conversao)) &&
      Number(data.fator_conversao) > 0
    ) {
      return { fator_conversao: Number(data.fator_conversao) };
    }
  } catch {
    // fallback abaixo
  }
  return { fator_conversao: 100 };
}

function writeConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), "utf8");
}

function parsePtBrDecimalToInteger(value, fator) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  return Math.round(numberValue * fator);
}

function parseProductInput(body) {
  const codeRaw = body.codigo ?? body.code ?? "";
  const nameRaw = body.nome ?? body.name ?? "";
  const quantityRaw = body.quantidade ?? body.quantity;
  const priceRaw =
    body.preco_unitario ?? body.precoUnitario ?? body.preco ?? body.unitPrice;

  const codigo = String(codeRaw).trim();
  const nome = String(nameRaw).trim();
  const quantidade = Number(quantityRaw);
  const preco_unitario = Number(priceRaw);

  const errors = [];
  if (!codigo) errors.push("codigo");
  if (!nome) errors.push("nome");
  if (!Number.isFinite(quantidade) || quantidade < 0) errors.push("quantidade");
  if (!Number.isFinite(preco_unitario) || preco_unitario < 0)
    errors.push("preco_unitario");
  if (!Number.isInteger(preco_unitario)) errors.push("preco_unitario");

  return {
    errors,
    product: { codigo, nome, quantidade, preco_unitario },
  };
}

function parseConfigInput(body) {
  const raw = body.fator_conversao ?? body.fatorConversao ?? body.factor;
  const fator_conversao = Number(raw);
  const errors = [];
  if (!Number.isFinite(fator_conversao) || fator_conversao <= 0)
    errors.push("fator_conversao");
  if (!Number.isInteger(fator_conversao)) errors.push("fator_conversao");
  return { errors, config: { fator_conversao } };
}

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Estoque API",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3001" }],
  },
  apis: [__filename],
});

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - codigo
 *         - nome
 *         - quantidade
 *         - preco_unitario
 *       properties:
 *         codigo:
 *           type: string
 *           example: P001
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
 *     Config:
 *       type: object
 *       required:
 *         - fator_conversao
 *       properties:
 *         fator_conversao:
 *           type: integer
 *           example: 100
 *           description: Fator para converter inteiro em decimal
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         fields:
 *           type: array
 *           items:
 *             type: string
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         total_items:
 *           type: integer
 *           example: 120
 *         total_pages:
 *           type: integer
 *           example: 6
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
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
 *           properties:
 *             quantidade:
 *               type: integer
 *             preco_unitario:
 *               type: integer
 *             preco_decimal:
 *               type: number
 *           description: Soma das colunas numericas com base no filtro
 *     ProductSelect:
 *       type: object
 *       properties:
 *         codigo:
 *           type: string
 *         nome:
 *           type: string
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
 *           description: Sem colunas numericas somaveis
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
 *           description: Sem colunas numericas somaveis
 *     ImportResult:


 *       type: object
 *       properties:
 *         created:
 *           type: integer
 *           example: 90
 *         updated:
 *           type: integer
 *           example: 10
 *         skipped:
 *           type: integer
 *           example: 0
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
 */

/**
 * @swagger
 * tags:
 *   name: Produtos
 *   description: Operacoes do estoque
 */

/**
 * @swagger
 * tags:
 *   name: Configuracoes
 *   description: Configuracao do fator de conversao
 */

/**
 * @swagger
 * tags:
 *   name: Importacao
 *   description: Importacao de dados do inventario
 */

/**
 * @swagger
 * tags:
 *   name: Inventarios
 *   description: Conferencias de estoque com inicio e fim
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Status da API
 *     responses:
 *       200:
 *         description: API ativa
 */
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

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
app.get("/products", (req, res) => {
  const products = readProducts();
  const config = readConfig();
  let filtered = applyProductFilters(products, req.query);

  const decimalMin = Number(req.query.preco_decimal_min);
  if (Number.isFinite(decimalMin)) {
    const minValue = Math.ceil(decimalMin * config.fator_conversao);
    filtered = filtered.filter((item) => item.preco_unitario >= minValue);
  }

  const decimalMax = Number(req.query.preco_decimal_max);
  if (Number.isFinite(decimalMax)) {
    const maxValue = Math.floor(decimalMax * config.fator_conversao);
    filtered = filtered.filter((item) => item.preco_unitario <= maxValue);
  }

  const totals = computeProductTotals(filtered, config);
  const listResponse = buildListResponse(filtered, req.query, totals);
  const payload = listResponse.pagedItems.map((product) =>
    withDecimalValue(product, config)
  );
  if (listResponse.response) {
    return res.json({ ...listResponse.response, items: payload });
  }
  res.json(payload);
});

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
app.get("/products/select", (req, res) => {
  const products = readProducts();
  const codigo = String(req.query.codigo ?? "").trim().toLowerCase();
  const filtered = codigo
    ? products.filter((item) => item.codigo.toLowerCase().includes(codigo))
    : products;
  const items = filtered.map((item) => ({ codigo: item.codigo, nome: item.nome }));
  const listResponse = buildListResponse(items, req.query, {});
  if (listResponse.response) {
    return res.json(listResponse.response);
  }
  res.json(listResponse.pagedItems);
});

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
app.get("/products/:codigo", (req, res) => {
  const products = readProducts();
  const product = products.find((item) => item.codigo === req.params.codigo);
  if (!product) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }
  const config = readConfig();
  res.json(withDecimalValue(product, config));
});

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
app.post("/products", (req, res) => {
  const { errors, product } = parseProductInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  const products = readProducts();
  const exists = products.some((item) => item.codigo === product.codigo);
  if (exists) {
    return res.status(409).json({ error: "Codigo ja cadastrado" });
  }

  products.push(product);
  writeProducts(products);
  const config = readConfig();
  res.status(201).json(withDecimalValue(product, config));
});

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
app.put("/products/:codigo", (req, res) => {
  if (req.body.codigo && String(req.body.codigo) !== req.params.codigo) {
    return res.status(400).json({ error: "Codigo do corpo difere da URL" });
  }

  const { errors, product } = parseProductInput({
    ...req.body,
    codigo: req.params.codigo,
  });
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  const products = readProducts();
  const index = products.findIndex((item) => item.codigo === req.params.codigo);
  if (index === -1) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  products[index] = product;
  writeProducts(products);
  const config = readConfig();
  res.json(withDecimalValue(product, config));
});

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
app.delete("/products/:codigo", (req, res) => {
  const products = readProducts();
  const index = products.findIndex((item) => item.codigo === req.params.codigo);
  if (index === -1) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  const removed = products.splice(index, 1)[0];
  writeProducts(products);
  const config = readConfig();
  res.json(withDecimalValue(removed, config));
});

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
app.get("/config", (req, res) => {
  const config = readConfig();
  res.json(config);
});

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
app.post("/config", (req, res) => {
  const { errors, config } = parseConfigInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  writeConfig(config);
  res.json(config);
});

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
app.put("/config", (req, res) => {
  const { errors, config } = parseConfigInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  writeConfig(config);
  res.json(config);
});

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
app.delete("/config", (req, res) => {
  const config = { fator_conversao: 100 };
  writeConfig(config);
  res.json(config);
});

/**
 * @swagger
 * /import/inventario:
 *   post:
 *     tags: [Importacao]
 *     summary: Importa produtos do inventario.csv
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
app.post("/import/inventario", (req, res) => {
  if (!fs.existsSync(inventoryFile)) {
    return res.status(404).json({ error: "Arquivo inventario.csv nao encontrado" });
  }

  const config = readConfig();
  const products = readProducts();
  const indexByCode = new Map();
  products.forEach((item, index) => {
    indexByCode.set(item.codigo, index);
  });

  const content = fs.readFileSync(inventoryFile, "utf8");
  const lines = content.split(/\r?\n/);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(";");
    if (cols.length < 7) {
      skipped += 1;
      continue;
    }

    const codigo = String(cols[1] ?? "").trim();
    const nome = String(cols[3] ?? "").trim();
    const quantidade = Number(String(cols[5] ?? "").replace(",", "."));
    const preco_unitario = parsePtBrDecimalToInteger(
      cols[6],
      config.fator_conversao
    );
    if (preco_unitario === null) {
      skipped += 1;
      continue;
    }

    const { errors, product } = parseProductInput({
      codigo,
      nome,
      quantidade,
      preco_unitario,
    });

    if (errors.length) {
      skipped += 1;
      continue;
    }

    const existingIndex = indexByCode.get(codigo);
    if (existingIndex === undefined) {
      products.push(product);
      indexByCode.set(codigo, products.length - 1);
      created += 1;
    } else {
      products[existingIndex] = product;
      updated += 1;
    }
  }

  writeProducts(products);
  res.json({ created, updated, skipped });
});

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
app.get("/inventarios", (req, res) => {
  const periods = readInventoryPeriods();
  const listResponse = buildListResponse(periods, req.query, {});
  if (listResponse.response) {
    return res.json(listResponse.response);
  }
  res.json(listResponse.pagedItems);
});

/**
 * @swagger
 * /inventarios/{id}:
 *   get:
 *     tags: [Inventarios]
 *     summary: Consulta uma conferencia por id
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
app.get("/inventarios/:id", (req, res) => {
  const periods = readInventoryPeriods();
  const period = periods.find((item) => item.id === req.params.id);
  if (!period) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }
  res.json(period);
});

/**
 * @swagger
 * /inventarios:
 *   post:
 *     tags: [Inventarios]
 *     summary: Cria uma nova conferencia de inventario
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
app.post("/inventarios", (req, res) => {
  const { errors, period } = parseInventoryPeriodInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  const periods = readInventoryPeriods();
  const nextId = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(periods.length + 1).padStart(3, "0")}`;
  const newPeriod = { id: nextId, ...period };
  periods.push(newPeriod);
  writeInventoryPeriods(periods);
  res.status(201).json(newPeriod);
});

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
app.put("/inventarios/:id", (req, res) => {
  const { errors, period } = parseInventoryPeriodInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const updated = { id: periods[index].id, ...period };
  periods[index] = updated;
  writeInventoryPeriods(periods);
  res.json(updated);
});

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
app.delete("/inventarios/:id", (req, res) => {
  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const removed = periods.splice(index, 1)[0];
  writeInventoryPeriods(periods);
  res.json(removed);
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
