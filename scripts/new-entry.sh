#!/usr/bin/env sh
# Usage: ./scripts/new-entry.sh ["Optional title"]   (or: ./scripts/new-entry.sh 2026-10-01 "Title")
cd "$(dirname "$0")/.." && node scripts/new-entry.mjs "$@"
