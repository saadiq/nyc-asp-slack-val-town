#!/bin/bash
set -e

echo "📦 Building NYC ASP Bot for Val Town deployment..."
echo ""

# Build the Val Town bundle
echo "🔨 Running build script..."
bun scripts/build-val.ts

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo ""

# Check if nyc-asp-val directory exists
if [ ! -d "nyc-asp-val" ]; then
  echo "❌ Directory 'nyc-asp-val' not found."
  echo ""
  echo "First-time setup required:"
  echo "1. Install Val Town CLI: deno install -Agf https://esm.town/v/std/vt"
  echo "2. Create your Val: vt create nyc-asp-bot nyc-asp-val"
  echo "   (or clone existing: vt clone username/val-name)"
  echo ""
  echo "Then re-run this script."
  exit 1
fi

# Check if vt CLI is installed
if ! command -v vt &> /dev/null; then
  echo "⚠️  Val Town CLI not found."
  echo ""
  echo "Install with:"
  echo "   deno install -Agf https://esm.town/v/std/vt"
  echo ""
  echo "After installing, you can push with:"
  echo "   cd nyc-asp-val && vt push"
  exit 1
fi

# Ask user if they want to push
echo "📤 Ready to push to Val Town!"
echo ""
read -p "Push to Val Town now? [y/N]: " push_confirm

if [[ "$push_confirm" =~ ^[Yy]$ ]]; then
  echo ""
  echo "Pushing to Val Town..."
  cd nyc-asp-val && vt push

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed to Val Town!"
    echo ""
    echo "📝 Don't forget to configure environment variables in Val Town UI:"
    echo "   - SLACK_WEBHOOK_URL (required)"
    echo "   - NEAR_SIDE_DAYS, FAR_SIDE_DAYS (optional)"
    echo ""
    echo "🌐 Open in browser: vt browse"
  else
    echo ""
    echo "❌ Push failed. Check the error above."
    exit 1
  fi
else
  echo ""
  echo "ℹ️  Build complete. To push later, run:"
  echo "   cd nyc-asp-val && vt push"
  echo ""
  echo "Or use watch mode for automatic syncing:"
  echo "   cd nyc-asp-val && vt watch"
fi
