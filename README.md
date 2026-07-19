# MawashiDZ

منصة رقمية لقطاع المواشي في الجزائر — الموقع الرسمي الحالي مع مسار ترقية مرحلي نحو منصة كاملة.

## Production structure

- `index.html` — الواجهة الحالية (Production)
- `assets/algeria_cities.json` — 58 ولاية / 548 دائرة / 1541 بلدية
- `netlify.toml` + `netlify/functions/news.mjs` — أخبار قطاع المواشي
- `supabase/` — إعداد قاعدة البيانات، Migrations، Rollbacks، اختبارات
- `docs/` — الرؤية، الـ Roadmap، ADR، تقارير المراحل، مخطط القاعدة

## Phase 0 — تثبيت الأساس (مطلوب قبل أي مرحلة لاحقة)

### التحقق المحلي
```bash
bash supabase/tests/run_phase0_tests.sh
```

### تطبيق على Supabase (يدوي — لا يُنفَّذ تلقائيًا)

**قاعدة موجودة (حالة المشروع الحالية):**
1. افتح SQL Editor
2. شغّل `supabase/migrations/20260718233000_phase0_existing_database.sql`
3. أعد تشغيل نفس الملف للتأكد من idempotency

**مشروع جديد فارغ:**
1. `supabase/migrations/20260718233001_phase0_fresh_database.sql`
2. ثم `supabase/migrations/20260718233000_phase0_existing_database.sql`

### خطوات يدوية إضافية في لوحة Supabase
1. Auth → URL Configuration → Redirect URLs: `https://mawashidz.com/**`
2. Auth → Emails → Confirm signup (قالب عربي مقترح):

```
Subject: أكد بريدك لتفعيل حسابك في MawashiDZ

<h2>مرحبًا {{ .Data.first_name }}،</h2>
<p>يسعدنا انضمامك إلى MawashiDZ بصفة: <b>{{ .Data.role_label }}</b>.</p>
<p>رقم عضويتك: <b>{{ .Data.member_id }}</b><br>
   رقم متابعة الطلب: <b>{{ .Data.registration_id }}</b></p>
<p><a href="{{ .ConfirmationURL }}">اضغط هنا لتأكيد بريدك وتفعيل الدخول</a></p>
```

## Documentation
- `docs/ROADMAP.md`
- `docs/database-schema.md`
- `docs/adr/0001-member-id-allocation.md`
- `docs/reports/phase-0-foundation.md`
- `docs/reports/phase-0-role-security-verification.md`
- `SECURITY.md`
- `CHANGELOG.md`

## Rules
- لا حذف بيانات حالية
- لا تطبيق Production تلقائيًا
- لا Merge تلقائي
- كل Migration يجب أن تكون idempotent ولها Rollback
