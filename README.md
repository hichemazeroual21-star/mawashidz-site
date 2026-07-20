# MawashiDZ

Official website package with multilingual interface, automatic dark mode, and trusted livestock-sector news.

## Production structure

- `index.html` — الموقع كاملًا (نسخة Production جاهزة للرفع على GitHub Pages أو Netlify)
- `assets/algeria_cities.json` — التقسيم الإداري الكامل: 58 ولاية، 548 دائرة، 1541 بلدية (مصدر محلي، مع CDN كاحتياط)
- `netlify.toml` — إعدادات Netlify + تحويل `/api/livestock-news` إلى الدالة
- `netlify/functions/news.mjs` — دالة جلب أخبار قطاع المواشي (تعمل على Netlify فقط؛ على GitHub Pages يُستعمل الاحتياط داخل الصفحة)
- `netlify/functions/prices.mjs` — بورصة المواشي الحية: أسعار اللحوم والحليب والأعلاف لكل الولايات (تحديث كل ثانية)
- `assets/market-engine.js` — محرك الأسعار (fallback محلي على GitHub Pages)
- `supabase/setup.sql` — إعداد قاعدة بيانات **جديدة** (مشروع فارغ)
- `supabase/migrations/001_compatible_existing_db.sql` — ترحيل **آمن لقاعدة موجودة** (يضيف الناقص فقط)
- `supabase/migrations/002_user_roles_rls.sql` — تفعيل RLS على `user_roles`
- `supabase/introspect.mjs` / `supabase/probe-columns.mjs` — أدوات فحص البنية عبر REST

## Supabase setup (مطلوب مرة واحدة)

**مشروع جديد (بدون جداول):**
1. شغّل `supabase/setup.sql` كاملًا.

**مشروع موجود (ظهر خطأ `column "member_id" does not exist`):**
1. شغّل `supabase/migrations/001_compatible_existing_db.sql` بدل `setup.sql`.
2. شغّل `supabase/migrations/002_user_roles_rls.sql` لتفعيل RLS على `user_roles`.
3. للتحقق بعد التشغيل: `node supabase/probe-columns.mjs`

**لكلا الحالتين:**
3. عرّب قالب «Confirm signup» في Auth → Emails (نموذج جاهز داخل نهاية ملف SQL).
4. أضف نطاق الموقع في Auth → URL Configuration → Redirect URLs (لاسترجاع كلمة المرور).
