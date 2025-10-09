# NYC ASP Parking Bot

Automated Slack notifications for NYC Alternate Side Parking strategy.

## Features

- **Weekly Strategy (Sun 5 AM)**: Visual calendar showing where to park each day
- **Daily Reminders (Mon-Thu 10 AM)**: Alerts when you need to move your car
- **Emergency Alerts (Mon-Fri 5 AM)**: Notifications for unexpected ASP suspensions

## Sample Output

```
🚗 Parking Strategy for Oct 6 - Oct 10
`Mon    Tue    Wed    Thu    Fri`
  🌳     🌳     🌳     🌳     🏡
ASP suspended on Tue. Adjust your shuffle pattern accordingly.
🌳 *Mon*: Park on far side - _near side has cleaning_
🌳 *Tue*: Park on far side - _holiday_
🌳 *Wed*: Park on far side - _no cleaning today_
🌳 *Thu*: Park on far side - _near side has cleaning_
🏡 *Fri*: Park on near side - _far side has cleaning_
```

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
# Required
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional - Street Cleaning Schedule
NEAR_SIDE_DAYS=Mon,Thu
FAR_SIDE_DAYS=Tue,Fri
CLEANING_START_TIME=09:00
CLEANING_END_TIME=10:30
NEAR_SIDE_EMOJI=🏠
FAR_SIDE_EMOJI=🌳

# Optional - Testing/Development
FORCE_RUN=  # Leave empty for normal operation
            # Set to 'move' to force 10 AM move reminder check
            # Set to 'summary' to force weekly summary generation
            # Set to 'emergency' to force emergency suspension check
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

#### Prerequisites

Install the Val Town CLI:

```bash
deno install -Agf https://esm.town/v/std/vt
```

#### Initial Setup (First Time Only)

Create your Val on Val Town:

```bash
# Create a new Val
vt create nyc-asp-bot nyc-asp-val

# Or clone an existing Val
vt clone username/val-name
```

This creates a `nyc-asp-val/` directory that's linked to your Val Town account.

#### Deploy Updates

The deployment script automatically builds and pushes your code:

```bash
bun run deploy
# or
./deploy.sh
```

This will:
1. Bundle all files from `src/` into `nyc-asp-val/index.ts`
2. Transform imports to use `npm:package@version` syntax
3. Verify file size is under Val Town's 80KB limit
4. Push to Val Town (if you confirm)

**Manual build (without deploy):**

```bash
bun run build
```

#### Development Workflow

For continuous development with auto-sync:

```bash
bun run deploy:watch
# or
cd nyc-asp-val && vt watch
```

This watches for changes and automatically pushes to Val Town.

#### After Deployment

1. Go to https://val.town and open your Val
2. Add environment secrets:
   - `SLACK_WEBHOOK_URL` (required)
   - `NEAR_SIDE_DAYS`, `FAR_SIDE_DAYS` (optional)
   - `VAL_TOWN_API_TOKEN` (optional, for automated schedule setting)
3. **⚠️ IMPORTANT: Configure the cron schedule to `10 * * * *`**

#### Setting the Cron Schedule

Val Town deployments may reset your cron schedule. After each deployment, verify it's set correctly:

**Option 1 - Automated (Recommended):**

```bash
bun run set-schedule
```

This requires `VAL_TOWN_API_TOKEN` in your `.env`:
1. Go to https://www.val.town/settings/api
2. Click "Create API Token"
3. Give it "Vals: read and write" permissions
4. Add to `.env`: `VAL_TOWN_API_TOKEN=your_token_here`

**Option 2 - Manual:**

1. Open your val in the Val Town UI
2. Click the cron schedule selector in the top right corner
3. Set to: `10 * * * *` (every hour at 10 minutes past)

**Note:** The build script keeps dependencies external using npm import syntax (`npm:package@version`), avoiding Val Town's 80KB code size limit.

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

## Testing

You can test different notification types without waiting for scheduled times using the `FORCE_RUN` environment variable:

### Test Move Reminder (10 AM check)
```bash
# In Val Town: Set environment variable FORCE_RUN=move
# Locally:
FORCE_RUN=move bun src/main.ts
```

This will:
- Skip the hour check (normally only runs at 10 AM)
- Analyze today's parking situation
- Send move reminder if needed
- Show debug logs about the decision

### Test Weekly Summary
```bash
# In Val Town: Set environment variable FORCE_RUN=summary
# Locally:
FORCE_RUN=summary bun src/main.ts
```

This generates the full weekly parking strategy message with visual calendar.

### Test Emergency Check
```bash
# In Val Town: Set environment variable FORCE_RUN=emergency
# Locally:
FORCE_RUN=emergency bun src/main.ts
```

This checks for emergency ASP suspensions (snow, weather, etc.).

**Important:** Remove or unset `FORCE_RUN` for normal production operation.

## Troubleshooting

### No messages received

1. Check Val Town logs for errors
2. Verify Slack webhook URL is correct
3. Test webhook: `curl -X POST -d '{"text":"test"}' YOUR_WEBHOOK_URL`
4. **Verify cron schedule is set to `10 * * * *`** (Val Town deployments may reset it)
5. Check that `FORCE_RUN` is not set (should be empty/unset in production)

### Testing specific notification types

Use the `FORCE_RUN` environment variable to test without waiting for scheduled times:
- `FORCE_RUN=move` - Test move reminder logic
- `FORCE_RUN=summary` - Test weekly summary
- `FORCE_RUN=emergency` - Test emergency alerts

### Wrong parking advice

1. Verify day configuration in env vars
2. Check ICS calendar is being fetched
3. Review week view in logs
4. Use `FORCE_RUN=summary` to see the full weekly analysis

### Cron schedule keeps resetting

Val Town may reset cron schedules during deployments. To prevent this:
1. Use `bun run set-schedule` after each deployment
2. Or manually verify the schedule in the Val Town UI
3. Consider adding `VAL_TOWN_API_TOKEN` to your `.env` for automated schedule management

## License

MIT
