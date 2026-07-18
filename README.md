# MawashiDZ

Official website package with multilingual interface, automatic dark mode, and trusted livestock-sector news.

## Production structure

- `index.html` — الموقع كاملًا (نسخة Production جاهزة للرفع على GitHub Pages أو Netlify)
- `assets/algeria_cities.json` — التقسيم الإداري الكامل: 58 ولاية، 548 دائرة، 1541 بلدية (مصدر محلي، مع CDN كاحتياط)
- `netlify.toml` — إعدادات Netlify + تحويل `/api/livestock-news` إلى الدالة
- `netlify/functions/news.mjs` — دالة جلب أخبار قطاع المواشي (تعمل على Netlify فقط؛ على GitHub Pages يُستعمل الاحتياط داخل الصفحة)
- `supabase/setup.sql` — ملف إعداد قاعدة البيانات: أرقام العضوية التسلسلية، الملفات الشخصية، الدخول بالبريد/الهاتف/رقم MDZ، جداول التسجيل والتواصل والبلاغات مع RLS

## Supabase setup (مطلوب مرة واحدة)

1. إن كانت قاعدة البيانات موجودة مسبقًا (جداول `profiles` / `registrations` …)، شغّل أولًا `supabase/migrations/20260718220000_align_existing_schema.sql` — ترقية idempotent تضيف الأعمدة والدوال الناقصة فقط.
2. وإلا (مشروع جديد)، أو بعد الترقية، شغّل `supabase/setup.sql` كاملًا.
2. عرّب قالب «Confirm signup» في Auth → Emails (نموذج جاهز داخل نهاية ملف SQL).
3. أضف نطاق الموقع في Auth → URL Configuration → Redirect URLs (لاسترجاع كلمة المرور).
