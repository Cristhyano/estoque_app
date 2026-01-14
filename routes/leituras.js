const express = require("express");
const { deleteLeitura } = require("../controllers/leiturasController");

const router = express.Router();

router.delete("/:id", deleteLeitura);

module.exports = router;
