#!/bin/bash
#
# Git History Cleanup Script - Removes sensitive API key from git history
# This uses git filter-branch (built-in) instead of filter-repo
#
# WARNING: This rewrites git history. Coordinate with team before running!
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===============================================${NC}"
echo -e "${YELLOW}  Git History Cleanup Script${NC}"
echo -e "${YELLOW}===============================================${NC}"
echo ""

# The sensitive string to remove
SENSITIVE_KEY="utxorpc1v3xhs2us3ws9x0vgn75"

echo -e "${YELLOW}This script will:${NC}"
echo "1. Search for the sensitive API key in git history"
echo "2. Replace it with '[REDACTED]' in all commits"
echo "3. Rewrite git history (WARNING: irreversible!)"
echo ""
echo -e "${RED}IMPORTANT: This will rewrite git history!${NC}"
echo -e "${RED}All collaborators will need to re-clone the repository.${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Search for the sensitive key in history
echo -e "${YELLOW}Searching git history for sensitive data...${NC}"
FOUND=$(git log -S"$SENSITIVE_KEY" --pretty=format:"%H %s" | wc -l)

if [ "$FOUND" -eq 0 ]; then
    echo -e "${GREEN}✓ Sensitive data not found in git history!${NC}"
    exit 0
fi

echo -e "${RED}Found $FOUND commit(s) containing the sensitive API key:${NC}"
git log -S"$SENSITIVE_KEY" --pretty=format:"%h - %s (%an, %ar)" --abbrev-commit
echo ""
echo ""

read -p "Do you want to proceed with cleanup? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy](es)?$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Creating backup branch...${NC}"
BACKUP_BRANCH="backup-before-cleanup-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo -e "${GREEN}✓ Created backup branch: $BACKUP_BRANCH${NC}"
echo ""

echo -e "${YELLOW}Rewriting git history...${NC}"
echo "This may take a few minutes..."

# Use git filter-branch to replace the sensitive key
git filter-branch --force --index-filter \
  "git grep -l '$SENSITIVE_KEY' 2>/dev/null | xargs -I{} sed -i 's/$SENSITIVE_KEY/[REDACTED-API-KEY]/g' {} || true" \
  --tag-name-filter cat -- --all

echo -e "${GREEN}✓ Git history rewritten${NC}"
echo ""

# Clean up refs
echo -e "${YELLOW}Cleaning up old refs...${NC}"
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}  Cleanup Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify the changes with: git log -S'[REDACTED-API-KEY]'"
echo "2. Force push to remote: git push origin --force --all"
echo "3. Force push tags: git push origin --force --tags"
echo "4. Notify team members to re-clone the repository"
echo ""
echo -e "${YELLOW}Backup branch created: $BACKUP_BRANCH${NC}"
echo "If something went wrong, restore with: git reset --hard $BACKUP_BRANCH"
echo ""
