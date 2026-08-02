# MawashiDZ

Official website package with multilingual interface, automatic dark mode, and trusted livestock-sector news.

## Production structure

- `index.html` — مصدر الواجهة (يُنسخ إلى `public/` عبر `npm run build`)
- `worker.mjs` + `wrangler.jsonc` — Cloudflare Worker الإنتاجي `mawashidz-live` (أصول ثابتة + `/api/*`)
- `public/` — حزمة النشر المولَّدة (لا تعدّلها يدويًا)
- `assets/algeria_cities.json` — التقسيم الإداري الكامل: 58 ولاية، 548 دائرة، 1541 بلدية
- `netlify/functions/news.mjs` / `prices.mjs` — معالجات الأخبار وبوابة صدق بيانات السوق (مشتركة: Worker يستوردها؛ Netlify يوجّهها عبر `netlify.toml`)
- `/api/livestock-prices` يفشل مغلقًا بحالة `503` حتى تتوفر تغذية أسعار موثقة بمصدر ومنهجية؛ لا يوجد مولّد أسعار أو fallback محلي
- `supabase/` — قاعدة البيانات: أرقام العضوية التسلسلية، الملفات الشخصية، الدخول بالبريد/الهاتف/رقم MDZ
- `docs/` — قرارات معمارية (ADR) ومخطط قاعدة البيانات + `DEPLOYMENT.md` لمسار Cloudflare

**الإنتاج الرسمي:** https://mawashidz.com عبر Cloudflare Workers (انظر `DEPLOYMENT.md`). Netlify اختياري لنفس دوال API.

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
6. `supabase/migrations/006_registrations_unique.sql`
7. `supabase/migrations/007_review_registration_status.sql` (موافقة/رفض الطلبات من اللوحات عبر RPC آمن)
8. `supabase/migrations/008_admin_audit_and_roles.sql` (سجل التدقيق + منح/سحب الأدوار + إنشاء `user_roles` إن لزم)
9. `supabase/migrations/009_schema_baseline_hardening.sql` (`registrations.status` + سياسات إدراج مُقيَّدة + حد معدّل التسجيل)
10. `supabase/migrations/010_notifications_tickets_email_outbox.sql` (إشعارات + تذاكر الدعم + طابور البريد)
11. `supabase/migrations/011_review_notify_email_hooks.sql` (ربط المراجعة بالإشعار/البريد + قراءة العضو لطلبه)

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

- `npm test` — اختبارات الوحدة + أمان + E2E + تخطيط Puppeteer
- `npm run test:ci` — ما يشغّله GitHub Actions (بدون متصفح)
- `npm run test:layout` — اختبارات Puppeteer لتخطيط الهيدر/الموبايل (`tests/ui-layout.test.mjs`, `tests/i18n-layout.test.mjs`). تصميم الهيدر على الموبايل: القائمة يسارًا + العلامة يمينًا (صف 1)، دخول + تسجيل مجمّعان يسارًا (صف 2)، مبدّل اللغة وسطًا (صف 3).
- `npm run test:db` — اختبارات قاعدة البيانات المحلية (Phase 0)
- `npm run test:security` — تحقق حي أن `allocate_member_id` محظور لـ anon

## الوثائق

- [الدستور الاستراتيجي](docs/constitution/MAWASHIDZ_CONSTITUTION.md) (v3.0 FROZEN)
- [خارطة الطريق](docs/constitution/ROADMAP.md)
- [مخطط قاعدة البيانات](docs/database-schema.md)
- [ADR 001: تخصيص رقم العضوية](docs/adr/001-member-id-allocation.md)
- [Runbooks](docs/runbooks/)
- [سجل التغييرات](CHANGELOG.md)
