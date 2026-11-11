#!/usr/bin/env bash
# =============================================================================
# run-audit.sh
# Runs all security scanners and saves results to the results/ directory.
# No API key or external token required.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RESULTS_DIR="$PROJECT_ROOT/.agents/skills/code-security-audit/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$RESULTS_DIR"

echo ""
echo -e "${BOLD}=============================================${NC}"
echo -e "${BOLD} Code Security Audit — MitracaMSA${NC}"
echo -e "${BOLD} Started: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}=============================================${NC}"
echo ""

# =============================================================================
# SCAN 1: npm audit — Dependency Vulnerabilities
# =============================================================================
echo -e "${BLUE}[1/3] Running npm audit (dependency vulnerability check)...${NC}"
cd "$PROJECT_ROOT"

if npm audit --json > "$RESULTS_DIR/npm-audit.json" 2>/dev/null; then
    echo -e "${GREEN}✓ npm audit completed — no critical issues found${NC}"
else
    echo -e "${YELLOW}⚠ npm audit completed — vulnerabilities detected (see results)${NC}"
fi

# Generate human-readable summary
npm audit --audit-level=low 2>&1 | tee "$RESULTS_DIR/npm-audit-summary.txt" || true
echo ""

# =============================================================================
# SCAN 2: semgrep — Static Application Security Testing (SAST)
# =============================================================================
echo -e "${BLUE}[2/3] Running semgrep SAST scan...${NC}"

if command -v semgrep &> /dev/null; then
    # Run semgrep with security-focused rulesets (all free, no login required)
    semgrep scan \
        --config "p/typescript" \
        --config "p/react" \
        --config "p/nodejs" \
        --config "p/secrets" \
        --config "p/owasp-top-ten" \
        --json \
        --output "$RESULTS_DIR/semgrep-report.json" \
        --severity ERROR \
        --severity WARNING \
        --no-git-ignore \
        "$PROJECT_ROOT/src" \
        2>/dev/null || true

    # Generate human-readable output
    semgrep scan \
        --config "p/typescript" \
        --config "p/react" \
        --config "p/nodejs" \
        --config "p/secrets" \
        --config "p/owasp-top-ten" \
        --severity ERROR \
        --severity WARNING \
        --no-git-ignore \
        "$PROJECT_ROOT/src" \
        2>&1 | tee "$RESULTS_DIR/semgrep-summary.txt" || true

    echo -e "${GREEN}✓ semgrep scan completed${NC}"
else
    echo -e "${YELLOW}⚠ semgrep not found — skipping SAST scan${NC}"
    echo '{"results":[],"errors":[],"skipped":true}' > "$RESULTS_DIR/semgrep-report.json"
    echo "semgrep not installed — SAST scan skipped" > "$RESULTS_DIR/semgrep-summary.txt"
fi
echo ""

# =============================================================================
# SCAN 3: gitleaks — Secret & Credential Leak Detection
# =============================================================================
echo -e "${BLUE}[3/3] Running gitleaks secret scan...${NC}"

if command -v gitleaks &> /dev/null; then
    # Scan git history for secrets
    gitleaks detect \
        --source="$PROJECT_ROOT" \
        --report-format=json \
        --report-path="$RESULTS_DIR/secrets-report.json" \
        --no-git=false \
        2>&1 | tee "$RESULTS_DIR/secrets-summary.txt" || true

    # Also scan current files (not just git history)
    gitleaks detect \
        --source="$PROJECT_ROOT" \
        --no-git=true \
        --report-format=json \
        --report-path="$RESULTS_DIR/secrets-current-files.json" \
        2>/dev/null || true

    echo -e "${GREEN}✓ gitleaks scan completed${NC}"
else
    echo -e "${YELLOW}⚠ gitleaks not found — skipping secrets scan${NC}"
    echo '[]' > "$RESULTS_DIR/secrets-report.json"
    echo '[]' > "$RESULTS_DIR/secrets-current-files.json"
    echo "gitleaks not installed — secrets scan skipped" > "$RESULTS_DIR/secrets-summary.txt"
fi
echo ""

# =============================================================================
# SCAN 4: TypeScript Compilation Check
# =============================================================================
echo -e "${BLUE}[+] Running TypeScript type check...${NC}"
npx tsc --noEmit 2>&1 | tee "$RESULTS_DIR/typescript-check.txt" || true
echo -e "${GREEN}✓ TypeScript check completed${NC}"
echo ""

# =============================================================================
# Quick .env leak check (manual grep — no tools needed)
# =============================================================================
echo -e "${BLUE}[+] Checking for .env file exposure...${NC}"
ENV_ISSUES=""

# Check if .env is in .gitignore
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
    if grep -q "^\.env$\|^\.env\b" "$PROJECT_ROOT/.gitignore"; then
        echo -e "${GREEN}  ✓ .env is in .gitignore${NC}"
    else
        echo -e "${RED}  ✗ WARNING: .env may NOT be in .gitignore!${NC}"
        ENV_ISSUES="$ENV_ISSUES\n- .env not found in .gitignore"
    fi
fi

# Check if .env is tracked by git
if git -C "$PROJECT_ROOT" ls-files --error-unmatch .env &>/dev/null 2>&1; then
    echo -e "${RED}  ✗ CRITICAL: .env is tracked by git! Remove it immediately.${NC}"
    ENV_ISSUES="$ENV_ISSUES\n- .env is git-tracked — run: git rm --cached .env"
else
    echo -e "${GREEN}  ✓ .env is NOT tracked by git${NC}"
fi

# Check for hardcoded secrets patterns in source code
echo -e "${BLUE}[+] Checking for hardcoded credentials in source...${NC}"
grep -rn \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" \
    -E "(password|secret|api_key|apikey|token|passwd)\s*=\s*['\"][^'\"]{6,}['\"]" \
    "$PROJECT_ROOT/src" \
    "$PROJECT_ROOT/next.config.mjs" \
    "$PROJECT_ROOT/drizzle.config.ts" \
    2>/dev/null | grep -v "node_modules" | grep -v ".next" \
    > "$RESULTS_DIR/hardcoded-secrets-grep.txt" || true

if [ -s "$RESULTS_DIR/hardcoded-secrets-grep.txt" ]; then
    echo -e "${RED}  ✗ Potential hardcoded credentials found — check results/hardcoded-secrets-grep.txt${NC}"
else
    echo -e "${GREEN}  ✓ No obvious hardcoded credentials found in source${NC}"
fi
echo ""

# =============================================================================
# Final Summary
# =============================================================================
echo -e "${BOLD}=============================================${NC}"
echo -e "${BOLD} Scan Complete — Results saved to:${NC}"
echo -e "${BOLD} $RESULTS_DIR/${NC}"
echo -e "${BOLD}=============================================${NC}"
echo ""
echo "Files generated:"
ls -lh "$RESULTS_DIR/" | awk '{print "  " $NF " (" $5 ")"}'
echo ""
echo -e "${BOLD}Next step:${NC} The agent will now read these results and perform"
echo "the AI White-Box Deep Review as described in SKILL.md Phase 3."
echo ""
echo "Or manually open the results:"
echo "  cat $RESULTS_DIR/npm-audit-summary.txt"
echo "  cat $RESULTS_DIR/semgrep-summary.txt"
echo "  cat $RESULTS_DIR/secrets-summary.txt"
