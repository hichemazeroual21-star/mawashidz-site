# تقرير تسليم MawashiDZ — للمراجعة والتوجيه

> **الغرض:** تقرير مفصل لكل ما تم إنجازه على مشروع MawashiDZ حتى الآن، مع طلب صريح من Opus 4.8 (أو أي نموذج Claude) لمراجعة الحالة وإصدار أوامر بالإضافات أو التحسينات التالية.
>
> **تاريخ التقرير:** 20 يوليو 2026  
> **الإصدار:** v1.8.0  
> **الفرع:** `cursor/fix-mawashidz-index-6004`  
> **PR:** #3 — https://github.com/hichemazeroual21-star/mawashidz-site/pull/3

---

## 1. هوية المشروع

| البند | القيمة |
|-------|--------|
| **الاسم** | MawashiDZ (مواشي ديزاد) |
| **النوع** | موقع SPA أحادي الصفحة (HTML/CSS/JS بدون إطار عمل) |
| **الإصدار الحالي** | **v1.8.0** |
| **المستودع** | `hichemazeroual21-star/mawashidz-site` |
| **الفرع النشط** | `cursor/fix-mawashidz-index-6004` |
| **آخر commit** | `6aa6cae` — Fix Arabic wilaya, daira, and commune names |
| **النشر** | GitHub Pages + Netlify (دالة أخبار على Netlify فقط) |

---

## 2. بنية الملفات

```
/workspace/
├── index.html                    # الواجهة الكاملة (~2713 سطر)
├── assets/
│   ├── i18n.js                   # نواة الترجمة AR/EN/FR/DE (~497 سطر)
│   ├── i18n-content.js           # ترجمات الأقسام الطويلة (~891 سطر)
│   ├── algeria_cities.json       # 1541 بلدية / 548 دائرة / 58 ولاية (صيغة مسطحة)
│   └── algeria-location-normalize.js  # تصحيح الأسماء العربية
├── scripts/
│   └── build-algeria-cities.mjs  # إعادة بناء JSON من المصدر الرسمي
├── netlify/
│   ├── netlify.toml
│   └── functions/news.mjs        # RSS أخبار المواشي
└── supabase/
    ├── setup.sql                 # قاعدة جديدة
    ├── migrations/001_compatible_existing_db.sql
    ├── migrations/002_user_roles_rls.sql
    └── introspect.mjs / probe-columns.mjs
```

---

## 3. سجل التعديلات (بالترتيب الزمني)

### المرحلة 1 — إصلاح البنية الأساسية (`97a7478`)

- إصلاح تسلسل CSS (cascade) وإعادة بناء الهيدر
- إصلاح أخطاء JS
- تسجيل حسب الدور (موال / بيطري / تاجر أعلاف / مشتري / مدير ولاية…)
- أرقام عضوية تسلسلية `MDZ-V-000001`
- تحسين الصور

### المرحلة 2 — إصلاحات ما بعد الاختبار (`1d25617`)

- Grid الهيدر عند 320–360px
- إصلاح `maxlength` لحقل هاتف الاتصال
- z-index للـ drawer والـ modals
- تدرج RTL في الـ hero
- README

### المرحلة 3 — Supabase (`c9328d8`, `1d5dc29`)

- `001_compatible_existing_db.sql` — ترحيل idempotent لقاعدة موجودة
- `002_user_roles_rls.sql` — RLS على `user_roles`
- أدوات فحص: `introspect.mjs`, `probe-columns.mjs`

### المرحلة 4 — i18n كامل (`1f5b472`, `ebe69bd`)

- **`assets/i18n.js`**: ~100 مفتاح × 4 لغات (واجهة، toasts، نماذج، أخبار، طقس)
- **`assets/i18n-content.js`**: ~220 مفتاح × 4 لغات (أقسام المحتوى الطويلة)
- **`index.html`**: 403 مفتاح `data-i18n` + 3 `data-i18n-html` + 3 `data-i18n-aria`
- `applyI18n()` يحدّث النصوص الديناميكية (طقس، تسجيل، أخبار، حالة المواقع)
- إزالة الخلط بين العربية/الإنجليزية/الفرنسية عند التبديل

### المرحلة 5 — v1.8.0 (`8b9e41a`)

- رفع الإصدار من v1.7.1 → **v1.8.0**
- Cache-bust: `i18n.js?v=1.8.0`, `i18n-content.js?v=1.8.0`
- زر `#headerAuthBtn` → `openAccount()` (دخول أو بروفيل حسب الجلسة)
- `syncAuthHeader()` يبدّل بين `btnLogin` و `btnProfile`
- زر بروفيل في mobile dock (`#dockProfileBtn`)
- تصغير أزرار اللغة (~26px بدل ~30px)

### المرحلة 6 — تصحيح الأسماء العربية (`6aa6cae`) — الأحدث

- **`algeria-location-normalize.js`**: خريطة تصحيح + قواعد عامة
- **`build-algeria-cities.mjs`**: إعادة بناء من `othmanus/algeria-cities`
- **`algeria_cities.json`**: صيغة مسطحة مصححة (كانت متداخلة)
- **`locName()`** في `index.html` يطبّق التصحيح عند التحميل (يشمل CDN fallback)

