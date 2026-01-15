const {
  readInventoryPeriods,
  writeInventoryPeriods,
  readProducts,
  readProductInventory,
  writeProductInventory,
  readConfig,
} = require("../utils/storage");
const { parseInventoryPeriodInput, buildNextInventoryId } = require("../utils/inventory");
const { buildListResponse } = require("../utils/pagination");
const ExcelJS = require("exceljs");
const { aggregateInventoryItems, buildReadEvent } = require("../utils/inventoryAggregation");
const { logEvent } = require("../utils/events");
const MAX_INVENTORY_NAME = 100;

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseIntegerValue(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.floor(value);
  }
  const normalized = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function buildImportInventoryName() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 16);
  return `Inventario importado - ${date} ${time}`;
}

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
  logEvent("inventario_created", { inventario: newPeriod });
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
  logEvent("inventario_updated", { inventario: updated });
  res.json(updated);
}

function updateInventarioNome(req, res) {
  if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, "nome")) {
    return res.status(400).json({ error: "Nome nao informado" });
  }

  const nomeRaw = req.body.nome;
  if (nomeRaw !== null && nomeRaw !== undefined && typeof nomeRaw !== "string") {
    return res.status(400).json({ error: "Nome invalido" });
  }

  const trimmed = String(nomeRaw ?? "").trim();
  if (trimmed && trimmed.length > MAX_INVENTORY_NAME) {
    return res.status(400).json({ error: "Nome excede o limite" });
  }

  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const nextName = trimmed ? trimmed : null;
  const updated = {
    ...periods[index],
    nome: nextName,
  };
  periods[index] = updated;
  writeInventoryPeriods(periods);
  logEvent("inventario_nome_updated", { inventario: updated });
  res.json(updated);
}

async function importInventarioXlsx(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Arquivo nao informado" });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch (error) {
    return res.status(400).json({ error: "Arquivo invalido" });
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return res.status(400).json({ error: "Planilha nao encontrada" });
  }

  let headerRowIndex = null;
  let headerMap = {};
  const maxScanRows = Math.min(worksheet.rowCount, 15);
  for (let rowIndex = 1; rowIndex <= maxScanRows; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const headersByName = {};
    row.eachCell((cell, colNumber) => {
      const normalized = normalizeHeader(cell.value);
      if (normalized) {
        headersByName[normalized] = colNumber;
      }
    });
    const codigoColumn = headersByName["COD"];
    const qtdColumn = headersByName["QTD CONFERIDA"];
    if (codigoColumn && qtdColumn) {
      headerRowIndex = rowIndex;
      headerMap = {
        codigo: codigoColumn,
        descricao: headersByName["DESCRICAO"],
        preco: headersByName["PRECO UNITARIO"],
        qtdSistema: headersByName["QTD SISTEMA"],
        qtdConferida: qtdColumn,
      };
      break;
    }
  }

  if (!headerRowIndex) {
    return res.status(400).json({ error: "Cabecalho invalido" });
  }

  const errors = [];
  const quantitiesByCode = new Map();
  const lastRow = worksheet.rowCount;
  for (let rowIndex = headerRowIndex + 1; rowIndex <= lastRow; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    if (!row || row.cellCount === 0) continue;

    const codigoRaw = row.getCell(headerMap.codigo).value;
    const codigo = String(codigoRaw ?? "").trim();
    if (!codigo) {
      continue;
    }

    const qtdRaw = row.getCell(headerMap.qtdConferida).value;
    const qtdConferida = parseIntegerValue(qtdRaw);
    if (qtdConferida === null || qtdConferida < 0) {
      errors.push({ linha: rowIndex, codigo, erro: "Qtd conferida invalida" });
      continue;
    }
    if (qtdConferida === 0) {
      continue;
    }

    const current = quantitiesByCode.get(codigo) ?? 0;
    quantitiesByCode.set(codigo, current + qtdConferida);
  }

  if (quantitiesByCode.size === 0) {
    return res.status(400).json({
      error: "Nenhuma leitura valida encontrada",
      errors,
    });
  }

  const periods = readInventoryPeriods();
  const inventoryIdRaw = String(
    req.body?.inventario_id ?? req.body?.inventarioId ?? ""
  ).trim();
  let inventory = inventoryIdRaw
    ? periods.find((item) => item.id === inventoryIdRaw)
    : null;

  if (inventoryIdRaw && !inventory) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  if (inventory && inventory.status !== "aberto") {
    return res.status(400).json({ error: "Inventario fechado" });
  }

  if (!inventory) {
    const now = new Date().toISOString();
    inventory = {
      id: buildNextInventoryId(periods),
      nome: buildImportInventoryName(),
      inicio: now,
      fim: null,
      status: "aberto",
    };
    periods.push(inventory);
    writeInventoryPeriods(periods);
    logEvent("inventario_created", { inventario: inventory, origem: "import" });
  }

  const products = readProducts();
  const config = readConfig();
  const existingReads = readProductInventory();
  const readsToInsert = [];
  const errorsByProduct = [];
  let totalProdutos = 0;
  let totalLeituras = 0;
  let sequence = 0;
  const baseTime = Date.now();

  quantitiesByCode.forEach((qtdConferida, codigo) => {
    const product =
      products.find((item) => item.codigo === codigo) ||
      products.find((item) => item.codigo_barras === codigo) ||
      null;
    if (!product) {
      errorsByProduct.push({ codigo, erro: "Produto nao encontrado" });
      return;
    }

    totalProdutos += 1;
    totalLeituras += qtdConferida;
    for (let i = 0; i < qtdConferida; i += 1) {
      const readEvent = buildReadEvent({
        product,
        inventoryId: inventory.id,
        config,
      });
      const timestamp = new Date(baseTime + sequence * 1000).toISOString();
      sequence += 1;
      readsToInsert.push({
        ...readEvent,
        created_at: timestamp,
        last_read: timestamp,
        id: `import_${Date.now()}_${sequence}_${Math.floor(Math.random() * 1000000)}`,
      });
    }
  });

  const allErrors = [...errors, ...errorsByProduct];

  if (readsToInsert.length === 0) {
    return res.status(400).json({
      error: "Nenhuma leitura valida encontrada",
      errors: allErrors,
    });
  }

  writeProductInventory([...existingReads, ...readsToInsert]);
  logEvent("inventario_imported", {
    inventario_id: inventory.id,
    total_produtos: totalProdutos,
    total_leituras: totalLeituras,
  });

  res.json({
    inventario: inventory,
    total_produtos: totalProdutos,
    total_leituras: totalLeituras,
    errors: allErrors,
  });
}

