const fs = require("fs");
const path = require("path");
const {
  importProductsFromPdfBuffer,
  importInventarioFromCsvContent,
} = require("../services/importService");

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

async function importAuto(req, res) {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: "Arquivo nao enviado" });
  }

  const fileName = String(req.file.originalname ?? "").toLowerCase();
  const mimeType = String(req.file.mimetype ?? "").toLowerCase();

  if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
    try {
      const result = await importProductsFromPdfBuffer(req.file.buffer);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: "Falha ao ler PDF" });
    }
  }

  if (
    fileName.endsWith(".csv") ||
    mimeType === "text/csv" ||
    mimeType === "text/plain" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    const content = req.file.buffer.toString("utf8");
    const result = importInventarioFromCsvContent(content);
    return res.json(result);
  }

  return res.status(400).json({ error: "Tipo de arquivo nao suportado" });
}

module.exports = {
  importProdutos,
  importInventario,
  importAuto,
};
