const {
  readProducts,
  writeProducts,
  readConfig,
} = require("../utils/storage");
const {
  withDecimalValue,
  computeProductTotals,
  applyProductFilters,
  parseProductInput,
} = require("../utils/products");
const { buildListResponse } = require("../utils/pagination");
const { logEvent } = require("../utils/events");

function listProducts(req, res) {
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
}

function listProductSelect(req, res) {
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
}

function getProductByCodigo(req, res) {
  const products = readProducts();
  const product = products.find((item) => item.codigo === req.params.codigo);
  if (!product) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }
  const config = readConfig();
  res.json(withDecimalValue(product, config));
}

function createProduct(req, res) {
  const { errors, product } = parseProductInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  const products = readProducts();
  const exists = products.some(
    (item) =>
      (product.codigo && item.codigo === product.codigo) ||
      (product.codigo_barras && item.codigo_barras === product.codigo_barras)
  );
  if (exists) {
    return res.status(409).json({ error: "Codigo ja cadastrado" });
  }

  products.push(product);
  writeProducts(products);
  logEvent("produto_created", { produto: product });
  const config = readConfig();
  res.status(201).json(withDecimalValue(product, config));
}

function updateProduct(req, res) {
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
  logEvent("produto_updated", { produto: product });
  const config = readConfig();
  res.json(withDecimalValue(product, config));
}

function deleteProduct(req, res) {
  const products = readProducts();
  const index = products.findIndex((item) => item.codigo === req.params.codigo);
  if (index === -1) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  const removed = products.splice(index, 1)[0];
  writeProducts(products);
  logEvent("produto_deleted", { produto: removed });
  const config = readConfig();
  res.json(withDecimalValue(removed, config));
}

module.exports = {
  listProducts,
  listProductSelect,
  getProductByCodigo,
  createProduct,
  updateProduct,
  deleteProduct,
};
