const {
  readInventoryPeriods,
  writeInventoryPeriods,
  readProducts,
  readProductInventory,
  readConfig,
} = require("../utils/storage");
const { parseInventoryPeriodInput, buildNextInventoryId } = require("../utils/inventory");
const { buildListResponse } = require("../utils/pagination");
const ExcelJS = require("exceljs");
const { aggregateInventoryItems } = require("../utils/inventoryAggregation");

function listInventarios(req, res) {
  const periods = readInventoryPeriods();
  const statusFilter = String(req.query.status ?? req.query.estado ?? "").trim().toLowerCase();
  const produtoFilter = String(req.query.produto ?? req.query.product ?? "").trim().toLowerCase();
  const inicioRaw = req.query.inicio ?? req.query.data_inicio ?? req.query.start ?? "";
  const fimRaw = req.query.fim ?? req.query.data_fim ?? req.query.end ?? "";
  const inicioFilter = inicioRaw ? new Date(inicioRaw) : null;
  const fimFilter = fimRaw ? new Date(fimRaw) : null;
  const sortBy = String(req.query.sort_by ?? req.query.sortBy ?? "inicio").trim().toLowerCase();
  const sortDir = String(req.query.sort_dir ?? req.query.sortDir ?? "desc").trim().toLowerCase();
  const direction = sortDir === "asc" ? 1 : -1;

  const hasValidInicio = inicioFilter && !Number.isNaN(inicioFilter.getTime());
  const hasValidFim = fimFilter && !Number.isNaN(fimFilter.getTime());

  const productInventory = readProductInventory();
  const totalsByInventory = productInventory.reduce((acc, item) => {
    const current = acc.get(item.id_inventario) ?? 0;
    const increment = Number(item.quantidade ?? 1) || 1;
    acc.set(item.id_inventario, current + increment);
    return acc;
  }, new Map());

  let allowedByProduct = null;
  if (produtoFilter) {
    const products = readProducts();
    const productsById = new Map(
      products.map((item) => [item.codigo || item.codigo_barras || "", item])
    );
    allowedByProduct = new Set();
    productInventory.forEach((item) => {
      const product = productsById.get(item.id_produto);
      const codigo = String(product?.codigo ?? "").toLowerCase();
      const codigoBarras = String(product?.codigo_barras ?? "").toLowerCase();
      const nome = String(product?.nome ?? "").toLowerCase();
      if (
        codigo.includes(produtoFilter) ||
        codigoBarras.includes(produtoFilter) ||
        nome.includes(produtoFilter)
      ) {
        allowedByProduct.add(item.id_inventario);
      }
    });
  }

  let filtered = periods.filter((item) => {
    if (statusFilter && String(item.status ?? "").toLowerCase() !== statusFilter) {
      return false;
    }
    if (hasValidInicio) {
      const inicioDate = new Date(item.inicio);
      if (Number.isNaN(inicioDate.getTime()) || inicioDate < inicioFilter) {
        return false;
      }
    }
    if (hasValidFim) {
      const effectiveEnd = item.fim ? new Date(item.fim) : new Date(item.inicio);
      if (Number.isNaN(effectiveEnd.getTime()) || effectiveEnd > fimFilter) {
        return false;
      }
    }
    if (allowedByProduct && !allowedByProduct.has(item.id)) {
      return false;
    }
    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (sortBy === "status") {
      return String(a.status ?? "").localeCompare(String(b.status ?? "")) * direction;
    }
    if (sortBy === "quantidade") {
      const aTotal = totalsByInventory.get(a.id) ?? 0;
      const bTotal = totalsByInventory.get(b.id) ?? 0;
      return (aTotal - bTotal) * direction;
    }
    const aDate = new Date(a.inicio).getTime();
    const bDate = new Date(b.inicio).getTime();
    return (aDate - bDate) * direction;
  });

  const listResponse = buildListResponse(filtered, req.query, {});
  if (listResponse.response) {
    return res.json(listResponse.response);
  }
  res.json(listResponse.pagedItems);
}

