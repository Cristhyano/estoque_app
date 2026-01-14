const {
  readInventoryPeriods,
  writeInventoryPeriods,
} = require("../utils/storage");
const { parseInventoryPeriodInput, buildNextInventoryId } = require("../utils/inventory");
const { buildListResponse } = require("../utils/pagination");

function listInventarios(req, res) {
  const periods = readInventoryPeriods();
  const listResponse = buildListResponse(periods, req.query, {});
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

module.exports = {
  listInventarios,
  getInventario,
  createInventario,
  updateInventario,
  deleteInventario,
};
