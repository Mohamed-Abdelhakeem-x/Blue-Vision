#!/bin/bash
# Quick start script for setting up Plantify CI/CD deployment
# This script helps you generate and setup GitHub Secrets
# Usage: bash scripts/setup-github-secrets.sh

set -e

echo "🚀 Plantify GitHub Secrets Setup"
echo "=================================="
echo ""
echo "This script will help you generate values for GitHub Secrets"
echo "Do NOT run this in GitHub Actions - run it locally!"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to generate secret
generate_secret() {
    python3 -c "import secrets; print(secrets.token_urlsafe(32))"
}

# Step 1: Generate BACKEND_SECRET_KEY
echo -e "${BLUE}Step 1: Generate Backend Secret Key${NC}"
echo "─────────────────────────────────"
echo "This is a 32-character random secret for FastAPI/JWT"
BACKEND_SECRET_KEY=$(generate_secret)
echo -e "${GREEN}Generated:${NC} $BACKEND_SECRET_KEY"
echo ""

# Step 2: Get ROLE_ELEVATION_CODE
echo -e "${BLUE}Step 2: Role Elevation Code${NC}"
echo "────────────────────────────"
echo "Use the code from backend/.env or generate a new one:"
if [ -f "backend/.env" ]; then
    ROLE_CODE=$(grep ROLE_ELEVATION_CODE backend/.env | cut -d'=' -f2)
    echo -e "${GREEN}Current:${NC} $ROLE_CODE"
    read -p "Use this code? (y/n): " use_current
    if [ "$use_current" = "y" ] || [ "$use_current" = "Y" ]; then
        ROLE_ELEVATION_CODE="$ROLE_CODE"
    else
        echo "Enter new code (or press enter for random): "
        read ROLE_ELEVATION_CODE
        if [ -z "$ROLE_ELEVATION_CODE" ]; then
            ROLE_ELEVATION_CODE=$(date +%s | sha256sum | base64 | head -c 16)
        fi
    fi
else
    echo "backend/.env not found, using development default"
    ROLE_ELEVATION_CODE="q*\$e3P\$NbB7JuUuDg"
fi
echo -e "${GREEN}Role Code:${NC} $ROLE_ELEVATION_CODE"
echo ""

# Step 3: VPS Connection Details
echo -e "${BLUE}Step 3: VPS Connection${NC}"
echo "─────────────────────"
read -p "VPS Hostname/IP: " VPS_HOST
read -p "VPS SSH Username (default: root): " VPS_USER
VPS_USER=${VPS_USER:-root}
echo -e "${GREEN}VPS:${NC} $VPS_USER@$VPS_HOST"
echo ""

# Step 4: SSH Key
echo -e "${BLUE}Step 4: Generate SSH Deploy Key${NC}"
echo "────────────────────────────────"
echo "Do you have an SSH key? (y/n)"
read -p "> " has_ssh_key

if [ "$has_ssh_key" = "y" ] || [ "$has_ssh_key" = "Y" ]; then
    read -p "Path to SSH private key: " SSH_KEY_PATH
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo -e "${YELLOW}Warning: Key not found at $SSH_KEY_PATH${NC}"
    else
        VPS_SSH_KEY=$(cat "$SSH_KEY_PATH")
        echo -e "${GREEN}✓ Loaded SSH key ($(wc -c < "$SSH_KEY_PATH") bytes)${NC}"
    fi
else
    echo "Generating new SSH deploy key..."
    ssh-keygen -t ed25519 -f ~/.ssh/plantify-deploy -C "plantify-ci@github" -N ""
    VPS_SSH_KEY=$(cat ~/.ssh/plantify-deploy)
    echo -e "${GREEN}✓ Generated SSH key${NC}"
    echo ""
    echo "Add this public key to VPS authorized_keys:"
    echo "  ssh-copy-id -i ~/.ssh/plantify-deploy.pub $VPS_USER@$VPS_HOST"
    echo ""
fi
echo ""

# Step 5: Frontend & CORS
echo -e "${BLUE}Step 5: Frontend API Base URL${NC}"
echo "──────────────────────────────"
read -p "Frontend API Base URL (e.g., https://api.plantify.com/api): " FRONTEND_API_BASE_URL
echo -e "${GREEN}Frontend API:${NC} $FRONTEND_API_BASE_URL"
echo ""

echo -e "${BLUE}Step 6: CORS Origins${NC}"
echo "───────────────────"
read -p "CORS Origins comma-separated (e.g., https://plantify.com,https://app.plantify.com): " CORS_ORIGINS
echo -e "${GREEN}CORS:${NC} $CORS_ORIGINS"
echo ""

# Summary
echo -e "${BLUE}Summary of GitHub Secrets to Add${NC}"
echo "─────────────────────────────────"
echo ""
echo "Go to: Your Repo → Settings → Secrets and variables → Actions"
echo "Click 'New repository secret' for each:"
echo ""

cat << EOF
Name: VPS_HOST
Value: $VPS_HOST

Name: VPS_USER
Value: $VPS_USER

Name: VPS_SSH_KEY
Value: (paste SSH private key content)

Name: BACKEND_SECRET_KEY
Value: $BACKEND_SECRET_KEY

Name: ROLE_ELEVATION_CODE
Value: $ROLE_ELEVATION_CODE

Name: FRONTEND_API_BASE_URL
Value: $FRONTEND_API_BASE_URL

Name: CORS_ORIGINS
Value: $CORS_ORIGINS

EOF

echo ""
echo -e "${YELLOW}Optional secrets (if you want notifications):${NC}"
echo ""
echo "Name: SLACK_WEBHOOK"
echo "Value: (your Slack webhook URL)"
echo ""

# Save to file
echo ""
read -p "Save to secrets.txt for reference? (y/n): " save_file
if [ "$save_file" = "y" ] || [ "$save_file" = "Y" ]; then
    cat > secrets.txt << EOF
# GitHub Secrets for Plantify
# ============================
# Add these to: Settings → Secrets and variables → Actions

VPS_HOST=$VPS_HOST
VPS_USER=$VPS_USER
BACKEND_SECRET_KEY=$BACKEND_SECRET_KEY
ROLE_ELEVATION_CODE=$ROLE_ELEVATION_CODE
FRONTEND_API_BASE_URL=$FRONTEND_API_BASE_URL
CORS_ORIGINS=$CORS_ORIGINS

# SSH Key (full content):
VPS_SSH_KEY=(see ~/.ssh/plantify-deploy)

# Generated at: $(date)
EOF
    echo -e "${GREEN}✓ Saved to secrets.txt${NC}"
    echo ""
fi

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Add secrets to GitHub (one at a time)"
echo "2. Test SSH connection: ssh -i ~/.ssh/plantify-deploy $VPS_USER@$VPS_HOST"
echo "3. Run workflow: Actions → Deploy .env Files to VPS → Run workflow"
echo "4. Check VPS: ssh $VPS_USER@$VPS_HOST ls -la /root/plantify/.env"
echo ""
