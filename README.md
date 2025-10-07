# NYC ASP Parking Bot

Automated Slack notifications for NYC Alternate Side Parking strategy.

## Features

- **Weekly Strategy (Sun 5 AM)**: Visual calendar showing where to park each day
- **Daily Reminders (Mon-Thu 10 AM)**: Alerts when you need to move your car
- **Emergency Alerts (Mon-Fri 5 AM)**: Notifications for unexpected ASP suspensions

## Setup

### 1. Create Slack Incoming Webhook

1. **Go to your Slack workspace settings**:
   - Visit https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it (e.g., "NYC ASP Bot")
   - Select your workspace

2. **Enable Incoming Webhooks**:
   - In the app settings, click "Incoming Webhooks" in the sidebar
   - Toggle "Activate Incoming Webhooks" to **On**
   - Click "Add New Webhook to Workspace"
   - Select the channel where you want notifications (e.g., #parking or #general)
   - Click "Allow"

3. **Copy the Webhook URL**:
   - You'll see a webhook URL like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
   - Copy this URL for the next step

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment

Create `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
NEAR_SIDE_DAYS=Mon,Thu
FAR_SIDE_DAYS=Tue,Fri
CLEANING_START_TIME=09:00
CLEANING_END_TIME=10:30
NEAR_SIDE_EMOJI=🏠
FAR_SIDE_EMOJI=🌳
```

### 4. Test Locally

```bash
# Test the Slack webhook
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Test message from NYC ASP Bot"}' \
  YOUR_WEBHOOK_URL

# Run tests
bun test

# Run the bot
bun src/main.ts
```

### 5. Deploy to Val Town

```bash
bun run deploy
# or
./deploy.sh
```

The deploy script will:
- Copy `val-town.ts` to `dist/val-town.js` (~17KB, well under Val Town's 80KB limit)
- Copy the code to your clipboard (on macOS)
- Display deployment instructions

**In Val Town:**
1. Go to https://val.town and create a new **Interval Val**
2. Paste the code from your clipboard (or copy from `dist/val-town.js`)
3. Add environment secrets (same values from step 3)
4. Set schedule to run every hour: `0 * * * *`

**Note:** The Val Town version uses npm import syntax (`npm:package@version`) to keep dependencies external, avoiding the 80KB code size limit.

## Development

### Run Tests

```bash
bun test
bun test:watch
```

### Project Structure

- `src/main.ts` - Entry point
- `src/config.ts` - Configuration
- `src/calendar/` - ICS fetching & parsing
- `src/scraper/` - NYC website scraping
- `src/parking-logic/` - Core algorithms
- `src/slack/` - Message building & sending
- `src/utils/` - Utilities
- `tests/` - Test files

## Customization

Edit environment variables to customize for your street:

- `NEAR_SIDE_DAYS`: Days with cleaning on your home side
- `FAR_SIDE_DAYS`: Days with cleaning on opposite side
- `CLEANING_START_TIME` / `CLEANING_END_TIME`: Cleaning hours

## Troubleshooting

### No messages received

1. Check Val Town logs for errors
2. Verify Slack webhook URL is correct
3. Test webhook: `curl -X POST -d '{"text":"test"}' YOUR_WEBHOOK_URL`

### Wrong parking advice

1. Verify day configuration in env vars
2. Check ICS calendar is being fetched
3. Review week view in logs

## License

MIT
