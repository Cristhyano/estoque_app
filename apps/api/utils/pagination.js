function getPaginationParams(query) {
  const page = Number(query.page);
  const limit = Number(query.limit);
  if (!Number.isFinite(page) && !Number.isFinite(limit)) {
    return null;
  }

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return { page: safePage, limit: safeLimit };
}

function shouldIncludeTotals(query) {
  const raw = String(query.include_totals ?? query.includeTotals ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "y"].includes(raw);
}

function buildListResponse(items, query, totals) {
  const params = getPaginationParams(query);
  const includeTotals = shouldIncludeTotals(query);
  if (!params && !includeTotals) {
    return { pagedItems: items, response: null };
  }

  const total_items = items.length;
  const page = params ? params.page : 1;
  const limit = params ? params.limit : total_items;
  const total_pages =
    limit > 0 ? (total_items === 0 ? 0 : Math.ceil(total_items / limit)) : 0;
  const start = (page - 1) * limit;
  const pagedItems = params ? items.slice(start, start + limit) : items;

  return {
    pagedItems,
    response: {
      items: pagedItems,
      total_items,
      total_pages,
      page,
      limit,
      totals: totals ?? {},
    },
  };
}

module.exports = { buildListResponse };
