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
const { logEvent } = require("../utils/events");

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

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

function applyLeituraRemove(payload) {
  const leituraId = String(payload.id ?? payload.leitura_id ?? "").trim();
  if (!leituraId) {
    throw makeError(400, "Leitura invalida");
  }

  const quantidade = parseQuantidadeParam(payload.quantidade ?? 1);
  if (!quantidade) {
    throw makeError(400, "Quantidade invalida");
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
      providedId: String(payload.inventario_id ?? payload.inventarioId ?? "").trim(),
    });
    if (!inventoryId) {
      throw makeError(404, "Inventario nao encontrado");
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
      throw makeError(404, "Leitura nao encontrada");
    }
    if (quantidade > matching.length) {
      throw makeError(400, "Quantidade invalida");
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
  logEvent("leitura_removed", {
    inventario_id: inventoryId,
    leitura_id: itemIndex >= 0 ? leituraId : null,
    produto_id: itemIndex >= 0 ? null : leituraId,
    quantidade: removedCount,
  });

  return {
    removed: removedCount,
    inventario: inventory,
    items: aggregated,
    recent_reads,
  };
}

function deleteLeitura(req, res) {
  try {
    const payload = applyLeituraRemove({
      id: req.params.id,
      quantidade: req.query.quantidade,
      inventario_id: req.query.inventario_id ?? req.query.inventarioId,
    });
    res.json(payload);
  } catch (error) {
    const status = error.status || 400;
    res.status(status).json({ error: error.message });
  }
}

module.exports = {
  deleteLeitura,
  applyLeituraRemove,
};
