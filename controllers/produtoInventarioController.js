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

function buildInventorySnapshot(product, quantidade, config) {
  const qtdSistema = Number(product?.quantidade ?? 0);
  const precoUnitarioRaw = Number(product?.preco_unitario);
  const fator = Number(config?.fator_conversao) || 1;
  const precoUnitario = Number.isFinite(precoUnitarioRaw)
    ? precoUnitarioRaw / fator
    : 0;
  const qtdConferida = Number(quantidade ?? 0);
  const valorSistema = qtdSistema * precoUnitario;
  const valorConferido = qtdConferida * precoUnitario;
  return {
    qtd_sistema: qtdSistema,
    qtd_conferida: qtdConferida,
    ajuste: qtdConferida - qtdSistema,
    preco_unitario: precoUnitario,
    valor_sistema: valorSistema,
    valor_conferido: valorConferido,
    diferenca_valor: valorConferido - valorSistema,
  };
}

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

function listProdutoInventario(req, res) {
  const items = readProductInventory();
  const listResponse = buildListResponse(items, req.query, {});
  if (listResponse.response) {
    return res.json(listResponse.response);
  }
  res.json(listResponse.pagedItems);
}

function resolveProductById(products, id) {
  return (
    products.find((item) => item.codigo === id) ||
    products.find((item) => item.codigo_barras === id) ||
    null
  );
}

function listOpenProdutoInventario(req, res) {
  const products = readProducts();
  const periods = readInventoryPeriods();
  const { inventory, created } = ensureOpenInventory(periods);
  if (created) {
    writeInventoryPeriods(periods);
  }

  const items = readProductInventory()
    .filter((item) => item.id_inventario === inventory.id)
    .map((item) => ({
      ...item,
      produto: resolveProductById(products, item.id_produto),
    }));

  res.json({ inventario: inventory, items });
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
  const { inventory, created } = ensureOpenInventory(periods);
  if (created) {
    writeInventoryPeriods(periods);
  }

  const items = readProductInventory();
  const productId = product.codigo || product.codigo_barras;
  const index = items.findIndex(
    (item) =>
      item.id_produto === productId && item.id_inventario === inventory.id
  );
  const now = new Date().toISOString();

  if (index >= 0) {
    const nextQuantidade = Number(items[index].quantidade ?? 0) + 1;
    items[index] = {
      ...items[index],
      quantidade: nextQuantidade,
      ...buildInventorySnapshot(product, nextQuantidade, config),
      last_read: now,
    };
  } else {
    const quantidade = 1;
    items.push({
      id_produto: productId,
      id_inventario: inventory.id,
      quantidade,
      ...buildInventorySnapshot(product, quantidade, config),
      last_read: now,
    });
  }

  writeProductInventory(items);
  res.json({
    produto: product,
    inventario: inventory,
    relacionamento:
      index >= 0 ? items[index] : items[items.length - 1],
  });
}

function updateProdutoInventario(req, res) {
  const parsed = parseCodeInput(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: "Codigo nao informado" });
  }

  const quantidade = Number(req.body.quantidade);
  if (!Number.isInteger(quantidade) || quantidade < 0) {
    return res.status(400).json({ error: "Quantidade invalida" });
  }

  const products = readProducts();
  const product = findProductByCode(products, parsed);
  if (!product) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }
  const config = readConfig();

  const periods = readInventoryPeriods();
  const open = getOpenInventory(periods);
  const inventoryId = String(req.body.id_inventario ?? open?.id ?? "").trim();
  if (!inventoryId) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const items = readProductInventory();
  const productId = product.codigo || product.codigo_barras;
  const index = items.findIndex(
    (item) =>
      item.id_produto === productId && item.id_inventario === inventoryId
  );

  if (index >= 0) {
    items[index] = {
      ...items[index],
      quantidade,
      ...buildInventorySnapshot(product, quantidade, config),
    };
  } else {
    items.push({
      id_produto: productId,
      id_inventario: inventoryId,
      quantidade,
      ...buildInventorySnapshot(product, quantidade, config),
    });
  }

  writeProductInventory(items);
  res.json(items[index >= 0 ? index : items.length - 1]);
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
  const index = items.findIndex(
    (item) =>
      item.id_produto === productId && item.id_inventario === inventoryId
  );

  if (index === -1) {
    return res.status(404).json({ error: "Registro nao encontrado" });
  }

  const removed = items.splice(index, 1)[0];
  writeProductInventory(items);
  res.json(removed);
}

module.exports = {
  listProdutoInventario,
  listOpenProdutoInventario,
  createProdutoInventario,
  updateProdutoInventario,
  deleteProdutoInventario,
};