**إحصائيات الفرع vs main:** +2890 / −891 سطر عبر 14 ملفًا.

---

## 4. الأنظمة الفرعية بالتفصيل

### 4.1 نظام الترجمة (i18n)

```javascript
// assets/i18n.js
const MDZ_APP_VERSION = '1.8.0';
const MDZ_LANGS = ['ar', 'en', 'fr', 'de'];
const MDZ_I18N = { ar: {...}, en: {...}, fr: {...}, de: {...} };

function t(key, vars) { ... }
function applyI18n() { ... }  // يحدّث data-i18n + placeholders + aria + HTML
function setLang(lang) { ... } // يحفظ في localStorage ويستدعي applyI18n
```

- **الواجهة القصيرة** → `i18n.js`
- **الفقرات الطويلة** (كيف تعمل، الثقة، الأضاحي، بطاقات الأعضاء…) → `i18n-content.js` عبر `MDZ_CONTENT_I18N`
- **الاتجاه:** `ar` → RTL، الباقي → LTR
- **ما لم يُترجم بعد:** بعض placeholders ثابتة (`example@email.com`, `00 00 00 00`, أسماء مشغّلي الهاتف Ooredoo/Mobilis/Djezzy)

### 4.2 التقسيم الإداري الجزائري

```javascript
const ALGERIA_CITIES_URLS = [
  './assets/algeria_cities.json',           // أولوية
  'https://cdn.jsdelivr.net/gh/othmanus/algeria-cities@master/json/algeria_cities.json',
  'https://raw.githubusercontent.com/othmanus/algeria-cities/refs/heads/master/json/algeria_cities.json'
];
```

**شروط القبول:** ≥58 ولاية، ≥500 دائرة، ≥1500 بلدية — وإلا `FALLBACK_WILAYAS` (58 ولاية فقط، الدائرة/البلدية "يُحدد لاحقًا").

**التصحيحات العربية المطبّقة:**

| قبل | بعد |
|-----|-----|
| ` الشلف` | `الشلف` |
| ` بجاية` | `بجاية` |
| `اقبلي` | `أقبلي` |
| `سيدي امحمد` | `سيدي أمحمد` |
| `ايت تيزي` | `آيت تيزي` |
| `انقوسة` | `النقوسة` |
| `سيدي  خالد` | `سيدي خالد` |
| `ابن عكنون` | `بن عكنون` |

**ملاحظة:** بعض التصحيحات قد تحتاج مراجعة لغوية (مثل `إغرام` vs `آغرام`، `أقبيل`، `أبلعة`) — المصدر الرسمي ONS يحتوي نفس الأخطاء.

### 4.3 Supabase

| المكوّن | التفاصيل |
|---------|----------|
| **URL** | `https://fpjvjfgwbfehhcvdirpy.supabase.co` |
| **المفتاح** | publishable key مضمّن في `index.html` |
| **Auth** | signup / signin / password recovery |
| **RPC** | `allocate_member_id`, `resolve_login_identifier` |
| **جداول** | `registrations`, `profiles`, `contacts`, `feedback`, `user_roles` |
| **الجلسة** | `localStorage` → `mdz_auth_session` |

**تدفق التسجيل:**

1. التحقق من الحقول حسب الدور
2. `signUpAccount()` → Supabase Auth
3. `allocateMemberId()` → `MDZ-V-000001` (تسلسلي) أو عشوائي fallback
4. `supabaseInsert('registrations', payload)`
5. إشعار إداري عبر EmailJS (اختياري — التسجيل ينجح حتى لو فشل EmailJS)

**حقول حسب الدور:**

- بيطري: `vet_license`, `vet_specialty`, `vet_experience_years`
- موال: حقول المزرعة
- مشتري: إخفاء `bio`/`professional`
- كل الأدوار: ولاية/دائرة/بلدية بدون بادئة رقمية (`المدية` وليس `26 - المدية`)

### 4.4 الأخبار والطقس

- **Netlify:** `/api/livestock-news` → `news.mjs` (Google News RSS مفلتر)
- **GitHub Pages:** fallback داخل الصفحة (مصادر ثابتة)
- **الطقس:** Open-Meteo API حسب موقع المستخدم
- **التصنيفات:** الطقس، الأعلاف، المواشي، البيطرة، قرارات رسمية

### 4.5 الواجهة والتجربة

- **Dark mode** تلقائي (`prefers-color-scheme`)
- **Mobile dock** سفلي (رئيسية، تسجيل، تواصل، بروفيل)
- **Hero** responsive مع `object-position` مختلف للموبايل/الديسكتوب
- **QR** عام للموقع + QR عضو/حيوان (مستقبلي)
- **Modals:** تسجيل، دخول، حساب، اتصال، feedback

---

## 5. الاختبارات

**المسار:** `/tmp/mdztest/test.mjs` (Puppeteer + خادم محلي)

**النتيجة:** **74/74 PASS**