function getInventario(req, res) {
  const periods = readInventoryPeriods();
  const period = periods.find((item) => item.id === req.params.id);
  if (!period) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }
  res.json(period);
}

function createInventario(req, res) {
  const { errors, period } = parseInventoryPeriodInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  const periods = readInventoryPeriods();
  const nextId = buildNextInventoryId(periods);
  const newPeriod = { id: nextId, ...period };
  periods.push(newPeriod);
  writeInventoryPeriods(periods);
  res.status(201).json(newPeriod);
}

function updateInventario(req, res) {
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
}

function deleteInventario(req, res) {
  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const removed = periods.splice(index, 1)[0];
  writeInventoryPeriods(periods);
  res.json(removed);
}

function closeOpenInventario(req, res) {
  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.status === "aberto");
  if (index === -1) {
    return res.status(404).json({ error: "Inventario aberto nao encontrado" });
  }
  const now = new Date().toISOString();
  const updated = {
    ...periods[index],
    status: "fechado",
    fim: now,
  };
  periods[index] = updated;
  writeInventoryPeriods(periods);
  res.json(updated);
}

async function exportInventario(req, res) {
  const periods = readInventoryPeriods();
  const period = periods.find((item) => item.id === req.params.id);
  if (!period) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const products = readProducts();
  const config = readConfig();
  const productInventory = readProductInventory().filter(
    (item) => item.id_inventario === period.id
  );
  const aggregated = aggregateInventoryItems({
    items: productInventory,
    products,
    config,
    inventoryId: period.id,
    includeProduct: false,
  }).filter((item) => Number(item.qtd_conferida ?? item.quantidade ?? 0) > 0);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventario");
  worksheet.columns = [
    { header: "COD", key: "codigo", width: 12 },
    { header: "DESCRICAO", key: "descricao", width: 40 },
    { header: "PRECO UNITARIO", key: "preco_unitario", width: 16 },
    { header: "QTD SISTEMA", key: "qtd_sistema", width: 14 },
    { header: "QTD CONFERIDA", key: "qtd_conferida", width: 16 },
    { header: "AJUSTE", key: "ajuste", width: 10 },
    { header: "VALOR SISTEMA", key: "valor_sistema", width: 16 },
    { header: "VALOR CONFERIDO", key: "valor_conferido", width: 18 },
    { header: "DIFERENCA (R$)", key: "diferenca", width: 16 },
  ];

  const productsById = new Map(
    products.map((item) => [item.codigo || item.codigo_barras || "", item])
  );

  const rows = aggregated.map((item) => {
    const product = productsById.get(item.id_produto);
    return {
      codigo: String(product?.codigo || item.id_produto || ""),
      descricao: product?.nome ?? "",
      preco_unitario: Number(item.preco_unitario ?? 0),
      qtd_sistema: Number(item.qtd_sistema ?? 0),
      qtd_conferida: Number(item.qtd_conferida ?? item.quantidade ?? 0),
      ajuste: Number(item.ajuste ?? 0),
      valor_sistema: Number(item.valor_sistema ?? 0),
      valor_conferido: Number(item.valor_conferido ?? 0),
      diferenca: Number(item.diferenca_valor ?? 0),
    };
  });

  rows
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .forEach((row) => worksheet.addRow(row));

  worksheet.getColumn("preco_unitario").numFmt = "R$ #,##0.00";
  worksheet.getColumn("valor_sistema").numFmt = "R$ #,##0.00";
  worksheet.getColumn("valor_conferido").numFmt = "R$ #,##0.00";
  worksheet.getColumn("diferenca").numFmt = "R$ #,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const safeId = period.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="inventario_${safeId}.xlsx"`
  );
  res.send(Buffer.from(buffer));
}

module.exports = {
  listInventarios,
  getInventario,
  createInventario,
  updateInventario,
  deleteInventario,
  closeOpenInventario,
  exportInventario,
};
