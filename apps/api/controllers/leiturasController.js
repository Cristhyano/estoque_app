const {
  readInventoryPeriods,
  readProductInventory,
  writeProductInventory,
  readProducts,
  readConfig,
} = require("../utils/storage");
const { getOpenInventory } = require("../utils/inventory");
const {
  aggregateInventoryItems,
  buildRecentReads,
} = require("../utils/inventoryAggregation");

function getInventoryById(periods, inventoryId) {
  return periods.find((item) => item.id === inventoryId) || null;
}

function resolveInventoryId({ periods, providedId }) {
  if (providedId) {
    return providedId;
  }
  const open = getOpenInventory(periods);
  return open?.id || "";
}

function parseQuantidadeParam(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function sortByReadTimestampDesc(a, b) {
  const aTime = a.created_at || a.last_read || "";
  const bTime = b.created_at || b.last_read || "";
  return String(bTime).localeCompare(String(aTime));
}

function deleteLeitura(req, res) {
  const leituraId = String(req.params.id ?? "").trim();
  if (!leituraId) {
    return res.status(400).json({ error: "Leitura invalida" });
  }

  const quantidade = parseQuantidadeParam(req.query.quantidade ?? 1);
  if (!quantidade) {
    return res.status(400).json({ error: "Quantidade invalida" });
  }

  const items = readProductInventory();
  const itemIndex = items.findIndex((item) => item.id === leituraId);
  let inventoryId = "";
  let removedCount = 0;
  let remaining = items;

  if (itemIndex >= 0) {
    if (quantidade !== 1) {
      return res.status(400).json({ error: "Quantidade invalida" });
    }
    const removed = items[itemIndex];
    inventoryId = String(removed.id_inventario ?? "");
    remaining = items.filter((item) => item.id !== leituraId);
    removedCount = 1;
  } else {
    const periods = readInventoryPeriods();
    inventoryId = resolveInventoryId({
      periods,
      providedId: String(req.query.inventario_id ?? req.query.inventarioId ?? "").trim(),
    });
    if (!inventoryId) {
      return res.status(404).json({ error: "Inventario nao encontrado" });
    }
    const matching = items
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          item.id_inventario === inventoryId &&
          String(item.id_produto ?? "") === leituraId
      )
      .sort((a, b) => sortByReadTimestampDesc(a.item, b.item));
    if (matching.length === 0) {
      return res.status(404).json({ error: "Leitura nao encontrada" });
    }
    if (quantidade > matching.length) {
      return res.status(400).json({ error: "Quantidade invalida" });
    }
    const toRemove = new Set(
      matching.slice(0, quantidade).map(({ index }) => index)
    );
    remaining = items.filter((_, index) => !toRemove.has(index));
    removedCount = toRemove.size;
  }

  writeProductInventory(remaining);

  const periods = readInventoryPeriods();
  const inventory = getInventoryById(periods, inventoryId);
  const products = readProducts();
  const config = readConfig();
  const itemsForInventory = remaining.filter(
    (item) => item.id_inventario === inventoryId
  );
  const aggregated = aggregateInventoryItems({
    items: itemsForInventory,
    products,
    config,
    inventoryId,
    includeProduct: true,
  });
  const recent_reads = buildRecentReads({
    items: itemsForInventory,
    products,
    config,
    inventoryId,
    limit: 5,
  });

  res.json({
    removed: removedCount,
    inventario: inventory,
    items: aggregated,
    recent_reads,
  });
}

module.exports = {
  deleteLeitura,
};
