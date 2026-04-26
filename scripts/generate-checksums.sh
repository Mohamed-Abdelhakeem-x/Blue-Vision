#!/bin/bash
# Generate SHA256 checksums and structured metadata for release artifacts
# Usage: ./generate-checksums.sh <artifact-dir> <output-file>

set -euo pipefail

ARTIFACT_DIR="${1:-.}"
OUTPUT_FILE="${2:-checksums.txt}"

if [ ! -d "$ARTIFACT_DIR" ]; then
  echo "Error: Artifact directory not found: $ARTIFACT_DIR"
  exit 1
fi

echo "Generating checksums for artifacts in: $ARTIFACT_DIR"

# Clear/create output file
>"$OUTPUT_FILE"

# Header metadata
cat >>"$OUTPUT_FILE" <<EOF
# BlueVision Release Checksums
# Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
# 
# Format: sha256:filename (size bytes)
# 
# Verify with: sha256sum --check checksums.txt
#
EOF

# Find and hash all artifacts (exclude .sig files from hash list, list separately)
declare -A file_hashes
declare -a sig_files

find "$ARTIFACT_DIR" -type f \
  ! -name "*.sha256" \
  ! -name "*.md5" \
  ! -name "checksums.txt" | sort | while read -r filepath; do
  
  filename=$(basename "$filepath")
  filesize=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
  filehash=$(sha256sum "$filepath" | cut -d' ' -f1)
  
  if [[ "$filename" == *.sig ]]; then
    echo "## Signatures" >>"$OUTPUT_FILE"
    echo "sha256:$filename ($filesize bytes)" >>"$OUTPUT_FILE"
  else
    echo "sha256:$filename ($filesize bytes)" >>"$OUTPUT_FILE"
    echo "  $filehash" >>"$OUTPUT_FILE"
  fi
done

# Add alternate formats (md5 for compatibility, if needed)
echo "" >>"$OUTPUT_FILE"
echo "## MD5 Checksums (legacy, compatibility only)" >>"$OUTPUT_FILE"
find "$ARTIFACT_DIR" -type f ! -name "*.md5" ! -name ".sha256" | sort | while read -r filepath; do
  filename=$(basename "$filepath")
  md5hash=$(md5sum "$filepath" | cut -d' ' -f1)
  echo "$md5hash  $filename" >>"$OUTPUT_FILE"
done

echo "✓ Checksums written to: $OUTPUT_FILE"
echo "Files included: $(find "$ARTIFACT_DIR" -type f | wc -l)"
