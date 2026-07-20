# MawashiDZ — Handoff كامل لـ Claude
**التاريخ:** 2026-07-20  
**المشروع:** mawashidz-site (https://mawashidz.com)  
**Supabase:** https://fpjvjfgwbfehhcvdirpy.supabase.co  
**الفرع النشط للإصلاح:** `cursor/fix-registration-insert-6004`  
**الفرع السابق (v1.10 dashboards):** `cursor/admin-manager-dashboard-6004`

---

## 1. ملخص المشكلة (حادثة Kamel Zas)

**التسجيل:** Kamel Zas — 2026-07-20 ~10:44 — `MDZ-REG-2026-059060`

| ما حدث | الحالة |
|--------|--------|
| إنشاء حساب Auth | ✅ نجح |
| وصول البريد الإلكتروني | ✅ وصل |
| رقم العضوية في الإيميل | ❌ "غير متوفر" |
| صف في `registrations` | ❌ لم يُدرَج (آخر صف id=44 بتاريخ 2026-07-19 20:00) |
| تحذير أصفر في الواجهة | ⚠️ "تم إنشاء حسابك بنجاح. تعذر حفظ نسخة الطلب في سجل التسجيل" |

**القبول بعد التسجيل:** يتم في جدول **`profiles`** (عمود `status`: `pending` → `approved`)، وليس في `registrations` (أرشيف الطلبات فقط).

---

## 2. التشخيص النهائي (مُثبت على Supabase الحي)

### 2.1 فشل الإدراج في `registrations` — **ليس RLS**

الكود يستخدم دائماً مفتاح `anon` في `supabaseInsert()` — **ليس JWT المستخدم**:

```javascript
// index.html — supabaseInsert()
headers: {
  'apikey': SUPABASE_PUBLISHABLE_KEY,
  'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
}
```

**السبب الحقيقي:** `PGRST204` — الكود كان يُرسل `member_id` و `registration_id` كأعمدة عليا في payload REST، بينما **هذه الأعمدة غير موجودة** على جدول `registrations` في الإنتاج (ترحيل `001_compatible_existing_db.sql` لم يُشغَّل).

| اختبار على الإنتاج | النتيجة |
|-------------------|---------|
| payload **مع** `member_id` + `registration_id` كأعمدة عليا | **400 PGRST204** — العمود غير موجود في schema cache |
| نفس البيانات **بدون** هذين العمودين (في `message` JSON فقط) | **201** نجاح |

**التحذير الأصفر** يأتي من:
- الملف: `js/registration-flow.mjs`
- الثابت: `REGISTRATION_ROW_WARNING_AR` (سطر ~67-68)
- يُفعَّل عند: سطر ~187 عندما يفشل `supabaseInsert('registrations', ...)` بعد نجاح Auth

**سياسة RLS:** `"registrations: public insert"` لـ `anon, authenticated` مع `with check (true)` — **تعمل**. المشكل كان قبل وصول الصف للجدول.

### 2.2 رقم العضوية "غير متوفر"

سببان:

| # | السبب | التفاصيل |
|---|-------|----------|
| A | انحدار v1.10 | توقف استدعاء `allocateMemberId()` قبل التسجيل؛ `emailData` كان يمرر `member_id: null` |
| B | RPC محظور (صحيح أمنياً) | `allocate_member_id()` على الإنتاج → **401 / 42501** `permission denied for function allocate_member_id` |

**ملاحظة أمنية Phase 0:** منع `anon`/`authenticated` من `EXECUTE` على `allocate_member_id()` كان **قراراً أمنياً عمداً** — الدالة تزيد العداد بدون ربط بحساب؛ استدعاء متكرر = استنزاف أرقام MDZ (DoS).

### 2.3 أعمدة `registrations` على الإنتاج (probe-columns.mjs)

**موجودة:** id, full_name, phone, email, whatsapp, wilaya, commune, user_type, role, message, is_verified, privacy_accepted, founding_terms_accepted, created_at, status

**غائبة:** member_id, registration_id, daira, first_name, last_name, birth_date, invite_code, invited_by, updated_at

---

## 3. الحل المعتمد (كود + SQL)

### 3.1 إصلاح الكود (فرع `cursor/fix-registration-insert-6004`)

**التغييرات في `index.html`:**

1. **إزالة** `member_id` و `registration_id` من payload REST العلوي في `buildRegistrationRecords()` — تبقى في `message` JSON فقط (تجنب PGRST204 على DB قديم).
2. **إزالة** استدعاء `allocateMemberId()` من مسار التسجيل — التخصيص على السيرفر فقط.
3. **توسيع** regex في `memberIdFromAuthResult()` لقبول صيغ fallback: `/^MDZ-[A-Z]-/`
4. `allocateMemberId()` في الواجهة: معطّلة للإنتاج (تحذير console فقط) — لا RPC من المتصفح.

**مسار التسجيل بعد الإصلاح:**
```
submit → signUpAccount (بدون member_id في metadata)
       → handle_new_user trigger يخصص member_id على السيرفر
       → memberIdAfterSignup (من user_metadata أو profile)
       → supabaseInsert('registrations') بدون أعمدة عليا زائدة
       → success UI + email
```

### 3.2 ترحيل SQL: `supabase/migrations/004_fix_registration_production.sql`

**يجب تشغيله يدوياً في Supabase SQL Editor.**

محتوى الترحيل (النسخة الآمنة النهائية):

1. إضافة أعمدة: `member_id`, `registration_id`, `daira` على `registrations`
2. backfill من `message` JSON للصفوف القديمة
3. **أمن:** `REVOKE EXECUTE ON allocate_member_id(text) FROM anon, authenticated, public`
4. تحديث `handle_new_user()` trigger:
   - يستدعي `allocate_member_id(role)` داخل `SECURITY DEFINER`
   - يُدرج `profiles` مع `member_id` المخصص
   - يُحدّث `auth.users.raw_user_meta_data` بـ `member_id` (للواجهة والإيميل)
5. إعادة تأكيد سياسة `"registrations: public insert"` لـ anon + authenticated

**لا تمنح anon صلاحية EXECUTE على allocate_member_id** — هذا يخالف Phase 0.

### 3.3 إصلاح Kamel Zas يدوياً (بعد 004)

```sql
-- عدّل الإيميل حسب الحاجة
UPDATE public.profiles
SET
  member_id = 'MDZ-V-XXXXXX',  -- الرقم الفعلي بعد التخصيص أو يدوياً
  registration_id = 'MDZ-REG-2026-059060',
  status = 'pending'
WHERE email ILIKE '%kamel%' AND member_id IS NULL;

-- اختياري: إدراج صف أرشيف في registrations من بيانات profiles
```

---

## 4. الاختبارات

```bash
npm install
npm test                    # unit + E2E
npm run test:security       # يتحقق أن anon محظور من allocate_member_id على الإنتاج
```

| Suite | النتيجة المتوقعة |
|-------|------------------|
| `tests/registration-flow.test.mjs` | 11/11 |
| `tests/static-asset-validation.test.mjs` | ✓ (Workers + payload shape) |
| `tests/registration-ui-guard.test.mjs` | ✓ |
| `tests/registration-e2e.test.mjs` | 9/9 |
| `tests/security-allocate-member-id.test.mjs` | ✓ 401 على الإنتاج |

**ملفات الاختبار الرئيسية:**
- `tests/registration-flow.test.mjs`
- `tests/registration-e2e.test.mjs`
- `tests/static-asset-validation.test.mjs`
- `tests/security-allocate-member-id.test.mjs`

---

## 5. البنية التقنية

### 5.1 النشر
- **المنصة:** Cloudflare Workers (ليس Netlify)
- **الإعداد:** `wrangler.jsonc` → `assets.directory: "./public"`
- **المزامنة:** `node scripts/sync-worker-public.mjs` (ينسخ index.html, js/, assets/ → public/)

### 5.2 ملفات أساسية

| الملف | الدور |
|-------|-------|
| `index.html` | SPA رئيسية (~3100+ سطر) — Auth، تسجيل، لوحات |
| `js/registration-flow.mjs` | pipeline التسجيل (منفصل عن DOM، قابل للاختبار) |
| `js/mdz-dashboards.mjs` | حسابي v2 + لوحات مدير/إدارة |
| `assets/i18n.js` | ترجمة — الإصدار v1.10.0 |
| `supabase/migrations/001_compatible_existing_db.sql` | ترحيل DB للمشاريع الموجودة |
| `supabase/migrations/003_dashboard_rls.sql` | RLS قراءة للوحات (غير مُشغَّل على الإنتاج) |
| `supabase/migrations/004_fix_registration_production.sql` | **إصلاح التسجيل — يجب تشغيله** |

### 5.3 Supabase

- **URL:** `https://fpjvjfgwbfehhcvdirpy.supabase.co`
- **Publishable key:** مضمّن في `index.html` كـ `SUPABASE_PUBLISHABLE_KEY`
- **جداول:** profiles, registrations, contact_messages, feedback_tickets, user_roles, member_id_counters
- **RPC:** allocate_member_id (محظور لـ anon — صحيح), resolve_login_identifier (يعمل)

### 5.4 لوحات التحكم و 003_dashboard_rls.sql

| الحالة | الأثر |
|--------|-------|
| 003 غير مُشغَّل | RLS الافتراضي يمنع SELECT على registrations — **لا تسريب**. اللوحات تعرض localStorage fallback فقط |
| 003 + أدوار في user_roles | المدير/الإدارة يريان الطلبات حسب الصلاحية |

**الدمج آمِن أمنياً بدون 003** — لكن لوحات الإنتاج لن تعرض بيانات Supabase حتى تشغيل 003 + تعيين أدوار.

---

## 6. الفروع و PRs

| الفرع | المحتوى | الحالة |
|-------|---------|--------|
| `cursor/admin-manager-dashboard-6004` | v1.10.0 — Auth UI، dashboards، حسابي v2، اختبارات Workers/E2E | مدفوع — PR يحتاج موافقة يدوية |
| `cursor/fix-registration-insert-6004` | إصلاح PGRST204 + member_id server-side + أمن Phase 0 | **الأولوية للدمج** |

**إنشاء PR:** يدوي — الإعدادات تمنع الإنشاء التلقائي.  
رابط نموذجي: `https://github.com/hichemazeroual21-star/mawashidz-site/pull/new/cursor/fix-registration-insert-6004`

---

## 7. الترتيب المطلوب للتنفيذ (بالترتيب)

1. **شغّل** `supabase/migrations/004_fix_registration_production.sql` في Supabase SQL Editor
2. **ادمج** فرع `cursor/fix-registration-insert-6004` إلى main وانشر على Cloudflare Workers
3. **أصلح** Kamel Zas يدوياً في `profiles` (member_id + registration_id + status)
4. **جرّب تسجيلاً حقيقياً واحداً** على https://mawashidz.com — تحقق من:
   - صف جديد في `registrations`
   - `profiles.member_id` مملوء (مثل MDZ-V-000045)
   - لا تحذير أصفر
   - الإيميل يحتوي رقم العضوية
   - القبول لاحقاً: `profiles.status` → `approved`

**الخطوة 4 لم تُنفَّذ بعد من Cloud Agent** — تتطلب تسجيلاً حقيقياً على الإنتاج (لا يمكن محاكاته بالكامل).

---

## 8. سياق v1.10.0 (العمل السابق)

### ميزات مُنفَّذة
- Auth UI: updateAuthChrome، PKCE، 4 أزرار header
- حسابي v2: تبويبات Profile | Request | Invites | Security
- لوحات مدير الولاية والإدارة (role gating عبر user_roles)
- Policy modals بدل footer toasts
- تقرير UX: `docs/UI_UX_STATUS_REPORT.md` (9.2/10)

### ملاحظات مراجعة سابقة (7.5/10 → مُعالَجة)
1. ~~اختبار Netlify~~ → أُعيد لـ Cloudflare Workers (`static-asset-validation.test.mjs`)
2. ~~لا E2E للتسجيل~~ → `registration-e2e.test.mjs` (9/9)
3. توضيح 003_dashboard_rls — آمِن للدمج بدونه من ناحية التسريب

---

## 9. أخطاء شائعة — لا تكررها

| الخطأ | الصواب |
|-------|--------|
| `GRANT EXECUTE ON allocate_member_id TO anon` | **ممنوع** — استنزاف عداد |
| إرسال member_id/registration_id كأعمدة REST عليا قبل ترحيل 001/004 | يسبب PGRST204 |
| القبول في registrations | القبول في **profiles.status** |
| افتراض أن المشكل RLS على authenticated | supabaseInsert يمر كـ **anon** دائماً |
| الاعتماد على اختبار آلي فقط | تسجيل حقيقي واحد على الإنتاج ضروري |

---

## 10. أوامر مفيدة

```bash
# مزامنة public/ للنشر
node scripts/sync-worker-public.mjs

# كل الاختبارات
npm test

# اختبار أمني حي
npm run test:security

# فحص Supabase (اختياري)
node supabase/introspect.mjs
node supabase/probe-columns.mjs
```

---

## 11. ما يتبقى (اختياري / لاحقاً)

- [ ] تشغيل `003_dashboard_rls.sql` + تعيين `user_roles` للوحات الإنتاج
- [ ] ترجمات FR/DE لمفاتيح i18n الجديدة في v1.10.0
- [ ] إصلاح `contact_messages` — خطأ trigger `wilaya_name` (42703 عند الإدراج)
- [ ] موافقة ودمج PRs

---

## 12. رسالة مختصرة لـ Claude (للبدء السريع)

أنت تكمل عمل MawashiDZ. المشكل الحرج: تسجيل Kamel Zas أنشأ حساباً لكن فشل إدراج `registrations` (PGRST204 — أعمدة غير موجودة) ورقم العضوية فارغ. الإصلاح جاهز على فرع `cursor/fix-registration-insert-6004`: payload بدون أعمدة عليا زائدة + member_id يُخصص في trigger `handle_new_user` (بدون GRANT anon على allocate_member_id). **شغّل 004 في Supabase، ادمج الفرع، أصلح Kamel يدوياً، ثم اختبر تسجيلاً حقيقياً واحداً.** القبول في `profiles.status` وليس registrations.

---

*نهاية ملف Handoff — MawashiDZ — 2026-07-20*
