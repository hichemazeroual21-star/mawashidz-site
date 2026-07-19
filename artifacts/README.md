# External code review packages

Pre-built ZIP archives for third-party security/architecture review.

| File | Description |
|------|-------------|
| `mawashidz-external-code-review-2026-07-19.zip` | Full source snapshot (no `node_modules`, no build artifacts) |
| `mawashidz-external-code-review-2026-07-19.zip.sha256` | SHA-256 checksum |

## Regenerate

```bash
npm run package:review
# or with a custom date stamp:
bash scripts/package-code-review.sh 2026-07-19
```

## Contents

- `index.html`, `assets/`, `netlify/`, `supabase/`, `docs/`, `scripts/`
- `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`
- `CODE_REVIEW_PACKAGE.txt` inside the ZIP (branch, commit, exclusions)

## Excluded

- `node_modules/`
- `.git/`
- `supabase/tests/.pgdata/` (embedded Postgres test data)
- `dist/`, `build/`, `coverage/`, logs, caches
