#!/bin/bash
set -euo pipefail

# Only needed in Claude Code on the web — local machines manage their own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# The Next.js app lives in fluid-web/ (repo root also holds the design bundle).
cd "$CLAUDE_PROJECT_DIR/fluid-web"

# Idempotent: npm install is a no-op when node_modules matches the lockfile,
# and benefits from the cached container state.
npm install --no-audit --no-fund
