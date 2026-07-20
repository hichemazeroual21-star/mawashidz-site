/*
 * MawashiDZ — بورصة المواشي الحية
 * /api/livestock-prices — تحديث كل دقيقة
 */
import { buildMarketSnapshot } from './market-core.mjs';

export default async function handler(request) {
  const url = new URL(request.url);
  const product = url.searchParams.get('product') || '';
  const wilaya = url.searchParams.get('wilaya') || '';

  const snapshot = buildMarketSnapshot();
  let rows = snapshot.rows;
  if (product) rows = rows.filter((r) => r.productId === product);
  if (wilaya) rows = rows.filter((r) => r.wilaya === wilaya || r.wilayaCode === wilaya);

  return new Response(
    JSON.stringify({
      updatedAt: snapshot.updatedAt,
      minuteBucket: snapshot.minuteBucket,
      products: snapshot.products,
      cheapestByProduct: snapshot.cheapestByProduct,
      rows,
      disclaimer: 'reference-index',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    },
  );
}
