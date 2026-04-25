#!/bin/bash
# Generate structured release notes from git log between versions
# Usage: ./generate-release-notes.sh <previous-tag> <current-tag> [output-file]

set -euo pipefail

PREVIOUS_TAG="${1:-}"
CURRENT_TAG="${2:-HEAD}"
OUTPUT_FILE="${3:-RELEASE_NOTES_AUTO.md}"

if [ -z "$PREVIOUS_TAG" ]; then
  echo "Error: previous tag required"
  echo "Usage: $0 <previous-tag> <current-tag> [output-file]"
  exit 1
fi

echo "Generating release notes from $PREVIOUS_TAG to $CURRENT_TAG"

# Helper: categorize commits by prefix
categorize_commit() {
  local msg="$1"
  case "$msg" in
    feat:*|feature:*)        echo "Features" ;;
    fix:*|bugfix:*)          echo "Bug Fixes" ;;
    perf:*|performance:*)    echo "Performance" ;;
    docs:*)                  echo "Documentation" ;;
    test:*|tests:*)          echo "Testing" ;;
    refactor:*)              echo "Refactoring" ;;
    build:*|ci:*|chore:*)    echo "Internal" ;;
    security:*)              echo "Security" ;;
    *)                       echo "Other" ;;
  esac
}

# Generate header
cat >"$OUTPUT_FILE" <<EOF
# Plantify Release Notes

**Version**: \`${CURRENT_TAG#v}\`  
**Release Date**: $(date -u '+%Y-%m-%d %H:%M UTC')
**Commits**: $(git rev-list --count "$PREVIOUS_TAG..$CURRENT_TAG")

---

## Summary

EOF

# Get version-to-version statistics
ADDED=$(git diff --name-only --diff-filter=A "$PREVIOUS_TAG..$CURRENT_TAG" | wc -l)
MODIFIED=$(git diff --name-only --diff-filter=M "$PREVIOUS_TAG..$CURRENT_TAG" | wc -l)
DELETED=$(git diff --name-only --diff-filter=D "$PREVIOUS_TAG..$CURRENT_TAG" | wc -l)

cat >>"$OUTPUT_FILE" <<EOF
- **Files Changed**: $(git diff --name-only "$PREVIOUS_TAG..$CURRENT_TAG" | wc -l)
  - Added: $ADDED
  - Modified: $MODIFIED
  - Deleted: $DELETED

---

## Changes by Category

EOF

# Group commits by category
declare -A categories
declare -a order

while IFS= read -r commit subject; do
  category=$(categorize_commit "$subject")
  
  if [[ ! " ${order[@]} " =~ " ${category} " ]]; then
    order+=("$category")
  fi
  
  if [ -z "${categories[$category]:-}" ]; then
    categories[$category]=""
  fi
  
  categories[$category]="${categories[$category]}
- \`${commit:0:7}\` $subject"
done < <(git log --format="%h %s" "$PREVIOUS_TAG..$CURRENT_TAG")

# Write categorized sections
for category in "${order[@]}"; do
  if [ -n "${categories[$category]:-}" ]; then
    echo "### $category" >>"$OUTPUT_FILE"
    echo "${categories[$category]}" >>"$OUTPUT_FILE"
    echo "" >>"$OUTPUT_FILE"
  fi
done

# Contributors
echo "## Contributors" >>"$OUTPUT_FILE"
git shortlog --summary --numbered "$PREVIOUS_TAG..$CURRENT_TAG" \
  | awk '{print "- " substr($0, index($0, $2))}' >>"$OUTPUT_FILE"

# Diff summary
echo "" >>"$OUTPUT_FILE"
echo "## Files Changed Summary" >>"$OUTPUT_FILE"
echo "" >>"$OUTPUT_FILE"
echo "\`\`\`" >>"$OUTPUT_FILE"
git diff --stat "$PREVIOUS_TAG..$CURRENT_TAG" >>"$OUTPUT_FILE"
echo "\`\`\`" >>"$OUTPUT_FILE"

echo "✓ Release notes written to: $OUTPUT_FILE"
