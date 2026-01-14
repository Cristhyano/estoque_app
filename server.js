const express = require("express");
const cors = require("cors");
const { setupSwagger } = require("./swagger");
const statusRoutes = require("./routes/status");
const productsRoutes = require("./routes/products");
const configRoutes = require("./routes/config");
const importRoutes = require("./routes/import");
const inventariosRoutes = require("./routes/inventarios");
const produtoInventarioRoutes = require("./routes/produtoInventario");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());
setupSwagger(app);

app.use("/", statusRoutes);
app.use("/products", productsRoutes);
app.use("/config", configRoutes);
app.use("/import", importRoutes);
app.use("/inventarios", inventariosRoutes);
app.use("/produto-inventario", produtoInventarioRoutes);

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
