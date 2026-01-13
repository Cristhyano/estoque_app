const pdfParse = require("pdf-parse");
const {
  parseProductInput,
  parseProductsFromPdfText,
  parsePtBrDecimalToInteger,
  normalizeCodigoFields,
  getImportLookupKey,
  getCodigoFromNome,
} = require("../utils/products");
const { readConfig, readProducts, writeProducts } = require("../utils/storage");

function normalizeName(nome) {
  return String(nome ?? "")
    .trim()
    .replace(/^\d+\s*/, "")
    .toLowerCase();
}

async function importProductsFromPdfBuffer(pdfBuffer) {
  const config = readConfig();
  let parsed;
  try {
    parsed = await pdfParse(pdfBuffer);
  } catch (error) {
    throw new Error("Falha ao ler PDF");
  }

  const { products: parsedProducts, skipped: skippedInvalid } =
    parseProductsFromPdfText(parsed.text, config);
  const products = readProducts();
  const indexByKey = new Map();
  const indexByName = new Map();
  products.forEach((item, index) => {
    if (item.codigo) indexByKey.set(`codigo:${item.codigo}`, index);
    if (item.codigo_barras) indexByKey.set(`barras:${item.codigo_barras}`, index);
    const nameKey = normalizeName(item.nome);
    if (nameKey) indexByName.set(nameKey, index);
  });
  const seenKeys = new Set();
  const seenNames = new Set();

  let created = 0;
  let updated = 0;
  let skipped = skippedInvalid;

  for (const product of parsedProducts) {
    if (!product.codigo) {
      const codigoFromNome = getCodigoFromNome(product.nome);
      if (codigoFromNome) {
        product.codigo = codigoFromNome;
      }
    }
    const nameKey = normalizeName(product.nome);
    if (nameKey && indexByName.has(nameKey)) {
      if (seenNames.has(nameKey)) {
        skipped += 1;
        continue;
      }
      const existingIndex = indexByName.get(nameKey);
      const existing = products[existingIndex];
      const merged = {
        ...existing,
        codigo: product.codigo || existing.codigo,
        codigo_barras: product.codigo_barras || existing.codigo_barras,
      };
      products[existingIndex] = merged;
      if (merged.codigo) {
        indexByKey.set(`codigo:${merged.codigo}`, existingIndex);
      }
      if (merged.codigo_barras) {
        indexByKey.set(`barras:${merged.codigo_barras}`, existingIndex);
      }
      updated += 1;
      seenNames.add(nameKey);
      continue;
    }

    const lookupKey = getImportLookupKey(indexByKey, product);

    if (!lookupKey) {
      skipped += 1;
      continue;
    }

    if (seenKeys.has(lookupKey)) {
      skipped += 1;
      continue;
    }

    const existingIndex = indexByKey.get(lookupKey);
    if (existingIndex === undefined) {
      products.push(product);
      const newIndex = products.length - 1;
      if (product.codigo) {
        indexByKey.set(`codigo:${product.codigo}`, newIndex);
      }
      if (product.codigo_barras) {
        indexByKey.set(`barras:${product.codigo_barras}`, newIndex);
      }
      if (nameKey) {
        indexByName.set(nameKey, newIndex);
      }
      created += 1;
    } else {
      products[existingIndex] = product;
      if (nameKey) {
        indexByName.set(nameKey, existingIndex);
      }
      updated += 1;
    }
    seenKeys.add(lookupKey);
  }

  writeProducts(products);
  return { created, updated, skipped };
}

function importInventarioFromCsvContent(content) {
  const config = readConfig();
  const products = readProducts();
  const indexByKey = new Map();
  const indexByName = new Map();
  products.forEach((item, index) => {
    if (item.codigo) indexByKey.set(`codigo:${item.codigo}`, index);
    if (item.codigo_barras) indexByKey.set(`barras:${item.codigo_barras}`, index);
    const nameKey = normalizeName(item.nome);
    if (nameKey) indexByName.set(nameKey, index);
  });

  const lines = content.split(/\r?\n/);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(";");
    if (cols.length < 7) {
      skipped += 1;
      continue;
    }


    const codigoRaw = String(cols[1] ?? "").trim();
    const nome = String(cols[3] ?? "").trim();
    const { codigo, codigo_barras } = normalizeCodigoFields(codigoRaw, "");
    const quantidade = Number(String(cols[5] ?? "").replace(",", "."));
    const preco_unitario = parsePtBrDecimalToInteger(
      cols[6],
      config.fator_conversao
    );
    if (preco_unitario === null) {
      skipped += 1;
      continue;
    }

    const { errors, product } = parseProductInput({
      codigo,
      codigo_barras,
      nome,
      quantidade,
      preco_unitario,
    });

    if (errors.length) {
      skipped += 1;
      continue;
    }

    const nameKey = normalizeName(product.nome);
    if (nameKey && indexByName.has(nameKey)) {
      const existingIndex = indexByName.get(nameKey);
      const existing = products[existingIndex];
      const merged = {
        ...product,
        codigo_barras: existing.codigo_barras || product.codigo_barras,
      };
      products[existingIndex] = merged;
      if (merged.codigo) {
        indexByKey.set(`codigo:${merged.codigo}`, existingIndex);
      }
      if (merged.codigo_barras) {
        indexByKey.set(`barras:${merged.codigo_barras}`, existingIndex);
      }
      updated += 1;
      continue;
    }

    const lookupKey = getImportLookupKey(indexByKey, product);
    if (!lookupKey) {
      skipped += 1;
      continue;
    }

    const existingIndex = indexByKey.get(lookupKey);
    if (existingIndex === undefined) {
      products.push(product);
      const newIndex = products.length - 1;
      if (product.codigo) {
        indexByKey.set(`codigo:${product.codigo}`, newIndex);
      }
      if (product.codigo_barras) {
        indexByKey.set(`barras:${product.codigo_barras}`, newIndex);
      }
      if (nameKey) {
        indexByName.set(nameKey, newIndex);
      }
      created += 1;
    } else {
      products[existingIndex] = product;
      if (nameKey) {
        indexByName.set(nameKey, existingIndex);
      }
      updated += 1;
    }
  }

  writeProducts(products);
  return { created, updated, skipped };
}

module.exports = {
  importProductsFromPdfBuffer,
  importInventarioFromCsvContent,
};
