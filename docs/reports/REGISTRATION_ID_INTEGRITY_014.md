# Migration 014 — registration_id integrity

**Branch:** `cursor/registration-id-integrity-3447`  
**File:** `supabase/migrations/014_registration_id_integrity.sql`  
**Apply:** manual on production Supabase after Founder review — **not** auto-applied by CI/agent.

## What it does

1. **Backfill from JSON** — `registration_id = message::jsonb ->> 'registration_id'` when column empty and JSON holds a `MDZ-REG-*` value (same idea as migration `004`).
2. **Generate for remaining real pending rows** — `MDZ-REG-YYYY-NNNNNN` via sequence `mdz_registration_id_seq`. Skips test emails matching `example.com` / `.local` / `probe` / `e2e`.
3. **BEFORE INSERT trigger** `mdz_registrations_assign_registration_id` — if the client omits `registration_id`, assign from message JSON or generate server-side.

Does **not** change dashboard logic that hides approve/reject when `registration_id` is blank (that gate stays correct).

## Operator apply checklist

1. Confirm SQL Editor project = production MawashiDZ (`fpjvjfgwbfehhcvdirpy`).
2. Optional discovery:

```sql
select count(*) as missing
from public.registrations
where nullif(btrim(coalesce(registration_id,'')),'') is null
  and lower(coalesce(status,'pending')) in ('pending','new','');
```

3. Run the full contents of `014_registration_id_integrity.sql`.
4. Re-check missing count → expect 0 for non-test pending rows.
5. Smoke: open لوحة الإدارة → pending rows show `MDZ-REG-…` and Approve/Reject.
