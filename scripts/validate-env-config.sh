#!/bin/bash
# Validate that all required environment variables are set
# Usage: ./scripts/validate-env-config.sh [production|development]

set -e

TARGET_ENV="${1:-development}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Validating environment configuration for: $TARGET_ENV"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
check_var() {
    local var_name=$1
    local var_value=$2
    local required=${3:-true}
    local min_length=${4:-0}
    
    if [ -z "$var_value" ]; then
        if [ "$required" = true ]; then
            echo -e "${RED}✗${NC} $var_name: NOT SET (REQUIRED)"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}⊘${NC} $var_name: not set (optional)"
            WARNINGS=$((WARNINGS + 1))
        fi
    elif [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}✗${NC} $var_name: too short (min $min_length chars, got ${#var_value})"
        ERRORS=$((ERRORS + 1))
    else
        local display_value="${var_value:0:5}...${var_value: -5}"
        echo -e "${GREEN}✓${NC} $var_name: $display_value"
    fi
}

echo -e "${BLUE}Backend Configuration${NC}"
echo "─────────────────────"

# Load backend .env if exists
if [ "$TARGET_ENV" = "development" ] && [ -f "$PROJECT_ROOT/backend/.env" ]; then
    eval "$(cat "$PROJECT_ROOT/backend/.env" | sed 's/^/BACKEND_/')"
    check_var "BACKEND_APP_ENV" "$BACKEND_APP_ENV" true 3
    check_var "BACKEND_SECRET_KEY" "$BACKEND_SECRET_KEY" true 20
    check_var "BACKEND_ROLE_ELEVATION_CODE" "$BACKEND_ROLE_ELEVATION_CODE" true 5
    check_var "BACKEND_SQLITE_PATH" "$BACKEND_SQLITE_PATH" true 3
    check_var "BACKEND_MODEL_PATH" "$BACKEND_MODEL_PATH" true 3
elif [ "$TARGET_ENV" = "production" ]; then
    echo "Checking GitHub Secrets for production environment..."
    check_var "VPS_HOST" "${VPS_HOST}" true 5
    check_var "VPS_USER" "${VPS_USER}" true 2
    check_var "VPS_SSH_KEY" "${VPS_SSH_KEY}" true 50
    check_var "BACKEND_SECRET_KEY" "${BACKEND_SECRET_KEY}" true 20
    check_var "ROLE_ELEVATION_CODE" "${ROLE_ELEVATION_CODE}" true 5
    check_var "CORS_ORIGINS" "${CORS_ORIGINS}" true 5
else
    echo -e "${YELLOW}⊘${NC} Backend .env not found (ok for CI build)"
fi

echo ""
echo -e "${BLUE}Frontend Configuration${NC}"
echo "──────────────────────"

# Load frontend .env if exists
if [ "$TARGET_ENV" = "development" ] && [ -f "$PROJECT_ROOT/frontend/.env.local" ]; then
    eval "$(cat "$PROJECT_ROOT/frontend/.env.local" | sed 's/^/FRONTEND_/')"
    check_var "FRONTEND_NEXT_PUBLIC_API_BASE_URL" "$FRONTEND_NEXT_PUBLIC_API_BASE_URL" true 10
    check_var "FRONTEND_NEXT_PUBLIC_BUILD_ENV" "$FRONTEND_NEXT_PUBLIC_BUILD_ENV" false 0
elif [ "$TARGET_ENV" = "production" ]; then
    check_var "FRONTEND_API_BASE_URL" "${FRONTEND_API_BASE_URL}" true 10
else
    echo -e "${YELLOW}⊘${NC} Frontend .env.local not found (ok for CI build)"
fi

echo ""
echo -e "${BLUE}Docker Configuration${NC}"
echo "────────────────────"

# Check Docker files exist
if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.yml exists"
else
    echo -e "${RED}✗${NC} docker-compose.yml not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$PROJECT_ROOT/docker-compose.prod.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.prod.yml exists"
else
    echo -e "${YELLOW}⊘${NC} docker-compose.prod.yml not found (warning for production)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo -e "${BLUE}CI/CD Configuration${NC}"
echo "───────────────────"

if [ -f "$PROJECT_ROOT/.github/workflows/deploy-env-to-vps.yml" ]; then
    echo -e "${GREEN}✓${NC} deploy-env-to-vps.yml exists"
else
    echo -e "${RED}✗${NC} deploy-env-to-vps.yml not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$PROJECT_ROOT/.github/workflows/publish.yml" ]; then
    echo -e "${GREEN}✓${NC} publish.yml exists"
else
    echo -e "${RED}✗${NC} publish.yml not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "─────────────────────────────────────"
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ Validation failed: $ERRORS error(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⊘ Validation passed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
fi
