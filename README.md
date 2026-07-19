# MawashiDZ

Official website package with multilingual interface, automatic dark mode, and trusted livestock-sector news.

## Production structure

- `index.html` — الموقع كاملًا (نسخة Production جاهزة للرفع على GitHub Pages أو Netlify)
- `assets/algeria_cities.json` — التقسيم الإداري الكامل: 58 ولاية، 548 دائرة، 1541 بلدية (مصدر محلي، مع CDN كاحتياط)
- `netlify.toml` — إعدادات Netlify + تحويل `/api/livestock-news` إلى الدالة
- `netlify/functions/news.mjs` — دالة جلب أخبار قطاع المواشي (تعمل على Netlify فقط؛ على GitHub Pages يُستعمل الاحتياط داخل الصفحة)
- `supabase/` — قاعدة البيانات: أرقام العضوية التسلسلية، الملفات الشخصية، الدخول بالبريد/الهاتف/رقم MDZ
- `docs/` — قرارات معمارية (ADR) ومخطط قاعدة البيانات

## Supabase setup (مطلوب مرة واحدة)

> **لا تشغّل على Production مباشرة دون نسخة احتياطية.** نفّذ من SQL Editor على مشروع Supabase (Staging أولًا إن وُجد).

### قاعدة بيانات موجودة مسبقًا

1. `supabase/migrations/20260718220000_align_existing_schema.sql`
2. `supabase/migrations/20260719000000_phase0_member_id_foundation.sql`
3. `supabase/migrations/20260719110000_secure_allocate_member_id.sql`

### مشروع Supabase جديد

- `supabase/setup.sql` كاملًا

### بعد الترحيل

1. عرّب قالب «Confirm signup» في Auth → Emails (يتضمن `{{ .Data.member_id }}`)
2. أضف نطاق الموقع في Auth → URL Configuration → Redirect URLs
3. تحقق من SQL Editor (service role):

```sql
select public.allocate_member_id('breeder');
```

استدعاء نفس الدالة بمفتاح publishable من المتصفح يجب أن يعيد `permission denied`.

## اختبارات قاعدة البيانات (محليًا)

```bash
npm install
npm run test:db
```

## حزمة مراجعة الكود الخارجية

```bash
npm run package:review
```

الملف الجاهز: `artifacts/mawashidz-external-code-review-2026-07-19.zip` (+ ملف `.sha256` للتحقق).

## الوثائق

- [مخطط قاعدة البيانات](docs/database-schema.md)
- [ADR 001: تخصيص رقم العضوية](docs/adr/001-member-id-allocation.md)
- [سجل التغييرات](CHANGELOG.md)
