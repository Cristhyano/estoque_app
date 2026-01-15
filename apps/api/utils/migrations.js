const fs = require("fs");
const path = require("path");
const db = require("./db");

const migrationsDir = path.join(__dirname, "..", "migrations");

function ensureMigrationsTable() {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
  );
}

function getAppliedVersions() {
  ensureMigrationsTable();
  const rows = db.prepare("SELECT version FROM schema_migrations").all();
  return new Set(rows.map((row) => Number(row.version)));
}

function parseMigrationVersion(filename) {
  const match = /^([0-9]+)_/.exec(filename);
  if (!match) return null;
  return Number(match[1]);
}

function runMigrations() {
  ensureMigrationsTable();
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const applied = getAppliedVersions();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const insertVersion = db.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)"
  );

  files.forEach((file) => {
    const version = parseMigrationVersion(file);
    if (!version || applied.has(version)) {
      return;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const now = new Date().toISOString();
    const transaction = db.transaction(() => {
      db.exec(sql);
      insertVersion.run(version, now);
    });
    transaction();
  });
}

module.exports = {
  runMigrations,
};
