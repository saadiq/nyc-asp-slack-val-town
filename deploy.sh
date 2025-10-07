#!/bin/bash
set -e

echo "📦 Building NYC ASP Bot for Val Town..."

# Bundle TypeScript into single file
bun build src/main.ts --outfile=dist/main.js --target=node

echo "✅ Build complete"
echo ""
echo "🚀 Deploy to Val Town:"
echo "1. Go to https://val.town"
echo "2. Create new Val (HTTP or Interval)"
echo "3. Copy contents of dist/main.js"
echo "4. Set environment secrets:"
echo "   - SLACK_WEBHOOK_URL"
echo "   - NEAR_SIDE_DAYS (optional)"
echo "   - FAR_SIDE_DAYS (optional)"
echo "   - CLEANING_START_TIME (optional)"
echo "   - CLEANING_END_TIME (optional)"
echo "   - NEAR_SIDE_EMOJI (optional)"
echo "   - FAR_SIDE_EMOJI (optional)"
echo "5. Set interval: @hourly"
echo ""
echo "📖 See README.md for full deployment instructions"
