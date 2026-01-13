const pdfParse = require("pdf-parse");
const {
  parseProductInput,
  parseProductsFromPdfText,
  parsePtBrDecimalToInteger,
  normalizeCodigoFields,
  getImportLookupKey,
} = require("../utils/products");
const { readConfig, readProducts, writeProducts } = require("../utils/storage");

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
  products.forEach((item, index) => {
    if (item.codigo) indexByKey.set(`codigo:${item.codigo}`, index);
    if (item.codigo_barras) indexByKey.set(`barras:${item.codigo_barras}`, index);
  });
  const seenKeys = new Set();

  let created = 0;
  let updated = 0;
  let skipped = skippedInvalid;

  for (const product of parsedProducts) {
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
      if (product.codigo) {
        indexByKey.set(`codigo:${product.codigo}`, products.length - 1);
      }
      if (product.codigo_barras) {
        indexByKey.set(`barras:${product.codigo_barras}`, products.length - 1);
      }
      created += 1;
    } else {
      products[existingIndex] = product;
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
  products.forEach((item, index) => {
    if (item.codigo) indexByKey.set(`codigo:${item.codigo}`, index);
    if (item.codigo_barras) indexByKey.set(`barras:${item.codigo_barras}`, index);
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
    if(nome.includes("BARRA DE CHOC. HERSHEYS MEIO AMA"))
        console.log("teste")
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

    const lookupKey = getImportLookupKey(indexByKey, product);
    if (!lookupKey) {
      skipped += 1;
      continue;
    }

    const existingIndex = indexByKey.get(lookupKey);
    if (existingIndex === undefined) {
      products.push(product);
      if (product.codigo) {
        indexByKey.set(`codigo:${product.codigo}`, products.length - 1);
      }
      if (product.codigo_barras) {
        indexByKey.set(`barras:${product.codigo_barras}`, products.length - 1);
      }
      created += 1;
    } else {
      products[existingIndex] = product;
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
