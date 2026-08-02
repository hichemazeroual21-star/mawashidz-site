/*
 * MawashiDZ market data truth gate.
 *
 * The platform must fail closed until a reviewed source pipeline can provide
 * observations with provenance, observation time, methodology and sample size.
 */
export default async function handler() {
  return new Response(
    JSON.stringify({
      error: 'verified-market-data-unavailable',
      verified: false,
      updatedAt: null,
      products: [],
      rows: [],
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
