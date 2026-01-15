function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEventTimestamp(item) {
  return item.created_at || item.last_read || null;
}

function getPriceSnapshot(item, product, config) {
  const itemPrice = safeNumber(item.preco_unitario, NaN);
  if (Number.isFinite(itemPrice)) return itemPrice;
  const basePrice = safeNumber(product?.preco_unitario, NaN);
  const fator = safeNumber(config?.fator_conversao, 1) || 1;
  return Number.isFinite(basePrice) ? basePrice / fator : 0;
}

function getSystemQuantitySnapshot(item, product) {
  const itemQty = safeNumber(item.qtd_sistema, NaN);
  if (Number.isFinite(itemQty)) return itemQty;
  return safeNumber(product?.quantidade, 0);
}

function aggregateInventoryItems({ items, products, config, inventoryId, includeProduct }) {
  const productMap = new Map(
    products.map((product) => [product.codigo || product.codigo_barras || "", product])
  );

  const filtered = inventoryId
    ? items.filter((item) => item.id_inventario === inventoryId)
    : items;

  const groups = new Map();

  filtered.forEach((item) => {
    const productId = String(item.id_produto ?? "");
    if (!productId) return;
    const inventoryKey = String(item.id_inventario ?? "");
    const key = `${inventoryKey}::${productId}`;
    const current = groups.get(key) || {
      id_produto: productId,
      id_inventario: inventoryKey,
      qtd_conferida: 0,
      quantidade: 0,
      last_read: null,
      snapshot: null,
    };

    const increment = safeNumber(item.quantidade, 1) || 1;
    current.qtd_conferida += increment;
    current.quantidade += increment;

    const eventTimestamp = getEventTimestamp(item);
    if (!current.last_read || (eventTimestamp && eventTimestamp > current.last_read)) {
      current.last_read = eventTimestamp;
      current.snapshot = item;
    }

    groups.set(key, current);
  });

  const aggregated = [];

  groups.forEach((group) => {
    const product = productMap.get(group.id_produto) || null;
    const snapshot = group.snapshot || {};
    const qtdSistema = getSystemQuantitySnapshot(snapshot, product);
    const precoUnitario = getPriceSnapshot(snapshot, product, config);
    const valorSistema = qtdSistema * precoUnitario;
    const valorConferido = group.qtd_conferida * precoUnitario;
    const ajuste = group.qtd_conferida - qtdSistema;
    const diferencaValor = valorConferido - valorSistema;

    aggregated.push({
      id_produto: group.id_produto,
      id_inventario: group.id_inventario,
      quantidade: group.qtd_conferida,
      qtd_conferida: group.qtd_conferida,
      qtd_sistema: qtdSistema,
      ajuste,
      preco_unitario: precoUnitario,
      valor_sistema: valorSistema,
      valor_conferido: valorConferido,
      diferenca_valor: diferencaValor,
      last_read: group.last_read,
      produto: includeProduct ? product : undefined,
    });
  });

  return aggregated;
}

function buildRecentReads({ items, products, config, inventoryId, limit = 5 }) {
  const productMap = new Map(
    products.map((product) => [product.codigo || product.codigo_barras || "", product])
  );

  return items
    .filter((item) => item.id_inventario === inventoryId)
    .map((item) => {
      const product = productMap.get(item.id_produto) || null;
      return {
        id: item.id,
        id_produto: String(item.id_produto ?? ""),
        id_inventario: String(item.id_inventario ?? ""),
        created_at: getEventTimestamp(item),
        produto: product,
        preco_unitario: getPriceSnapshot(item, product, config),
      };
    })
    .filter((item) => item.created_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

function buildReadEvent({ product, inventoryId, config }) {
  const productId = product.codigo || product.codigo_barras;
  const createdAt = new Date().toISOString();
  return {
    id: `read_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
    id_produto: productId,
    id_inventario: inventoryId,
    quantidade: 1,
    created_at: createdAt,
    last_read: createdAt,
    qtd_sistema: safeNumber(product.quantidade, 0),
    preco_unitario: getPriceSnapshot({}, product, config),
  };
}

module.exports = {
  aggregateInventoryItems,
  buildRecentReads,
  buildReadEvent,
};
