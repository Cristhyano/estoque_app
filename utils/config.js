function parseConfigInput(body) {
  const raw = body.fator_conversao ?? body.fatorConversao ?? body.factor;
  const fator_conversao = Number(raw);
  const errors = [];
  if (!Number.isFinite(fator_conversao) || fator_conversao <= 0)
    errors.push("fator_conversao");
  if (!Number.isInteger(fator_conversao)) errors.push("fator_conversao");
  return { errors, config: { fator_conversao } };
}

module.exports = { parseConfigInput };
