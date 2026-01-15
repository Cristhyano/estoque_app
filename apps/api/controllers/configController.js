const { readConfig, writeConfig } = require("../utils/storage");
const { parseConfigInput } = require("../utils/config");

function getConfig(req, res) {
  const config = readConfig();
  res.json(config);
}

function createConfig(req, res) {
  const { errors, config } = parseConfigInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  writeConfig(config);
  res.json(config);
}

function updateConfig(req, res) {
  const { errors, config } = parseConfigInput(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Campos invalidos",
      fields: errors,
    });
  }

  writeConfig(config);
  res.json(config);
}

function resetConfig(req, res) {
  const config = { fator_conversao: 100 };
  writeConfig(config);
  res.json(config);
}

module.exports = { getConfig, createConfig, updateConfig, resetConfig };
