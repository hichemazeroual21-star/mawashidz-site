# MawashiDZ

المنصة الرقمية لقطاع المواشي في الجزائر.

**الإصدار الحالي في الواجهة: v1.9.0 (Phase 1 Auth UI)**

## Production structure

- `index.html` — الواجهة (تسجيل، دخول، حسابي، الأخبار)
- `assets/algeria_cities.json` — التقسيم الإداري
- `netlify.toml` + `netlify/functions/news.mjs` — أخبار القطاع
- `supabase/` — إعداد قاعدة البيانات (Phase 0 مطبّق على Production)
- `docs/` — تقارير المراحل وقوالب البريد

## Phase 1 — Auth UI (هذا الفرع)

- تسجيل الدخول بالبريد / الهاتف / رقم العضوية
- جلسة محفوظة + استعادة بعد تأكيد البريد
- لوحة «حسابي»
- رقم العضوية من قاعدة البيانات فقط (لا توليد في JavaScript)
- دليل قالب التأكيد العربي: `docs/auth-email-templates-ar.md`

## خطوات يدوية متبقية (المالك)

1. Supabase → Auth → Emails → Confirm signup: الصق القالب من `docs/auth-email-templates-ar.md`
2. Redirect URLs: `https://mawashidz.com/**`
3. مراجعة Preview ثم الموافقة على الدمج/النشر (لا نشر تلقائي من الوكيل)

## Changelog

انظر `CHANGELOG.md`
