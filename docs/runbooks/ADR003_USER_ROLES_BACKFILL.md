# ADR-003 — خطة backfill قبل تطبيق migration 014

**Status:** Plan only — **لا تُنفَّذ على الإنتاج الليلة**  
**Audience:** Founder / Ops (مراجعة بعقل صافٍ)  
**Related:** [003-membership-vs-elevation.md](../adr/003-membership-vs-elevation.md) · migration `014_signup_authz_harden.sql` · دستور العمليات §18–19  

---

## لماذا هذا مطلوب؟

بعد `014`، الدالة `mdz_is_wilaya_manager()` تعتمد على **`user_roles` فقط**.  
من يعتمد اليوم على `profiles.role ∈ {manager, wilaya_manager, wilaya_mgr}` **بدون** صف في `user_roles` سيفقد صلاحية لوحة الولاية / المراجعة / التذاكر بعد التطبيق.

**لوحة الإدارة (admin/founder)** لا تتأثر بجسر `profiles.role` أصلاً — مصدرها `user_roles` (`admin` / `founder` / `super_admin`).  
لكن يجب **التحقق صراحة** أن حسابك أنت موجود في `user_roles` قبل أي شيء، حتى لا تُقفل خارج اللوحة لسبب منفصل (غياب صف elevation).

---

## ترتيب التنفيذ الآمن (غداً)

| خطوة | ماذا | أين |
|------|------|-----|
| 0 | تحقق حساب Founder/Admin (GATE) | `supabase/sql/adr003_backfill_01_discovery.sql` §GATE |
| 1 | اكتشاف: من لهم `profiles.role` إداري ولاية؟ | نفس الملف §1–2 |
| 2 | اكتشاف: من لديهم elevation مسبقاً؟ | §3 |
| 3 | معاينة قائمة الـ backfill (بدون كتابة) | §4 |
| 4 | تطبيق backfill داخل معاملة + سجل | `adr003_backfill_02_apply.sql` |
| 5 | تحقق ما بعد التطبيق (قبل 014) | `adr003_backfill_03_verify.sql` |
| 6 | تطبيق migration `014` على الإنتاج | SQL Editor / migrate |
| 7 | Smoke: مدير ولاية يفتح اللوحة + أنت تفتح لوحة الإدارة | يدوي |
| R | تراجع backfill فقط إن لزم | `adr003_backfill_04_rollback.sql` |

**قاعدة:** لا تطبّق `014` قبل أن تكون خطوة 0 و 5 خضراء.

---

## 1) استعلام الاكتشاف — المديرون في `profiles.role`

شغّل في Supabase SQL Editor (قراءة فقط):

```sql
-- العدد
select lower(btrim(role)) as profile_role, count(*) as n
from public.profiles
where lower(btrim(coalesce(role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
group by 1
order by n desc;

-- القائمة (من هم)
select
  p.id,
  p.email,
  p.full_name,
  p.member_id,
  p.wilaya,
  p.status,
  p.role as profile_role,
  p.created_at
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
order by p.created_at nulls last;
```

الملف الكامل: [`supabase/sql/adr003_backfill_01_discovery.sql`](../../supabase/sql/adr003_backfill_01_discovery.sql)

---

## 2) سكريبت backfill (آمن /idempotent)

الملف: [`supabase/sql/adr003_backfill_02_apply.sql`](../../supabase/sql/adr003_backfill_02_apply.sql)

ما يفعله:

1. يرفض المتابعة إن لم يوجد **أي** صف `founder`/`admin`/`super_admin` في `user_roles` (حارس قفل المنصة).
2. يختار فقط من لديهم `profiles.role` إداري ولاية **ولا** يملكون أي elevation ولاية في `user_roles`.
3. يُدرج `wilaya_manager` عبر `ON CONFLICT DO NOTHING`.
4. يكتب دفعة في `public.mdz_ops_backfill_log` (يُنشأ إن لم يوجد) لتمكين التراجع لاحقاً.
5. **لا يمس** صفوف `admin` / `founder` / `super_admin`.
6. **لا يعدّل** `profiles.role` (يبقى تسمية عضوية).

### اختبار يثبت عدم فقدان الصلاحية

الملف: [`supabase/sql/adr003_backfill_03_verify.sql`](../../supabase/sql/adr003_backfill_03_verify.sql)

يجب أن تُرجع صفوف التحقق:

