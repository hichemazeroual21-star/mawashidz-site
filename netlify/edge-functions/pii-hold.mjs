export const NETLIFY_PII_HOLD_DECISION_ID = 'MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02';

const HOLD_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>مواشي ديزاد — قيد التحضير</title>
  <style>
    :root{color-scheme:light dark;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0c2e22;color:#f7fbf8}
    main{width:min(620px,100%);padding:36px 28px;border:1px solid rgba(255,255,255,.18);border-radius:24px;background:rgba(255,255,255,.08);text-align:center}
    h1{margin:0 0 12px;font-size:clamp(1.7rem,6vw,2.35rem)}
    p{margin:8px 0;line-height:1.8;color:#e2eee7}
    .notice{margin-top:22px;padding:14px;border-radius:14px;background:rgba(0,0,0,.17);font-weight:700}
    footer{margin-top:22px;font-size:.82rem;color:#bfd1c6;direction:ltr}
  </style>
</head>
<body>
  <main>
    <h1>منصة مواشي ديزاد قيد التحضير</h1>
    <p>التسجيل والدخول وإرسال الطلبات عبر موقع MawashiDZ غير متاح مؤقتاً بينما نراجع الجوانب القانونية والأمنية.</p>
    <p class="notice">يرجى عدم إرسال أي معلومات شخصية حالياً.</p>
    <footer>MawashiDZ · Temporary privacy hold</footer>
  </main>
</body>
</html>`;

function headers(contentType) {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': contentType,
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Retry-After': '3600',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-MawashiDZ-Hold': NETLIFY_PII_HOLD_DECISION_ID,
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  };
}

export default function piiHold(request) {
  const pathname = new URL(request.url).pathname;
  const apiRequest = pathname.startsWith('/api/') || pathname.startsWith('/.netlify/functions/');
  const body = request.method === 'HEAD'
    ? null
    : apiRequest
      ? JSON.stringify({ error: 'pii-hold-active' })
      : HOLD_HTML;

  return new Response(body, {
    status: 503,
    headers: headers(apiRequest ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8'),
  });
}

export const config = {
  path: '/*',
  onError: 'fail',
};
