#!/bin/bash
set -euo pipefail

# Only run in remote (cloud) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "LONGDOM-CRM: pure HTML project, no dependencies to install."
echo "Environment ready."
