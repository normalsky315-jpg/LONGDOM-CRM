#!/bin/bash
set -euo pipefail

# Only run in remote (cloud) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "LONGDOM-CRM 雲端環境就緒：純 HTML 專案，無需安裝套件。"
