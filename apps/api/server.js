const express = require("express");
const cors = require("cors");
const { setupSwagger } = require("./swagger");
const statusRoutes = require("./routes/status");
const productsRoutes = require("./routes/products");
const configRoutes = require("./routes/config");
const importRoutes = require("./routes/import");
const inventariosRoutes = require("./routes/inventarios");
const produtoInventarioRoutes = require("./routes/produtoInventario");
const leiturasRoutes = require("./routes/leituras");
const syncRoutes = require("./routes/sync");
const { initStorage } = require("./utils/storage");

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOriginPatterns = [/^http:\/\/localhost:\d+$/];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
        callback(null, true);
        return;
      }
      if (origin.startsWith("app://") || origin === "file://") {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
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
app.use("/leituras", leiturasRoutes);
app.use("/sync", syncRoutes);

initStorage();

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
