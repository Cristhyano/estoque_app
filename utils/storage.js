const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "..");
const dataDir = path.join(baseDir, "data");
const dataFile = path.join(dataDir, "products.json");
const configFile = path.join(dataDir, "config.json");
const inventoryPeriodsFile = path.join(dataDir, "inventarios.json");
const productInventoryFile = path.join(dataDir, "produto_inventario.json");

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
  if (!fs.existsSync(productInventoryFile)) {
    fs.writeFileSync(productInventoryFile, "[]", "utf8");
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

function readProductInventory() {
  ensureDataFile();
  const raw = fs.readFileSync(productInventoryFile, "utf8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeProductInventory(items) {
  fs.writeFileSync(productInventoryFile, JSON.stringify(items, null, 2), "utf8");
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

module.exports = {
  ensureDataFile,
  readProducts,
  writeProducts,
  readInventoryPeriods,
  writeInventoryPeriods,
  readProductInventory,
  writeProductInventory,
  readConfig,
  writeConfig,
};
