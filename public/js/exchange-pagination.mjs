/**
 * Exchange board client-side pagination (wilaya rows per product).
 */

export const EXCHANGE_PAGE_SIZE = 10;

export function resetExchangeLimit(pageSize = EXCHANGE_PAGE_SIZE) {
  return Math.max(1, Number(pageSize) || EXCHANGE_PAGE_SIZE);
}

export function nextExchangeLimit(current, pageSize = EXCHANGE_PAGE_SIZE) {
  const size = Math.max(1, Number(pageSize) || EXCHANGE_PAGE_SIZE);
  const cur = Math.max(0, Number(current) || 0);
  return cur + size;
}

/** Slice sorted rows for display; never duplicates. */
export function paginateExchangeRows(rows, limit) {
  const list = Array.isArray(rows) ? rows : [];
  const lim = Math.max(0, Number(limit) || 0);
  return {
    visible: list.slice(0, lim),
    total: list.length,
    shown: Math.min(lim, list.length),
    hasMore: list.length > lim,
    remaining: Math.max(0, list.length - lim),
  };
}
