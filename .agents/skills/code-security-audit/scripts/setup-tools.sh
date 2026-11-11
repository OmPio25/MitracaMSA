#!/usr/bin/env bash
# =============================================================================
# setup-tools.sh
# Verifies and installs required security audit tools (no API key needed).
# Tools: semgrep, gitleaks, npm (bundled with Node.js)
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================="
echo " Code Security Audit — Tool Setup"
echo "============================================="

# --- Create results directory ---
RESULTS_DIR=".agents/skills/code-security-audit/results"
mkdir -p "$RESULTS_DIR"
echo -e "${GREEN}✓ Results directory ready: $RESULTS_DIR${NC}"

# --- Check Node.js / npm ---
if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    echo -e "${GREEN}✓ npm $NPM_VER found${NC}"
else
    echo -e "${RED}✗ npm not found. Please install Node.js first.${NC}"
    exit 1
fi

# --- Check / Install semgrep ---
echo ""
echo "Checking semgrep..."
if command -v semgrep &> /dev/null; then
    SEMGREP_VER=$(semgrep --version)
    echo -e "${GREEN}✓ semgrep $SEMGREP_VER found${NC}"
else
    echo -e "${YELLOW}⚠ semgrep not found. Attempting to install via pip...${NC}"
    if command -v pip3 &> /dev/null; then
        pip3 install semgrep --quiet
        echo -e "${GREEN}✓ semgrep installed successfully${NC}"
    elif command -v pip &> /dev/null; then
        pip install semgrep --quiet
        echo -e "${GREEN}✓ semgrep installed successfully${NC}"
    else
        echo -e "${RED}✗ pip not found. Install semgrep manually: https://semgrep.dev/docs/getting-started/${NC}"
        SEMGREP_MISSING=true
    fi
fi

# --- Check / Install gitleaks ---
echo ""
echo "Checking gitleaks..."
if command -v gitleaks &> /dev/null; then
    GITLEAKS_VER=$(gitleaks version)
    echo -e "${GREEN}✓ gitleaks $GITLEAKS_VER found${NC}"
else
    echo -e "${YELLOW}⚠ gitleaks not found. Attempting to install...${NC}"
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then ARCH="x64"; fi
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi

    GITLEAKS_VERSION="8.21.2"
    DOWNLOAD_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${OS}_${ARCH}.tar.gz"

    if curl -sSL "$DOWNLOAD_URL" -o /tmp/gitleaks.tar.gz 2>/dev/null; then
        tar -xzf /tmp/gitleaks.tar.gz -C /tmp gitleaks
        sudo mv /tmp/gitleaks /usr/local/bin/gitleaks 2>/dev/null || mv /tmp/gitleaks ~/.local/bin/gitleaks 2>/dev/null || {
            mkdir -p ~/bin && mv /tmp/gitleaks ~/bin/gitleaks
            echo -e "${YELLOW}  Note: gitleaks installed to ~/bin. Add ~/bin to your PATH if needed.${NC}"
        }
        echo -e "${GREEN}✓ gitleaks installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Could not download gitleaks automatically.${NC}"
        echo "  Install manually from: https://github.com/gitleaks/gitleaks"
        GITLEAKS_MISSING=true
    fi
fi

# --- Summary ---
echo ""
echo "============================================="
echo " Setup Summary"
echo "============================================="
echo -e "${GREEN}✓ npm audit       — READY${NC}"
command -v semgrep &> /dev/null && echo -e "${GREEN}✓ semgrep         — READY${NC}" || echo -e "${YELLOW}⚠ semgrep         — SKIPPED (install manually)${NC}"
command -v gitleaks &> /dev/null && echo -e "${GREEN}✓ gitleaks        — READY${NC}" || echo -e "${YELLOW}⚠ gitleaks        — SKIPPED (install manually)${NC}"
echo ""
echo "Run the audit with:"
echo "  bash .agents/skills/code-security-audit/scripts/run-audit.sh"
echo "============================================="
