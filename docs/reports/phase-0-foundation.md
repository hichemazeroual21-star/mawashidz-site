# Phase 0 Report — Database Foundation

Date: 2026-07-18  
Branch: `cursor/phase0-db-foundation-ba07`  
Agent role: Principal technical team (architect / Supabase / QA)

## 1) ما وجدته

- المستودع صغير: `index.html` + Netlify news + `supabase/setup.sql`.
- لا يوجد مجلد `/docs` سابقًا؛ لا يوجد ADR ولا مخطط موثّق.
- فحص Production عبر REST (`fpjvjfgwbfehhcvdirpy`) أكّد أن:
  - `profiles` يملك فقط: `id, full_name, phone, email, created_at`
  - **لا يوجد** `member_id` ولا الأعمدة المرتبطة
  - **لا يوجد** `member_id_counters`
  - **RPC مفقودة**: `allocate_member_id`, `resolve_login_identifier`
  - جدول تراثي `breeders` موجود
- Migration السابقة `20260718220000` دُمجت في git (PR #4) لكن **لم تُطبَّق على Production**.
- الواجهة تستدعي RPC ثم تسقط إلى رقم عشوائي — لذلك تظهر أرقام غير تسلسلية اليوم.

## 2) ما أصلحته

- Migration خاصة بالقواعد الموجودة: `ALTER TABLE … ADD COLUMN IF NOT EXISTS` فقط لـ `profiles`.
- Migration منفصلة للقواعد الجديدة (bootstrap ثم hardening).
- `allocate_member_id` مع قفل صف + `pg_advisory_xact_lock`.
- `handle_new_user` يخصص `member_id` بشكل موثوق ويُنشئ Profile تلقائيًا.
- `resolve_login_identifier` يدعم MDZ والهاتف الجزائري بصيغ متعددة.
- حماية أعمدة حساسة (`member_id` / `role` / `status`) بعد تعيينها.
- إلغاء منح PUBLIC غير الضروري؛ إبقاء INSERT العام فقط لجداول الطلبات.
- اختبارات محلية تشمل إعادة التشغيل (idempotent) و100 تخصيص متزامن.
- ADR + توثيق المخطط + Rollback.

## 3) الملفات التي عدلتها / أضفتها

- `supabase/migrations/20260718233000_phase0_existing_database.sql` **(جديد)**
- `supabase/migrations/20260718233001_phase0_fresh_database.sql` **(جديد)**
- `supabase/migrations/20260718220000_align_existing_schema.sql` (وُسِم Deprecated)
- `supabase/setup.sql` (موجّه Phase 0)
- `supabase/rollbacks/*`
- `supabase/tests/**`
- `docs/**`
- `CHANGELOG.md`
- `README.md`

## 4) تغييرات قاعدة البيانات

| التغيير | النوع |
|---------|-------|
| `member_id_counters` | CREATE IF NOT EXISTS |
| أعمدة `profiles.*` | ADD COLUMN IF NOT EXISTS |
| فهارس + check format | CREATE IF NOT EXISTS / DO block |
| الدوال الثلاث + حماية الأعمدة | CREATE OR REPLACE |
| Trigger على `auth.users` | DROP IF EXISTS + CREATE |
| RLS/Grants | تمكين + سياسات محدودة |

**لم يُمس Production بعد.**

## 5) تأثير الأمان

- إيجابي: RLS على counters بدون سياسات؛ حماية immutability؛ PUBLIC revoke على الدوال الحساسة.
- متبقٍ مقصود لمرحلة 1: `anon` ما زال ينفّذ `allocate_member_id` لدعم UX التسجيل الحالي (مع تخصيص نهائي server-side في الـ trigger).
- لم تُضف أسرار جديدة؛ مفتاح الواجهة publishable ما زال في `index.html` (معروف مسبقًا).

## 6) الاختبارات الفعلية

```bash
bash supabase/tests/run_phase0_tests.sh
```

على PostgreSQL 16 محلي يحاكي:
- مخطط Production الحالي + صف تراثي
- قاعدة فارغة (fresh)
- إعادة تشغيل الـ migrations
- 100 عملية `allocate_member_id` متوازية

## 7) النتائج الدقيقة

| اختبار | النتيجة |
|--------|---------|
| Existing migration apply | PASS |
| Existing re-run idempotent | PASS |
| Legacy row preserved | PASS |
| Columns present | PASS |
| `allocate_member_id` / `resolve_login_identifier` / `handle_new_user` | PASS |
| 100 concurrent IDs unique | PASS |
| Fresh path + re-run | PASS |
| counters RLS policies = 0 | PASS |

Artifact: `/opt/cursor/artifacts/phase0_concurrent_member_ids.txt`

## 8) Screenshots / artifacts

- `phase0_concurrent_member_ids.txt` — 100 معرّف فريد `MDZ-F-******`

## 9) الخطوات اليدوية المطلوبة منك

1. افتح Supabase → SQL Editor.
2. الصق وشغّل كامل ملف:  
   `supabase/migrations/20260718233000_phase0_existing_database.sql`
3. أعد تشغيل نفس الملف مرة ثانية — يجب أن ينجح بدون أخطاء (idempotent).
4. اختبر من SQL:
   ```sql
   select public.allocate_member_id('breeder');
   select public.allocate_member_id('breeder');
   ```
5. Auth → URL Configuration: أضف `https://mawashidz.com/**` إلى Redirect URLs.
6. Auth → Emails → Confirm signup: حدّث القالب العربي (انظر README).
7. **لا تحذف Netlify ولا تغيّر DNS في هذه المرحلة.**

## 10) المخاطر المتبقية

- Phase 0 غير مطبّق على Production حتى تنفّذ الخطوة اليدوية.
- تخصيص الأرقام من المتصفح ما زال ممكنًا (مخفَّف بالتحقق داخل `handle_new_user`).
- لا يوجد service_role admin path بعد لتغيير `status` (مرحلة 2).
- OpenAPI introspection أصبح يتطلب secret key — التحقق المستقبلي يحتاج صلاحيات أعلى.

## 11) خطة Rollback

1. شغّل `supabase/rollbacks/20260718233000_phase0_existing_database_rollback.sql`
2. الأعمدة والبيانات تبقى (حفاظًا على المستخدمين)
3. الواجهة ستعود تلقائيًا إلى الصيغة العشوائية عند غياب RPC

## 12) TODOs

- [ ] Owner: تطبيق Phase 0 SQL على Supabase Production
- [ ] Phase 1: نقل التخصيص بالكامل بعيدًا عن العميل + rate limit / brute-force
- [ ] Phase 1: استرجاع كلمة المرور + رسائل خطأ غير كاشفة
- [ ] Phase 2: RBAC الكامل + سياسات Wilaya-scoped
- [ ] إزالة اعتماد EmailJS للرسائل الحساسة (Phase 5)

## 13) المرحلة التالية المقترحة

**المرحلة 1 — Authentication احترافي** بعد تأكيدك أن SQL Phase 0 نُفِّذ بنجاح على Supabase (لقطة من نتيجة `allocate_member_id` تكفي).