| الفئة | ما يُختبر |
|-------|-----------|
| Layout | 9 عروض (320→1366px)، لا تداخل في الهيدر |
| i18n | تبديل اللغات |
| Locations | 58 ولاية، المدية 19 دائرة، بلديات مملوءة |
| Registration | حقول حسب الدور، success card، MDZ IDs |
| Supabase | payload صحيح، هاتف +213، ولاية بدون رقم |
| EmailJS down | التسجيل ينجح بدون شبكة |
| Phone | 7 أرقام مرفوض، 8 مقبولة، تنظيف غير الأرقام |
| Hero mobile | صورة، object-position، لا تداخل مع dock |
| Console | صفر أخطاء JS |

---

## 6. القيود والفجوات المعروفة

### لم يُنجز بعد

1. **صفحات الشروط والخصوصية** — toasts تقول "جاهزة للربط" لكن لا توجد صفحات فعلية
2. **لوحة إدارة** — البيانات تُحفظ في Supabase بدون واجهة إدارة
3. **QR العضو/الحيوان** — واجهة فقط، لا backend تحقق
4. **تطبيق موبايل** — مذكور في المحتوى، غير موجود
5. **ترجمة placeholders** — بعض النصوص الثابتة في الحقول
6. **أسماء المواقع** — 17 تصحيحًا محددًا فقط؛ قد تحتاج مراجعة لغوية أوسع
7. **اختبارات i18n آلية** — لا فحص تلقائي لاكتمال المفاتيح عبر اللغات الأربع
8. **الأخبار على GitHub Pages** — fallback محدود مقارنة بـ Netlify
9. **مفاتيح API مكشوفة** — Supabase publishable + EmailJS في الكود (مقبول للـ frontend لكن يحتاج RLS صارم)

### قرارات معلّقة (TODO في الكود)

```javascript
/* TODO(مالك المشروع): رسالة المستخدم الوحيدة هي رسالة تأكيد Supabase المعرّبة */
// حُذفت sendMemberConfirmationEmail المكررة من EmailJS
```

### تغيير بنية البيانات

- `algeria_cities.json` انتقل من **متداخل** (`wilayas[].dairas[].communes[]`) إلى **مسطح** (`wilaya_name, daira_name, commune_name`)
- `flattenLocationData()` يدعم الصيغتين

---

## 7. Commits على الفرع (مرجع سريع)

```
6aa6cae Fix Arabic wilaya, daira, and commune names across location data
8b9e41a Bump to v1.8.0 with profile button and compact language switcher
ebe69bd Complete i18n for content sections and registration role fields
1f5b472 Add full AR/EN/FR/DE i18n for shell UI and dynamic strings
1d5dc29 Enable RLS on public.user_roles with self-read policy
c9328d8 Add idempotent Supabase migration for existing database schema
1d25617 Post-testing fixes: header grid, z-index, RTL hero, README
97a7478 Fix core structure: CSS cascade, header rebuild, JS errors, registration
```

---

## 8. طلب صريح لـ Opus 4.8 / Claude

**بعد مراجعة هذا التقرير:**

1. **ما الأولوية التالية؟** اختر من:
   - v1.9.0 بميزة محددة (لوحة بروفيل كاملة؟ صفحات قانونية؟ تحسين SEO؟)
   - توسيع تصحيح الأسماء العربية بمراجعة لغوية شاملة
   - اختبارات i18n آلية + CI
   - فصل JS/CSS عن `index.html` الضخم
   - PWA + offline
   - تحسين الأخبار/الأسعار الحية

2. **هل v1.8.0 جاهز للدمج في `main`؟** أم تريد تعديلات قبل الدمج؟

3. **ما التحسينات الحرجة التي تراها ناقصة** في:
   - الأمان (RLS، rate limiting، validation)
   - UX (تسجيل، دخول، بروفيل)
   - الأداء (حجم `index.html` ~548KB مع base64 images)
   - SEO/i18n (hreflang، meta ديناميكية)
   - إمكانية الوصول (a11y)

4. **أصدر قائمة أوامر محددة** للوكيل التنفيذي بصيغة:

```
[P0] ...
[P1] ...
[P2] ...
```

مع معايير قبول واضحة لكل مهمة.

---

## 9. أوامر مفيدة للتشغيل

```bash
# اختبارات
cd /tmp/mdztest && node test.mjs

# إعادة بناء بيانات المواقع
node scripts/build-algeria-cities.mjs /tmp/algeria_official.json

# فحص Supabase
node supabase/probe-columns.mjs
```

---

## 10. حالة المشروع (ملخص تنفيذي)

| المؤشر | الحالة |
|--------|--------|
| الاستقرار | ✅ 74/74 اختبار |
| i18n | ✅ AR/EN/FR/DE كامل للواجهة |
| التسجيل | ✅ Supabase + EmailJS fallback |
| المواقع | ✅ 58/548/1541 مع تصحيح عربي |
| الإصدار | v1.8.0 |
| PR | #3 مفتوح على الفرع |

**في انتظار توجيه Opus 4.8 / Claude للمرحلة التالية.**
