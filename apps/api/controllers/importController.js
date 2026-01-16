const fs = require("fs");
const path = require("path");
const {
  importProductsFromPdfBuffer,
  importInventarioFromCsvContent,
} = require("../services/importService");

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const inventoryFile = path.join(__dirname, "..", "..", "resources", "inventario.csv");
const productPdfFile = path.join(
  __dirname,
  "..",
  "..",
  "resources",
  "Listagem do Cadastro de Produtos.PDF"
);

async function importProdutos(req, res) {
  let pdfBuffer = req.file?.buffer;
  if (!pdfBuffer) {
    if (!fs.existsSync(productPdfFile)) {
      return res.status(404).json({ error: "Arquivo PDF nao encontrado" });
    }
    pdfBuffer = fs.readFileSync(productPdfFile);
  }

  try {
    const result = await importProductsFromPdfBuffer(pdfBuffer);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Falha ao ler PDF" });
  }
}

function importInventario(req, res) {
  let content;
  if (req.file?.buffer) {
    content = req.file.buffer.toString("utf8");
  } else {
    if (!fs.existsSync(inventoryFile)) {
      return res.status(404).json({ error: "Arquivo inventario.csv nao encontrado" });
    }
    content = fs.readFileSync(inventoryFile, "utf8");
  }

  const result = importInventarioFromCsvContent(content);
  res.json(result);
}

async function importAutoFromBuffer({ buffer, filename, mimetype }) {
  if (!buffer) {
    throw makeError(400, "Arquivo nao enviado");
  }
  const fileName = String(filename ?? "").toLowerCase();
  const mimeType = String(mimetype ?? "").toLowerCase();

  if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
    try {
      return await importProductsFromPdfBuffer(buffer);
    } catch (error) {
      throw makeError(500, "Falha ao ler PDF");
    }
  }

  if (
    fileName.endsWith(".csv") ||
    mimeType === "text/csv" ||
    mimeType === "text/plain" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    const content = Buffer.from(buffer).toString("utf8");
    return importInventarioFromCsvContent(content);
  }

  throw makeError(400, "Tipo de arquivo nao suportado");
}

async function importAuto(req, res) {
  try {
    const result = await importAutoFromBuffer({
      buffer: req.file?.buffer,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype,
    });
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  importProdutos,
  importInventario,
  importAuto,
  importAutoFromBuffer,
};
