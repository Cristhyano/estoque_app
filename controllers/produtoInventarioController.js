const {
  readProducts,
  readInventoryPeriods,
  writeInventoryPeriods,
  readProductInventory,
  writeProductInventory,
  readConfig,
} = require("../utils/storage");
const {
  createOpenInventory,
  getOpenInventory,
} = require("../utils/inventory");
const { buildListResponse } = require("../utils/pagination");
const {
  aggregateInventoryItems,
  buildRecentReads,
  buildReadEvent,
} = require("../utils/inventoryAggregation");

function parseCodeInput(body) {
  const codigo = String(body.codigo ?? body.code ?? "").trim();
  const codigo_barras = String(
    body.codigo_barras ?? body.codigoBarras ?? body.barcode ?? ""
  ).trim();
  const raw = codigo || codigo_barras;
  if (!raw) {
    return { error: "codigo" };
  }
  return { codigo, codigo_barras, raw };
}

function findProductByCode(products, { codigo, codigo_barras, raw }) {
  let product = products.find((item) => item.codigo === (codigo || raw));
  if (!product && (codigo_barras || raw)) {
    product = products.find((item) => item.codigo_barras === (codigo_barras || raw));
  }
  return product || null;
}

function ensureOpenInventory(periods) {
  const open = getOpenInventory(periods);
  if (open) return { inventory: open, created: false };
  const createdInventory = createOpenInventory(periods);
  periods.push(createdInventory);
  return { inventory: createdInventory, created: true };
}

function resolveInventory(periods, inventoryId) {
  if (!inventoryId) return null;
  return periods.find((item) => item.id === inventoryId) || null;
}

function ensureInventoryForRead(periods, inventoryId) {
  if (inventoryId) {
    const inventory = resolveInventory(periods, inventoryId);
    if (!inventory) {
      return { error: "Inventario nao encontrado" };
    }
    if (inventory.status !== "aberto") {
      return { error: "Inventario fechado" };
    }
    return { inventory, created: false };
  }
  return ensureOpenInventory(periods);
}

function listProdutoInventario(req, res) {
  const items = readProductInventory();
  const products = readProducts();
  const config = readConfig();
  const aggregated = aggregateInventoryItems({
    items,
    products,
    config,
    includeProduct: false,
  });
  const listResponse = buildListResponse(aggregated, req.query, {});
  if (listResponse.response) {
    return res.json(listResponse.response);
  }
  res.json(listResponse.pagedItems);
}

function listOpenProdutoInventario(req, res) {
  const products = readProducts();
  const config = readConfig();
  const periods = readInventoryPeriods();
  const inventoryId = String(req.query.inventario_id ?? req.query.inventarioId ?? "").trim();
  const resolved = ensureInventoryForRead(periods, inventoryId);
  if (resolved.error) {
    return res.status(404).json({ error: resolved.error });
  }
  const { inventory, created } = resolved;
  if (created) {
    writeInventoryPeriods(periods);
  }

  const allItems = readProductInventory();
  const items = aggregateInventoryItems({
    items: allItems,
    products,
    config,
    inventoryId: inventory.id,
    includeProduct: true,
  });
  const recent_reads = buildRecentReads({
    items: allItems,
    products,
    config,
    inventoryId: inventory.id,
    limit: 5,
  });

  res.json({ inventario: inventory, items, recent_reads });
}

function createProdutoInventario(req, res) {
  const parsed = parseCodeInput(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: "Codigo nao informado" });
  }

  const products = readProducts();
  const product = findProductByCode(products, parsed);
  if (!product) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }
  const config = readConfig();

  const periods = readInventoryPeriods();
  const inventoryId = String(req.body.inventarioId ?? req.body.inventario_id ?? "").trim();
  const resolved = ensureInventoryForRead(periods, inventoryId);
  if (resolved.error) {
    return res.status(404).json({ error: resolved.error });
  }
  const { inventory, created } = resolved;
  if (created) {
    writeInventoryPeriods(periods);
  }

  const items = readProductInventory();
  const readEvent = buildReadEvent({
    product,
    inventoryId: inventory.id,
    config,
  });
  items.push(readEvent);

  writeProductInventory(items);
  const aggregated = aggregateInventoryItems({
    items,
    products,
    config,
    inventoryId: inventory.id,
    includeProduct: true,
  });
  const acumulado = aggregated.find(
    (item) => item.id_produto === readEvent.id_produto
  );
  const recent_reads = buildRecentReads({
    items,
    products,
    config,
    inventoryId: inventory.id,
    limit: 5,
  });
  res.json({
    produto: product,
    inventario: inventory,
    leitura: readEvent,
    acumulado,
    recent_reads,
  });
}

function updateProdutoInventario(req, res) {
  res.status(400).json({ error: "Operacao nao suportada" });
}

function deleteProdutoInventario(req, res) {
  const parsed = parseCodeInput(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: "Codigo nao informado" });
  }

  const products = readProducts();
  const product = findProductByCode(products, parsed);
  if (!product) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  const periods = readInventoryPeriods();
  const open = getOpenInventory(periods);
  const inventoryId = String(req.body.id_inventario ?? open?.id ?? "").trim();
  if (!inventoryId) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const items = readProductInventory();
  const productId = product.codigo || product.codigo_barras;
  const remaining = items.filter(
    (item) =>
      !(
        item.id_produto === productId && item.id_inventario === inventoryId
      )
  );
  const removedCount = items.length - remaining.length;

  if (removedCount === 0) {
    return res.status(404).json({ error: "Registro nao encontrado" });
  }

  writeProductInventory(remaining);
  res.json({ removed: removedCount });
}

module.exports = {
  listProdutoInventario,
  listOpenProdutoInventario,
  createProdutoInventario,
  updateProdutoInventario,
  deleteProdutoInventario,
};
