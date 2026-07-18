# MawashiDZ

Official website package with multilingual interface, automatic dark mode, and trusted livestock-sector news.

## Production structure

- `index.html` — الموقع كاملًا (نسخة Production جاهزة للرفع على GitHub Pages أو Netlify)
- `assets/algeria_cities.json` — التقسيم الإداري الكامل: 58 ولاية، 548 دائرة، 1541 بلدية (مصدر محلي، مع CDN كاحتياط)
- `netlify.toml` — إعدادات Netlify + تحويل `/api/livestock-news` إلى الدالة
- `netlify/functions/news.mjs` — دالة جلب أخبار قطاع المواشي (تعمل على Netlify فقط؛ على GitHub Pages يُستعمل الاحتياط داخل الصفحة)
- `supabase/setup.sql` — ترحيل توافقي (idempotent): يضيف فقط الأعمدة/الدوال/المحفّزات/السياسات الناقصة دون إعادة إنشاء الجداول الموجودة

## Supabase setup (مطلوب مرة واحدة)

1. افتح Supabase Dashboard → SQL Editor وشغّل `supabase/setup.sql` كاملًا.
   - آمن على القاعدة الحالية: جدول `profiles` الموجود يُرقَّى بـ `ADD COLUMN IF NOT EXISTS` (بما فيها `member_id`) بدل إعادة إنشائه.
   - لا يمس جداول أخرى موجودة مثل `breeders` / `farmers` / `sheep` / `visits`.
2. عرّب قالب «Confirm signup» في Auth → Emails (نموذج جاهز داخل نهاية ملف SQL).
3. أضف نطاق الموقع في Auth → URL Configuration → Redirect URLs (لاسترجاع كلمة المرور).
