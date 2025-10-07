# NYC ASP Parking Bot

Automated Slack notifications for NYC Alternate Side Parking strategy.

## Features

- **Weekly Strategy (Sun 5 AM)**: Visual calendar showing where to park each day
- **Daily Reminders (Mon-Thu 10 AM)**: Alerts when you need to move your car
- **Emergency Alerts (Mon-Fri 5 AM)**: Notifications for unexpected ASP suspensions

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

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

### 3. Test Locally

```bash
bun test
bun src/main.ts
```

### 4. Deploy to Val Town

```bash
./deploy.sh
```

Follow the instructions printed by the deploy script.

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
