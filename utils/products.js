function toDecimalValue(preco_unitario, fator_conversao) {
  return preco_unitario / fator_conversao;
}

function withDecimalValue(product, config) {
  return {
    ...product,
    preco_decimal: toDecimalValue(product.preco_unitario, config.fator_conversao),
  };
}

function computeProductTotals(products, config) {
  const totals = products.reduce(
    (acc, item) => {
      acc.quantidade += item.quantidade;
      acc.preco_unitario += item.preco_unitario;
      return acc;
    },
    { quantidade: 0, preco_unitario: 0 }
  );
  return {
    ...totals,
    preco_decimal: toDecimalValue(totals.preco_unitario, config.fator_conversao),
  };
}

function applyProductFilters(products, query) {
  let result = products;

  const codigo = String(query.codigo ?? "").trim();
  if (codigo) {
    result = result.filter((item) => item.codigo === codigo);
  }

  const codigoBarras = String(query.codigo_barras ?? query.codigoBarras ?? "").trim();
  if (codigoBarras) {
    result = result.filter((item) => item.codigo_barras === codigoBarras);
  }

  const nome = String(query.nome ?? "").trim().toLowerCase();
  if (nome) {
    result = result.filter((item) => item.nome.toLowerCase().includes(nome));
  }

  const quantidadeMin = Number(query.quantidade_min);
  if (Number.isFinite(quantidadeMin)) {
    result = result.filter((item) => item.quantidade >= quantidadeMin);
  }

  const quantidadeMax = Number(query.quantidade_max);
  if (Number.isFinite(quantidadeMax)) {
    result = result.filter((item) => item.quantidade <= quantidadeMax);
  }

  const precoMin = Number(query.preco_min);
  if (Number.isFinite(precoMin)) {
    result = result.filter((item) => item.preco_unitario >= precoMin);
  }

  const precoMax = Number(query.preco_max);
  if (Number.isFinite(precoMax)) {
    result = result.filter((item) => item.preco_unitario <= precoMax);
  }

  return result;
}

function parsePtBrDecimalToInteger(value, fator) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  return Math.round(numberValue * fator);
}

function normalizeCodigoFields(codigoRaw, codigoBarrasRaw) {
  const codigo = String(codigoRaw ?? "").trim();
  const codigo_barras = String(codigoBarrasRaw ?? "").trim();
  if (codigo && codigo.length > 5 && !codigo_barras) {
    return { codigo: "", codigo_barras: codigo };
  }
  return { codigo, codigo_barras };
}

function getCodigoFromNome(nome) {
  const match = String(nome ?? "")
    .trim()
    .match(/^(\d{1,5})\b/);
  if (!match) return "";
  return match[1].replace(/^0+/, "") || "";
}

function getImportLookupKey(indexByKey, product) {
  if (product.codigo) {
    return `codigo:${product.codigo}`;
  }
  if (product.codigo_barras) {
    const codigoFromNome = getCodigoFromNome(product.nome);
    if (codigoFromNome) {
      const nameKey = `codigo:${codigoFromNome}`;
      if (indexByKey.has(nameKey)) return nameKey;
    }
    const barcodeKey = `barras:${product.codigo_barras}`;
    if (indexByKey.has(barcodeKey)) return barcodeKey;
    const legacyKey = `codigo:${product.codigo_barras}`;
    if (indexByKey.has(legacyKey)) return legacyKey;
    return barcodeKey;
  }
  return "";
}

function parseProductInput(body) {
  const codeRaw = body.codigo ?? body.code ?? "";
  const barcodeRaw = body.codigo_barras ?? body.codigoBarras ?? body.barcode ?? "";
  const nameRaw = body.nome ?? body.name ?? "";
  const quantityRaw = body.quantidade ?? body.quantity;
  const priceRaw =
    body.preco_unitario ?? body.precoUnitario ?? body.preco ?? body.unitPrice;

  const { codigo, codigo_barras } = normalizeCodigoFields(codeRaw, barcodeRaw);
  const nome = String(nameRaw).trim();
  const quantidade = Number(quantityRaw);
  const preco_unitario = Number(priceRaw);

  const errors = [];
  if (!codigo && !codigo_barras) errors.push("codigo");
  if (!nome) errors.push("nome");
  if (!Number.isFinite(quantidade) || quantidade < 0) errors.push("quantidade");
  if (!Number.isFinite(preco_unitario) || preco_unitario < 0)
    errors.push("preco_unitario");
  if (!Number.isInteger(preco_unitario)) errors.push("preco_unitario");

  return {
    errors,
    product: { codigo, codigo_barras, nome, quantidade, preco_unitario },
  };
}

function parseProductsFromPdfText(text, config) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const products = [];
  let skipped = 0;
  let headerFound = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("codigo") &&
      lower.includes("nome") &&
      lower.includes("quantidade")
    ) {
      headerFound = true;
      continue;
    }

    if (!headerFound && !/^[a-z0-9]/i.test(line)) {
      continue;
    }

    let columns = line.split(/\s{2,}|\t/).filter(Boolean);
    if (columns.length < 4) {
      const tokens = line.split(/\s+/).filter(Boolean);
      if (tokens.length >= 4) {
        columns = tokens;
      } else {
        if (headerFound) skipped += 1;
        continue;
      }
    }

    const codigoRaw = String(columns[0] ?? "").trim();
    const precoRaw = columns[columns.length - 1];
    const quantidadeRaw = columns[columns.length - 2];
    const nome = columns.slice(1, -2).join(" ").trim();
    const codigoFromNome = getCodigoFromNome(nome);
    const codigo =
      codigoFromNome || (codigoRaw.length > 0 && codigoRaw.length <= 5 ? codigoRaw : "");
    const codigo_barras = codigoRaw.length > 5 ? codigoRaw : "";

    const quantidade = Number(
      String(quantidadeRaw ?? "").replace(/\./g, "").replace(",", ".")
    );
    const precoParsed = parsePtBrDecimalToInteger(
      precoRaw,
      config.fator_conversao
    );
    const preco_unitario = precoParsed === null ? NaN : precoParsed;

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

    products.push(product);
  }

  return { products, skipped };
}

module.exports = {
  toDecimalValue,
  withDecimalValue,
  computeProductTotals,
  applyProductFilters,
  parsePtBrDecimalToInteger,
  normalizeCodigoFields,
  getCodigoFromNome,
  getImportLookupKey,
  parseProductInput,
  parseProductsFromPdfText,
};
