CREATE UNIQUE INDEX IF NOT EXISTS idx_products_codigo_barras_unique
ON products (codigo_barras)
WHERE codigo_barras IS NOT NULL AND codigo_barras <> '';
