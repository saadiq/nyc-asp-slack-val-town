#!/bin/bash
set -e

echo "📦 Preparing NYC ASP Bot for Val Town deployment..."
echo ""

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy val-town.ts to dist
cp val-town.ts dist/val-town.js

# Get file size
FILE_SIZE=$(wc -c < val-town.ts | tr -d ' ')
FILE_SIZE_KB=$((FILE_SIZE / 1024))

echo "✅ Deployment file ready: dist/val-town.js"
echo "   Size: ${FILE_SIZE} bytes (~${FILE_SIZE_KB}KB)"
echo "   Val Town limit: 80,000 bytes (80KB)"
echo ""

if [ $FILE_SIZE -gt 80000 ]; then
  echo "⚠️  WARNING: File size exceeds Val Town's 80KB limit!"
  exit 1
fi

# Try to copy to clipboard (macOS)
if command -v pbcopy &> /dev/null; then
  cat val-town.ts | pbcopy
  echo "📋 Code copied to clipboard!"
  echo ""
fi

echo "🚀 Deploy to Val Town:"
echo ""
echo "1. Go to https://val.town"
echo "2. Create a new Interval Val"
echo "3. Paste the code from clipboard (or copy from dist/val-town.js)"
echo "4. Set environment secrets in Val Town:"
echo "   Required:"
echo "   - SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
echo ""
echo "   Optional (defaults shown):"
echo "   - NEAR_SIDE_DAYS=Mon,Thu"
echo "   - FAR_SIDE_DAYS=Tue,Fri"
echo "   - CLEANING_START_TIME=09:00"
echo "   - CLEANING_END_TIME=10:30"
echo "   - NEAR_SIDE_EMOJI=🏠"
echo "   - FAR_SIDE_EMOJI=🌳"
echo ""
echo "5. Set schedule: Every hour (0 * * * *)"
echo ""
echo "💡 The Val uses npm imports (npm:package@version) to keep dependencies external"
echo "📖 See README.md for full deployment instructions"
