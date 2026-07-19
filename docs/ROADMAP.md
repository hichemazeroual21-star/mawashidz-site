# MawashiDZ Platform Roadmap

Vision: a trusted, mobile-first digital platform for Algeria’s livestock sector — breeders, veterinarians, feed suppliers, buyers, wilaya managers, verification officers, and national administration.

## Principles
- Do not destroy existing data or working features
- Idempotent, reversible database changes
- No automatic Production applies / no automatic merges
- Least privilege, auditability, multilingual RTL-first UX

## Phases

| Phase | Focus | Status |
|------:|-------|--------|
| 0 | Database foundation (`member_id`, profiles, RPCs, RLS) | **In progress (this PR)** — local tests green; Production apply is manual |
| 1 | Professional authentication flows | Pending |
| 2 | Real RBAC (19 roles) | Pending |
| 3 | Unified application shell + role dashboards | Pending |
| 4 | QR identity & animal traceability | Pending |
| 5 | Transactional email (Resend/Postmark via Worker) | Pending |
| 6 | Workflow / routing engine | Pending |
| 7 | i18n AR/FR/EN/DE | Pending |
| 8 | UI craft & micro-interactions | Pending |
| 9 | Performance & quality gates | Pending |
| 10 | Security hardening | Pending |
| 11 | Netlify → Cloudflare migration | Pending |
| 12 | PWA first; native Android only after approval | Pending |

## Current stack (as-is)
- Static `index.html` + Netlify function for news
- Supabase Auth/REST (schema incomplete until Phase 0 is applied)
- Cloudflare present on Supabase edge; site still Netlify/GitHub Pages oriented
