const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const db = require("./db");
const { runMigrations } = require("./migrations");

const baseDir = path.join(__dirname, "..");
const defaultSeedDir = path.join(baseDir, "data");
const dataDir = process.env.ESTOQUE_DATA_DIR
  ? path.resolve(process.env.ESTOQUE_DATA_DIR)
  : defaultSeedDir;
const dataFile = path.join(dataDir, "products.json");
const configFile = path.join(dataDir, "config.json");
const inventoryPeriodsFile = path.join(dataDir, "inventarios.json");
const productInventoryFile = path.join(dataDir, "produto_inventario.json");

let initialized = false;

function readJsonFile(filePath, fallback, seedFallbackPath) {
  let targetPath = filePath;
  if (!fs.existsSync(targetPath) && seedFallbackPath && fs.existsSync(seedFallbackPath)) {
    targetPath = seedFallbackPath;
  }
  if (!fs.existsSync(targetPath)) return fallback;
  const raw = fs.readFileSync(targetPath, "utf8");
  try {
    const data = JSON.parse(raw);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function initStorage() {
  if (initialized) return;
  runMigrations();
  seedFromJson();
  initialized = true;
}

function seedFromJson() {
  const productCount = db.prepare("SELECT COUNT(*) as total FROM products").get().total;
  if (productCount === 0) {
    const products = readJsonFile(
      dataFile,
      [],
      path.join(defaultSeedDir, "products.json")
    );
    if (Array.isArray(products) && products.length > 0) {
      const insert = db.prepare(
        "INSERT INTO products (codigo, codigo_barras, nome, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)"
      );
      const transaction = db.transaction((rows) => {
        rows.forEach((item) => {
          insert.run(
            String(item.codigo ?? ""),
            String(item.codigo_barras ?? ""),
            String(item.nome ?? ""),
            Number(item.quantidade ?? 0),
            Number(item.preco_unitario ?? 0)
          );
        });
      });
      transaction(products);
    }
  }

  const inventoryCount = db.prepare("SELECT COUNT(*) as total FROM inventarios").get().total;
  if (inventoryCount === 0) {
    const periods = readJsonFile(
      inventoryPeriodsFile,
      [],
      path.join(defaultSeedDir, "inventarios.json")
    );
    if (Array.isArray(periods) && periods.length > 0) {
      const insert = db.prepare(
        "INSERT INTO inventarios (id, nome, inicio, fim, status) VALUES (?, ?, ?, ?, ?)"
      );
      const transaction = db.transaction((rows) => {
        rows.forEach((item) => {
          insert.run(
            String(item.id ?? ""),
            item.nome ?? null,
            String(item.inicio ?? ""),
            item.fim ?? null,
            String(item.status ?? "")
          );
        });
      });
      transaction(periods);
    }
  }

  const readsCount = db.prepare("SELECT COUNT(*) as total FROM produto_inventario").get().total;
  if (readsCount === 0) {
    const reads = readJsonFile(
      productInventoryFile,
      [],
      path.join(defaultSeedDir, "produto_inventario.json")
    );
    if (Array.isArray(reads) && reads.length > 0) {
      const insert = db.prepare(
        "INSERT INTO produto_inventario (id, id_produto, id_inventario, quantidade, created_at, last_read, qtd_sistema, preco_unitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const transaction = db.transaction((rows) => {
        rows.forEach((item) => {
          insert.run(
            String(item.id ?? randomUUID()),
            String(item.id_produto ?? ""),
            String(item.id_inventario ?? ""),
            Number(item.quantidade ?? 0),
            item.created_at ?? null,
            item.last_read ?? null,
            Number(item.qtd_sistema ?? 0),
            Number(item.preco_unitario ?? 0)
          );
        });
      });
      transaction(reads);
    }
  }

  const configRow = db.prepare("SELECT value FROM config WHERE key = 'fator_conversao'").get();
  if (!configRow) {
    const configData = readJsonFile(
      configFile,
      {},
      path.join(defaultSeedDir, "config.json")
    );
    const value = Number(configData?.fator_conversao ?? 100);
    db.prepare("INSERT INTO config (key, value) VALUES ('fator_conversao', ?)").run(
      String(Number.isFinite(value) && value > 0 ? value : 100)
    );
  }
}

function readProducts() {
  initStorage();
  return db.prepare("SELECT * FROM products").all();
}

function writeProducts(products) {
  initStorage();
  const clear = db.prepare("DELETE FROM products");
  const insert = db.prepare(
    "INSERT INTO products (codigo, codigo_barras, nome, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)"
  );
  const transaction = db.transaction((rows) => {
    clear.run();
    rows.forEach((item) => {
      insert.run(
        String(item.codigo ?? ""),
        String(item.codigo_barras ?? ""),
        String(item.nome ?? ""),
        Number(item.quantidade ?? 0),
        Number(item.preco_unitario ?? 0)
      );
    });
  });
  transaction(products || []);
}

function readInventoryPeriods() {
  initStorage();
  return db.prepare("SELECT * FROM inventarios").all();
}

function writeInventoryPeriods(periods) {
  initStorage();
  const clear = db.prepare("DELETE FROM inventarios");
  const insert = db.prepare(
    "INSERT INTO inventarios (id, nome, inicio, fim, status) VALUES (?, ?, ?, ?, ?)"
  );
  const transaction = db.transaction((rows) => {
    clear.run();
    rows.forEach((item) => {
      insert.run(
        String(item.id ?? ""),
        item.nome ?? null,
        String(item.inicio ?? ""),
        item.fim ?? null,
        String(item.status ?? "")
      );
    });
  });
  transaction(periods || []);
}

function readProductInventory() {
  initStorage();
  return db.prepare("SELECT * FROM produto_inventario").all();
}

function writeProductInventory(items) {
  initStorage();
  const clear = db.prepare("DELETE FROM produto_inventario");
  const insert = db.prepare(
    "INSERT INTO produto_inventario (id, id_produto, id_inventario, quantidade, created_at, last_read, qtd_sistema, preco_unitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const transaction = db.transaction((rows) => {
    clear.run();
    rows.forEach((item) => {
      insert.run(
        String(item.id ?? randomUUID()),
        String(item.id_produto ?? ""),
        String(item.id_inventario ?? ""),
        Number(item.quantidade ?? 0),
        item.created_at ?? null,
        item.last_read ?? null,
        Number(item.qtd_sistema ?? 0),
        Number(item.preco_unitario ?? 0)
      );
    });
  });
  transaction(items || []);
}

function readConfig() {
  initStorage();
  const row = db.prepare("SELECT value FROM config WHERE key = 'fator_conversao'").get();
  const value = Number(row?.value ?? 100);
  if (!Number.isFinite(value) || value <= 0) {
    return { fator_conversao: 100 };
  }
  return { fator_conversao: value };
}

function writeConfig(config) {
  initStorage();
  const value = Number(config?.fator_conversao ?? 100);
  const normalized = Number.isFinite(value) && value > 0 ? value : 100;
  db.prepare(
    "INSERT INTO config (key, value) VALUES ('fator_conversao', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(String(normalized));
}

module.exports = {
  initStorage,
  readProducts,
  writeProducts,
  readInventoryPeriods,
  writeInventoryPeriods,
  readProductInventory,
  writeProductInventory,
  readConfig,
  writeConfig,
};
