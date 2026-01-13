function parseInventoryPeriodInput(body) {
  const nomeRaw = body.nome ?? body.name ?? "";
  const inicioRaw = body.inicio ?? body.data_inicio ?? body.start;
  const fimRaw = body.fim ?? body.data_fim ?? body.end ?? null;
  const statusRaw = body.status ?? body.estado ?? "";

  const nome = String(nomeRaw).trim();
  const inicio = String(inicioRaw ?? "").trim();
  const fim = fimRaw === null ? null : String(fimRaw ?? "").trim();
  const status = String(statusRaw).trim().toLowerCase();

  const errors = [];
  if (!nome) errors.push("nome");
  if (!inicio) errors.push("inicio");
  if (status && !["aberto", "fechado"].includes(status)) errors.push("status");

  let inicioIso = null;
  if (inicio) {
    const parsed = new Date(inicio);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("inicio");
    } else {
      inicioIso = parsed.toISOString();
    }
  }

  let fimIso = null;
  if (fim !== null && fim !== "") {
    const parsed = new Date(fim);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("fim");
    } else {
      fimIso = parsed.toISOString();
    }
  }

  if (inicioIso && fimIso && new Date(fimIso) < new Date(inicioIso)) {
    errors.push("fim");
  }

  return {
    errors,
    period: {
      nome,
      inicio: inicioIso,
      fim: fimIso,
      status: status || (fimIso ? "fechado" : "aberto"),
    },
  };
}

module.exports = { parseInventoryPeriodInput };
