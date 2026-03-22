#!/usr/bin/env bash
# =============================================================================
# TravelDeals AI — Test runner & reporter
# Usage: bash scripts/run-tests.sh [--watch] [--coverage]
# =============================================================================

set -euo pipefail

WATCH=false
COVERAGE=false
for arg in "$@"; do
  [[ "$arg" == "--watch" ]]    && WATCH=true
  [[ "$arg" == "--coverage" ]] && COVERAGE=true
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPORT_DIR="$ROOT/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/test-report-$TIMESTAMP.txt"

mkdir -p "$REPORT_DIR"

section() { echo -e "\n${BLUE}▶ $1${NC}"; }

# ─── 1. TypeScript check ──────────────────────────────────────────────────────
section "TypeScript type-check"
if npx tsc --noEmit 2>&1 | tee -a "$REPORT_FILE"; then
  echo -e "${GREEN}  ✓ No TypeScript errors${NC}"
else
  echo -e "${YELLOW}  ⚠ TypeScript errors found${NC}"
fi

# ─── 2. ESLint ───────────────────────────────────────────────────────────────
section "ESLint"
if npm run lint 2>&1 | tee -a "$REPORT_FILE"; then
  echo -e "${GREEN}  ✓ ESLint passed${NC}"
else
  echo -e "${YELLOW}  ⚠ ESLint issues found${NC}"
fi

# ─── 3. Unit / integration tests (Vitest) ─────────────────────────────────────
section "Vitest"

if $WATCH; then
  echo "  Starting in watch mode..."
  npx vitest
elif $COVERAGE; then
  echo "  Running with coverage..."
  npx vitest run --coverage --reporter=verbose 2>&1 | tee -a "$REPORT_FILE"
  echo -e "\n${BLUE}  Coverage report written to: coverage/${NC}"
else
  npx vitest run --reporter=verbose 2>&1 | tee -a "$REPORT_FILE"
fi

# ─── 4. Build check ──────────────────────────────────────────────────────────
if ! $WATCH; then
  section "Next.js build check"
  echo "  Running production build (this may take a moment)..."
  if npm run build 2>&1 | tee -a "$REPORT_FILE"; then
    echo -e "${GREEN}  ✓ Build succeeded${NC}"
  else
    echo -e "${RED}  ✗ Build failed${NC}"
  fi
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
if ! $WATCH; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "  Report saved to: ${BLUE}$REPORT_FILE${NC}"
  if $COVERAGE; then
    echo -e "  Coverage report:  ${BLUE}coverage/index.html${NC}"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
