-- مواشي ديزاد — بوابة إصدار المحرك قبل تطبيق 022.
-- قراءة فقط. القيمة 180003 هي المحرك الذي اجتاز اختبار الحقن الحالي.
-- إذا اختلف الإصدار الرئيسي، لا يطبق 022 حتى يعاد الاختبار على الإصدار الحي
-- وتُحدّث قيمة المحرك المختبر في هذه البوابة و022.verify.sql داخل PR مراجع.

with engine_evidence as (
  select
    to_char(
      statement_timestamp() at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ) as captured_at_utc,
    current_database() as database_name,
    current_user::text as current_user_name,
    session_user::text as session_user_name,
    current_setting('role', true) as role_setting,
    current_setting('server_encoding') as server_encoding,
    current_setting('server_version_num')::integer as live_server_version_num,
    current_setting('server_version_num')::integer / 10000 as live_server_major,
    180003::integer as isolated_tested_server_version_num,
    18::integer as isolated_tested_server_major
)
select
  e.*,
  e.live_server_major = e.isolated_tested_server_major as engine_major_matches,
  case when
    e.current_user_name = 'postgres'
    and e.server_encoding = 'UTF8'
    and e.live_server_major = e.isolated_tested_server_major
  then 'OK_ENGINE_MAJOR_MATCH'
  else 'BLOCK_ENGINE_MAJOR_MISMATCH'
  end as check_result
from engine_evidence e;