- `managers_missing_elevation = 0`
- حسابك: `has_platform_admin = true`
- عينة: كل من كان `profiles.role=manager` لديه الآن `user_roles` ولاية

اختبار ثابت في المستودع: `npm run test:migration-review` يشمل  
`tests/adr003-backfill-plan.test.mjs` (شكل SQL + حراس الأمان — **لا** يتصل بالإنتاج).

محاكاة منطقية محلية (Node): من كان يعتمد على الجسر فقط → بعد المحاكاة `wouldHaveAccess=true` بفضل الصف المُضاف.

---

## 3) خطة التراجع (rollback)

الملف: [`supabase/sql/adr003_backfill_04_rollback.sql`](../../supabase/sql/adr003_backfill_04_rollback.sql)

- يحذف **فقط** صفوف `user_roles` المرتبطة بـ `batch_id` في `mdz_ops_backfill_log` لهذه الدفعة.
- لا يحذف elevation يدوياً سابقاً ولا أدوار المنصة.
- إن طُبّق `014` مسبقاً وأردت الرجوع الكامل للسلوك القديم: أعد تعريف `mdz_is_wilaya_manager()` من نسخة `012` (جسر `profiles.role`) — موثّق في ملف التراجع كخطوة اختيارية منفصلة.

---

## 4) هل حسابك مشمول في الـ backfill؟ هل تُقفل خارج لوحة الإدارة؟

### لوحة الإدارة

الـ backfill **لا يضيف ولا يحذف** أدوار `admin`/`founder`/`super_admin`.  
تطبيق `014` **لا يغيّر** `mdz_is_platform_admin()`.

→ طالما عندك صف elevation منصة في `user_roles`، **لن تُقفل** خارج لوحة الإدارة بسبب هذه الخطة.

### هل أنت ضمن قائمة مديري الولاية؟

فقط إذا كان `profiles.role` عندك `manager` / `wilaya_manager` / `wilaya_mgr` **و** لا تملك بعد elevation ولاية في `user_roles`.  
حتى لو شُملت، النتيجة = إضافة `wilaya_manager` بجانب دور المنصة — لا إزالة.

### GATE — شغّل قبل أي كتابة (بدّل البريد إن لزم)

بريد حساب Cursor المرتبط بهذه البيئة التشغيلية: `sadbenmoad7@gmail.com`  
**أكّد غداً** أنه فعلاً بريد Founder على **إنتاج** MawashiDZ؛ إن اختلف، استبدله:

```sql
select
  p.id,
  p.email,
  p.role as profile_role,
  coalesce(
    array_agg(distinct ur.role) filter (where ur.role is not null),
    '{}'
  ) as user_roles,
  exists (
    select 1 from public.user_roles x
    where x.user_id = p.id
      and x.role in ('admin', 'founder', 'super_admin')
  ) as has_platform_admin
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
where lower(p.email) = lower('sadbenmoad7@gmail.com')
group by p.id, p.email, p.role;
```

| نتيجة `has_platform_admin` | القرار |
|----------------------------|--------|
| `true` | يمكنك المتابعة للـ backfill ثم `014` |
| `false` أو لا صف | **توقّف.** أدرج يدوياً `founder` (أو `admin`) في `user_roles` لحسابك أولاً، ثم أعد GATE |
| لا صف بالبريد | البريد غير موجود على الإنتاج — صحّح البريد |

إدراج Founder يدوياً (فقط إن GATE فشل — service_role / SQL Editor):

```sql
-- استبدل USER_UUID بعد التحقق من id في الاستعلام أعلاه
insert into public.user_roles (user_id, role)
values ('USER_UUID', 'founder')
on conflict (user_id, role) do nothing;
```

(يتطلب وجود الفهرس الفريد `user_roles_user_id_role_uidx` من migration 008.)

---

## ما لن تفعله هذه الخطة

- لا merge إلى `main`
- لا تطبيق `014` تلقائياً
- لا تدوير أسرار
- لا حذف بيانات أعضاء
- لا تغيير `profiles.role`

---

## معيار القبول غداً

1. مخرجات الاكتشاف محفوظة (عدد + قائمة).  
2. GATE لحسابك = `has_platform_admin=true`.  
3. Apply نجح و`managers_missing_elevation=0`.  
4. أنت تدخل لوحة الإدارة؛ مدير ولاية عيّنة يدخل لوحة الولاية.  
5. بعدها فقط: تطبيق `014` + smoke قصير.
