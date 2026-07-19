# Production Recovery Manifest — mawashidz.com v1.9.0

Recovered **2026-07-19** from live production (`https://mawashidz.com`). No production systems were modified.

## Source

| Field | Value |
|-------|-------|
| URL | `https://mawashidz.com/` |
| Recovery method | HTTPS GET (Cloudflare CDN) |
| Declared version | v1.9.0 (`MawashiDZ — الإصدار v1.9.0`) |
| Last known Pages commit (main) | `5d2a0ac20504e12c201f1b81a547825dbfae77a9` (v1.7.1) |

## Artifacts

### `index.html`

| Property | Value |
|----------|-------|
| Bytes | 555,849 |
| SHA-256 | `f0eb0d2927ff429bc849dd4b084ef743ad32c4daabc4a483d7ae03cff79ba260` |
| HTTP status | 200 |
| Content-Type | `text/html` |
| ETag | *(not present in response)* |
| Last-Modified | *(not present in response)* |
| CF-Cache-Status | HIT |
| Cache-Control | `public, max-age=0, must-revalidate` |

### `assets/algeria_cities.json`

| Property | Value |
|----------|-------|
| URL | `https://mawashidz.com/assets/algeria_cities.json` |
| Bytes | 73,570 |
| SHA-256 | `b0100c4f93e7a75e442fbe15324965a6c75fa3d1c09e87e8368a7bcb06008a20` |
| HTTP status | 200 |
| Content-Type | `application/json` |
| ETag | `"84ceefc082e191a7c72d4ec062618050"` |
| Content-Length | 73,570 |
| CF-Cache-Status | HIT |

**Note:** Live `index.html` is a single-file app (inline CSS/JS). Same-origin assets referenced at runtime: `./assets/algeria_cities.json` only. External: EmailJS CDN (`cdn.jsdelivr.net`).

## Raw capture files

Headers and downloads preserved under `.recovery/staging/` (not deployed; local recovery workspace only).

## Secrets / environment-specific values in recovered HTML

- `SUPABASE_URL` — public project URL (expected for static site)
- `SUPABASE_PUBLISHABLE_KEY` — publishable/anon key (expected for client-side auth)
- EmailJS public key and service/template IDs (expected for client-side email)

No `service_role` key or server secrets were found in the recovered artifact.
