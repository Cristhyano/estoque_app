CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  codigo TEXT PRIMARY KEY,
  codigo_barras TEXT,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  preco_unitario INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventarios (
  id TEXT PRIMARY KEY,
  nome TEXT,
  inicio TEXT NOT NULL,
  fim TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS produto_inventario (
  id TEXT PRIMARY KEY,
  id_produto TEXT NOT NULL,
  id_inventario TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  last_read TEXT,
  qtd_sistema INTEGER,
  preco_unitario INTEGER
);

CREATE INDEX IF NOT EXISTS idx_produto_inventario_inventario ON produto_inventario (id_inventario);
CREATE INDEX IF NOT EXISTS idx_produto_inventario_produto ON produto_inventario (id_produto);
