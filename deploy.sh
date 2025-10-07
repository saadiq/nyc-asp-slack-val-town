#!/bin/bash
set -e

echo "📦 Preparing NYC ASP Bot for Val Town deployment..."
echo ""

# Check if val-town.ts exists
if [ ! -f "val-town.ts" ]; then
  echo "❌ Error: val-town.ts not found"
  exit 1
fi

# Get file size
FILE_SIZE=$(wc -c < val-town.ts | tr -d ' ')
FILE_SIZE_KB=$((FILE_SIZE / 1024))

echo "✅ Deployment file: val-town.ts"
echo "   Size: ${FILE_SIZE} bytes (~${FILE_SIZE_KB}KB)"
echo "   Val Town limit: 80,000 bytes (80KB)"
echo ""

if [ $FILE_SIZE -gt 80000 ]; then
  echo "⚠️  WARNING: File size exceeds Val Town's 80KB limit!"
  exit 1
fi

# Check if vt CLI is installed
if command -v vt &> /dev/null; then
  echo "🚀 Val Town CLI detected!"
  echo ""
  echo "Choose deployment method:"
  echo "  1) Deploy with vt CLI (recommended)"
  echo "  2) Copy to clipboard for manual paste"
  echo ""
  read -p "Enter choice [1-2]: " choice

  case $choice in
    1)
      echo ""
      read -p "Enter Val name (e.g., nyc-asp-bot): " VAL_NAME

      if [ -z "$VAL_NAME" ]; then
        echo "❌ Val name is required"
        exit 1
      fi

      # Create a temporary directory for vt
      TEMP_DIR=$(mktemp -d)
      cp val-town.ts "$TEMP_DIR/index.ts"

      echo ""
      echo "Creating Val '$VAL_NAME'..."

      # Create the Val (this will prompt for privacy settings if not specified)
      if vt create "$VAL_NAME" "$TEMP_DIR" --upload-if-exists; then
        echo ""
        echo "✅ Val created successfully!"
        echo ""
        echo "📝 Next steps:"
        echo "1. Set environment secrets in Val Town:"
        echo "   - SLACK_WEBHOOK_URL (required)"
        echo "   - NEAR_SIDE_DAYS, FAR_SIDE_DAYS (optional)"
        echo ""
        echo "2. Configure the Val as an Interval Val to run every hour"
        echo ""
        echo "3. Open in browser:"
        vt browse
      else
        echo ""
        echo "❌ Failed to create Val. It may already exist."
        echo "   To update an existing Val, clone it first:"
        echo "   vt clone username/$VAL_NAME"
        echo "   cd $VAL_NAME"
        echo "   cp ../val-town.ts index.ts"
        echo "   vt push"
      fi

      # Cleanup
      rm -rf "$TEMP_DIR"
      ;;
    2)
      # Copy to clipboard
      if command -v pbcopy &> /dev/null; then
        cat val-town.ts | pbcopy
        echo "📋 Code copied to clipboard!"
      else
        echo "ℹ️  Clipboard not available (pbcopy not found)"
      fi

      echo ""
      echo "🚀 Manual deployment:"
      echo "1. Go to https://val.town"
      echo "2. Create a new Interval Val"
      echo "3. Paste the code (or copy from val-town.ts)"
      ;;
    *)
      echo "Invalid choice"
      exit 1
      ;;
  esac
else
  # No vt CLI, fall back to clipboard method
  echo "ℹ️  Val Town CLI not found. Install with:"
  echo "   deno install -Agf https://esm.town/v/std/vt"
  echo ""

  # Try to copy to clipboard (macOS)
  if command -v pbcopy &> /dev/null; then
    cat val-town.ts | pbcopy
    echo "📋 Code copied to clipboard!"
  fi

  echo ""
  echo "🚀 Manual deployment:"
  echo "1. Go to https://val.town"
  echo "2. Create a new Interval Val"
  echo "3. Paste the code (or copy from val-town.ts)"
fi

echo ""
echo "📝 Required environment variables:"
echo "   - SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
echo ""
echo "📝 Optional (with defaults):"
echo "   - NEAR_SIDE_DAYS=Mon,Thu"
echo "   - FAR_SIDE_DAYS=Tue,Fri"
echo "   - CLEANING_START_TIME=09:00"
echo "   - CLEANING_END_TIME=10:30"
echo "   - NEAR_SIDE_EMOJI=🏠"
echo "   - FAR_SIDE_EMOJI=🌳"
echo ""
echo "💡 The Val uses npm imports (npm:package@version) to keep dependencies external"
echo "📖 See README.md for full deployment instructions"