function deleteInventario(req, res) {
  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }

  const removed = periods.splice(index, 1)[0];
  writeInventoryPeriods(periods);
  logEvent("inventario_deleted", { inventario: removed });
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
  logEvent("inventario_closed", { inventario: updated });
  res.json(updated);
}

function closeInventario(req, res) {
  const inventoryId = String(req.params.id ?? "").trim();
  if (!inventoryId) {
    return res.status(400).json({ error: "Inventario invalido" });
  }

  const periods = readInventoryPeriods();
  const index = periods.findIndex((item) => item.id === inventoryId);
  if (index === -1) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }
  if (periods[index].status !== "aberto") {
    return res.status(400).json({ error: "Inventario fechado" });
  }

  const now = new Date().toISOString();
  const updated = {
    ...periods[index],
    status: "fechado",
    fim: now,
  };
  periods[index] = updated;
  writeInventoryPeriods(periods);
  logEvent("inventario_closed", { inventario: updated });
  res.json(updated);
}

function mergeInventarios(req, res) {
  const fromId = String(req.body?.fromInventarioId ?? "").trim();
  const toId = String(req.body?.toInventarioId ?? "").trim();

  if (!fromId || !toId) {
    return res.status(400).json({ error: "Inventarios invalidos" });
  }
  if (fromId === toId) {
    return res.status(400).json({ error: "Inventarios iguais" });
  }

  const periods = readInventoryPeriods();
  const fromInventory = periods.find((item) => item.id === fromId);
  const toInventory = periods.find((item) => item.id === toId);
  if (!fromInventory || !toInventory) {
    return res.status(404).json({ error: "Inventario nao encontrado" });
  }
  if (fromInventory.status !== "aberto" || toInventory.status !== "aberto") {
    return res.status(400).json({ error: "Inventario fechado" });
  }

  const items = readProductInventory();
  let moved = 0;
  const updatedItems = items.map((item) => {
    if (item.id_inventario === fromId) {
      moved += 1;
      return { ...item, id_inventario: toId };
    }
    return item;
  });

  writeProductInventory(updatedItems);
  logEvent("inventario_merged", { from: fromId, to: toId, moved });

  res.json({
    from: fromInventory,
    to: toInventory,
    moved,
  });
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
    { key: "codigo", width: 12 },
    { key: "descricao", width: 40 },
    { key: "preco_unitario", width: 16 },
    { key: "qtd_sistema", width: 14 },
    { key: "qtd_conferida", width: 16 },
    { key: "ajuste", width: 10 },
    { key: "valor_sistema", width: 16 },
    { key: "valor_conferido", width: 18 },
    { key: "diferenca", width: 16 },
  ];
  const inventoryName = period.nome ? String(period.nome) : "Inventario sem nome";
  worksheet.addRow(["Inventario", inventoryName]);
  worksheet.addRow([]);
  worksheet.addRow([
    "COD",
    "DESCRICAO",
    "PRECO UNITARIO",
    "QTD SISTEMA",
    "QTD CONFERIDA",
    "AJUSTE",
    "VALOR SISTEMA",
    "VALOR CONFERIDO",
    "DIFERENCA (R$)",
  ]);

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
  updateInventarioNome,
  importInventarioXlsx,
  mergeInventarios,
  deleteInventario,
  closeInventario,
  closeOpenInventario,
  exportInventario,
};
