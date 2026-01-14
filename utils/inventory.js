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
  if (nome && nome.length > 100) errors.push("nome");
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
      nome: nome || null,
      inicio: inicioIso,
      fim: fimIso,
      status: status || (fimIso ? "fechado" : "aberto"),
    },
  };
}

function buildNextInventoryId(periods) {
  const sequence = String(periods.length + 1).padStart(3, "0");
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `INV-${datePart}-${sequence}`;
}

function createOpenInventory(periods) {
  const now = new Date().toISOString();
  return {
    id: buildNextInventoryId(periods),
    nome: `Inventario ${now.slice(0, 10)}`,
    inicio: now,
    fim: null,
    status: "aberto",
  };
}

function getOpenInventory(periods) {
  return periods.find((item) => item.status === "aberto") || null;
}

module.exports = {
  parseInventoryPeriodInput,
  buildNextInventoryId,
  createOpenInventory,
  getOpenInventory,
};
