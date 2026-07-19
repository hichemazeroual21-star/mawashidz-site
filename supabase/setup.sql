-- ============================================================
-- MawashiDZ — نقطة دخول إعداد Supabase (v1.8.0 / Phase 0)
--
-- هذا الملف موجّه فقط. انسخ وشغّل ملفات الـ migration من
-- Supabase Dashboard → SQL Editor → Run.
--
-- ┌─────────────────────────────────────────────────────────┐
-- │ أ) قاعدة موجودة مسبقًا (حالة MawashiDZ الحالية)        │
-- │    شغّل فقط:                                            │
-- │    migrations/20260718233000_phase0_existing_database.sql│
-- │                                                         │
-- │ ب) مشروع Supabase جديد / فارغ                           │
-- │    1) migrations/20260718233001_phase0_fresh_database.sql│
-- │    2) migrations/20260718233000_phase0_existing_database.sql│
-- └─────────────────────────────────────────────────────────┘
--
-- التحقق المحلي:
--   bash supabase/tests/run_phase0_tests.sh
--
-- Rollback:
--   supabase/rollbacks/20260718233000_phase0_existing_database_rollback.sql
--
-- مهم:
--   - الملفات idempotent وآمنة لإعادة التشغيل
--   - لا تحذف بيانات
--   - لا تُطبَّق تلقائيًا على Production من هذا المستودع
--   - الملف القديم 20260718220000_align_existing_schema.sql مُستبدل بـ Phase 0
-- ============================================================

select
  'MawashiDZ Phase 0 router' as notice,
  'Existing DB: run migrations/20260718233000_phase0_existing_database.sql' as existing_path,
  'Fresh DB: run 20260718233001 then 20260718233000' as fresh_path;
