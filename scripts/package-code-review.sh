#!/usr/bin/env bash
# Package MawashiDZ source for external code review (no secrets beyond public keys in index.html).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE_STAMP="${1:-$(date -u +%Y-%m-%d)}"
OUT_DIR="$ROOT/artifacts"
ZIP_NAME="mawashidz-external-code-review-${DATE_STAMP}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"
STAGING="$ROOT/.package-staging"

rm -rf "$STAGING"
mkdir -p "$OUT_DIR" "$STAGING/mawashidz"

cd "$ROOT"
find . \
  \( -path './node_modules' -o -path './node_modules/*' \) -prune -o \
  \( -path './.git' -o -path './.git/*' \) -prune -o \
  \( -path './artifacts' -o -path './artifacts/*' \) -prune -o \
  \( -path './supabase/tests/.pgdata' -o -path './supabase/tests/.pgdata/*' \) -prune -o \
  \( -path './.package-staging' -o -path './.package-staging/*' \) -prune -o \
  \( -path './dist' -o -path './build' -o -path './coverage' -o -path './.cache' \) -prune -o \
  -type f \
  ! -name '*.zip' \
  ! -name '*.log' \
  ! -name '.DS_Store' \
  ! -name 'Thumbs.db' \
  -print | while IFS= read -r file; do
    rel="${file#./}"
    dest="$STAGING/mawashidz/$rel"
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
  done

GIT_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
GIT_COMMIT="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"

cat > "$STAGING/mawashidz/CODE_REVIEW_PACKAGE.txt" <<EOF
MawashiDZ — External Code Review Package
Generated (UTC): $(date -u +"%Y-%m-%d %H:%M:%S")
Git branch: ${GIT_BRANCH}
Git commit: ${GIT_COMMIT}

Included: all project source, docs, Supabase SQL, Netlify config, tests.
Excluded: node_modules, .git, build artifacts, local Postgres test data (.pgdata), prior ZIPs.

Restore dev dependencies:
  npm install
  npm run test:db

Note: index.html contains the public Supabase publishable key (expected for static sites).
Do not commit service_role keys. Review RLS and SQL migrations carefully.
EOF

(
  cd "$STAGING"
  zip -rq "$ZIP_PATH" mawashidz
)

rm -rf "$STAGING"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ZIP_PATH" > "${ZIP_PATH}.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ZIP_PATH" > "${ZIP_PATH}.sha256"
fi

if [[ -d /opt/cursor/artifacts ]]; then
  cp "$ZIP_PATH" "${ZIP_PATH}.sha256" /opt/cursor/artifacts/ 2>/dev/null || true
fi

echo "Created: $ZIP_PATH"
echo "Size: $(du -h "$ZIP_PATH" | awk '{print $1}')"
[[ -f "${ZIP_PATH}.sha256" ]] && cat "${ZIP_PATH}.sha256"
