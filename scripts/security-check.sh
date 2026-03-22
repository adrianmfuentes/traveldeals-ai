#!/usr/bin/env bash
# =============================================================================
# TravelDeals AI — Security check & auto-repair script
# Usage: bash scripts/security-check.sh [--fix]
# =============================================================================

set -euo pipefail

FIX=false
[[ "${1:-}" == "--fix" ]] && FIX=true

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

pass()  { echo -e "${GREEN}  ✓${NC} $1"; ((PASS++)); }
warn()  { echo -e "${YELLOW}  ⚠${NC} $1"; ((WARN++)); }
fail()  { echo -e "${RED}  ✗${NC} $1"; ((FAIL++)); }
section() { echo -e "\n${BLUE}▶ $1${NC}"; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ─── 1. Environment variables ─────────────────────────────────────────────────
section "Environment variables"

check_env() {
  local key="$1"
  local min_len="${2:-1}"
  local val="${!key:-}"
  if [[ -z "$val" ]]; then
    fail "$key is not set"
  elif [[ ${#val} -lt $min_len ]]; then
    fail "$key is set but too short (min $min_len chars)"
  else
    pass "$key is set (${#val} chars)"
  fi
}

if [[ -f ".env" ]]; then
  set -a; source .env; set +a
  check_env "DATABASE_URL"
  check_env "REDIS_URL"
  check_env "NEXTAUTH_SECRET" 32
  check_env "NEXTAUTH_URL"
  check_env "GROQ_API_KEY"
  check_env "SERPAPI_API_KEY"
else
  warn ".env file not found — skipping env checks"
fi

# ─── 2. .gitignore audit ─────────────────────────────────────────────────────
section ".gitignore audit"

check_gitignore() {
  local pattern="$1"
  if grep -q "$pattern" .gitignore 2>/dev/null; then
    pass ".gitignore covers: $pattern"
  else
    fail ".gitignore is missing: $pattern"
    if $FIX; then
      echo "$pattern" >> .gitignore
      echo "       → Added '$pattern' to .gitignore"
    fi
  fi
}

check_gitignore ".env"
check_gitignore ".env.local"
check_gitignore "node_modules"
check_gitignore ".claude/"
check_gitignore "reports/"

# Check for secrets accidentally staged
if git rev-parse --git-dir > /dev/null 2>&1; then
  if git diff --cached --name-only | grep -qE '\.env$|\.env\.local$'; then
    fail "A .env file is staged for commit!"
  else
    pass "No .env files staged for commit"
  fi
fi

# ─── 3. npm audit ────────────────────────────────────────────────────────────
section "npm dependency audit"

AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
CRITICAL=$(echo "$AUDIT_OUTPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
    try { const j=JSON.parse(d); console.log(j.metadata?.vulnerabilities?.critical ?? 0); }
    catch { console.log(0); }
  });
" 2>/dev/null || echo "0")
HIGH=$(echo "$AUDIT_OUTPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
    try { const j=JSON.parse(d); console.log(j.metadata?.vulnerabilities?.high ?? 0); }
    catch { console.log(0); }
  });
" 2>/dev/null || echo "0")

if [[ "$CRITICAL" -gt 0 ]]; then
  fail "$CRITICAL critical vulnerabilities found"
  if $FIX; then
    echo "       → Running npm audit fix --force..."
    npm audit fix --force
  fi
elif [[ "$HIGH" -gt 0 ]]; then
  warn "$HIGH high-severity vulnerabilities found (run with --fix to attempt repair)"
  if $FIX; then
    npm audit fix
  fi
else
  pass "No critical/high vulnerabilities"
fi

# ─── 4. Sensitive file permissions ───────────────────────────────────────────
section "File permissions"

if [[ -f ".env" ]]; then
  PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null || echo "unknown")
  if [[ "$PERMS" == "600" || "$PERMS" == "0600" ]]; then
    pass ".env permissions: $PERMS (owner-only read)"
  else
    warn ".env permissions: $PERMS (recommended: 600)"
    if $FIX; then
      chmod 600 .env
      pass "  → Fixed .env permissions to 600"
    fi
  fi
fi

# ─── 5. Hardcoded secrets scan ───────────────────────────────────────────────
section "Hardcoded secrets scan"

PATTERNS=(
  "sk-[a-zA-Z0-9]{32,}"
  "AKIA[0-9A-Z]{16}"
  "gsk_[a-zA-Z0-9]{32,}"
  "AIza[0-9A-Za-z\-_]{35}"
  "password\s*=\s*['\"][^'\"]{6,}"
  "secret\s*=\s*['\"][^'\"]{6,}"
)

SECRETS_FOUND=false
for pat in "${PATTERNS[@]}"; do
  MATCHES=$(grep -rE "$pat" src/ worker/src/ --include="*.ts" --include="*.tsx" \
    --exclude-dir=node_modules -l 2>/dev/null || true)
  if [[ -n "$MATCHES" ]]; then
    fail "Possible hardcoded secret matching '$pat' in: $MATCHES"
    SECRETS_FOUND=true
  fi
done

if ! $SECRETS_FOUND; then
  pass "No hardcoded secrets detected in source files"
fi

# ─── 6. TypeScript strict check ──────────────────────────────────────────────
section "TypeScript compilation"

if npx tsc --noEmit 2>/dev/null; then
  pass "TypeScript: no errors"
else
  warn "TypeScript: compilation errors found (run: npx tsc --noEmit)"
fi

# ─── 7. ESLint ───────────────────────────────────────────────────────────────
section "ESLint"

if npm run lint --silent 2>/dev/null; then
  pass "ESLint: no issues"
else
  warn "ESLint: issues found (run: npm run lint)"
  if $FIX; then
    npx next lint --fix || true
  fi
fi

# ─── 8. Docker secrets check ─────────────────────────────────────────────────
section "Docker configuration"

if [[ -f "Dockerfile" ]]; then
  if grep -q "ENV.*SECRET\|ENV.*PASSWORD\|ENV.*KEY" Dockerfile 2>/dev/null; then
    fail "Dockerfile contains hardcoded secrets in ENV instructions"
  else
    pass "Dockerfile: no hardcoded secrets in ENV"
  fi
  if grep -q "^USER " Dockerfile 2>/dev/null; then
    pass "Dockerfile: runs as non-root user"
  else
    warn "Dockerfile: no USER instruction — container will run as root"
  fi
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e " ${GREEN}✓ Passed: $PASS${NC}  ${YELLOW}⚠ Warnings: $WARN${NC}  ${RED}✗ Failed: $FAIL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n  Run with ${BLUE}--fix${NC} to attempt automatic repairs."
  exit 1
fi
exit 0
