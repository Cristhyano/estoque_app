const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = process.env.ESTOQUE_DATA_DIR
  ? path.resolve(process.env.ESTOQUE_DATA_DIR)
  : path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "estoque.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

module.exports = db;
