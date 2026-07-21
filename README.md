# MawashiDZ

Official website package with multilingual interface, automatic dark mode, and trusted livestock-sector news.

## Production structure

- `index.html` — الموقع كاملًا (نسخة Production جاهزة للرفع على GitHub Pages أو Netlify)
- `assets/algeria_cities.json` — التقسيم الإداري الكامل: 58 ولاية، 548 دائرة، 1541 بلدية (مصدر محلي، مع CDN كاحتياط)
- `netlify.toml` — إعدادات Netlify + تحويل `/api/livestock-news` إلى الدالة
- `netlify/functions/news.mjs` — دالة جلب أخبار قطاع المواشي (تعمل على Netlify فقط؛ على GitHub Pages يُستعمل الاحتياط داخل الصفحة)
- `netlify/functions/prices.mjs` — بورصة المواشي الحية: أسعار اللحوم والحليب والأعلاف لكل الولايات (تحديث كل ثانية)
- `assets/market-engine.js` — محرك الأسعار (fallback محلي على GitHub Pages)
- `supabase/` — قاعدة البيانات: أرقام العضوية التسلسلية، الملفات الشخصية، الدخول بالبريد/الهاتف/رقم MDZ
- `docs/` — قرارات معمارية (ADR) ومخطط قاعدة البيانات
- `supabase/introspect.mjs` / `supabase/probe-columns.mjs` — أدوات فحص البنية عبر REST

## Supabase setup (مطلوب مرة واحدة)

> **لا تشغّل على Production مباشرة دون نسخة احتياطية.** نفّذ من SQL Editor على مشروع Supabase (Staging أولًا إن وُجد).

### مشروع Supabase جديد

- `supabase/setup.sql` كاملًا

### قاعدة بيانات موجودة مسبقًا

**المسار الموصى به (migrations مرقّمة):**

1. `supabase/migrations/001_compatible_existing_db.sql`
2. `supabase/migrations/002_user_roles_rls.sql`
3. `supabase/migrations/003_dashboard_rls.sql` (اختياري — لوحات المدير/الإدارة)
4. `supabase/migrations/004_fix_registration_production.sql`
5. `supabase/migrations/005_admin_approve_profile.sql`

**مسار Phase 0 (timestamped — من `main`):**

1. `supabase/migrations/20260718220000_align_existing_schema.sql`
2. `supabase/migrations/20260719000000_phase0_member_id_foundation.sql`
3. `supabase/migrations/20260719110000_secure_allocate_member_id.sql`

> لا تشغّل المسارين معًا على نفس القاعدة دون مراجعة — انظر سؤال GRANT/REVOKE في تقرير الدمج.

### بعد الترحيل

1. عرّب قالب «Confirm signup» في Auth → Emails (يتضمن `{{ .Data.member_id }}`)
2. أضف نطاق الموقع في Auth → URL Configuration → Redirect URLs
3. للتحقق: `node supabase/probe-columns.mjs`
4. تحقق من SQL Editor (service role):

```sql
select public.allocate_member_id('breeder');
```

استدعاء نفس الدالة بمفتاح publishable من المتصفح يجب أن يعيد `permission denied`.

## Tests

- `npm test` — اختبارات الوحدة + E2E + أصول Workers (يجب أن تبقى خضراء في CI).
- `npm run test:layout` — اختبارات Puppeteer لتخطيط الهيدر/الموبايل (`tests/ui-layout.test.mjs`, `tests/i18n-layout.test.mjs`). **معروف أنها تفشل حاليًا** (~23 فشل على فجوات register/menu في الهيدر) — قيد الإصلاح في PR منفصل بعد الدمج؛ لم تُحذف ولم تُعطَّل، فقط أُخرجت مؤقتًا من `npm test`.
- `npm run test:db` — اختبارات قاعدة البيانات المحلية (Phase 0)
- `npm run test:security` — تحقق حي أن `allocate_member_id` محظور لـ anon

## حزمة مراجعة الكود الخارجية

```bash
npm run package:review
```

الملف الجاهز: `artifacts/mawashidz-external-code-review-2026-07-19.zip` (+ ملف `.sha256` للتحقق).

## الوثائق

- [مخطط قاعدة البيانات](docs/database-schema.md)
- [ADR 001: تخصيص رقم العضوية](docs/adr/001-member-id-allocation.md)
- [سجل التغييرات](CHANGELOG.md)
