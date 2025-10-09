#!/usr/bin/env bun
/**
 * Local Test Runner
 *
 * Simple script to test the NYC ASP Bot locally without deploying to Val Town.
 *
 * Usage:
 *   bun test-local.ts
 *
 * Environment Variables:
 *   FORCE_RUN - Override scheduled run times for testing:
 *     - move: Force 10 AM move reminder check
 *     - summary: Force weekly summary generation
 *     - emergency: Force emergency suspension check
 *
 *   SLACK_WEBHOOK_URL - Required: Your Slack webhook URL
 *
 * Examples:
 *   # Test move reminder logic
 *   FORCE_RUN=move SLACK_WEBHOOK_URL=https://hooks.slack.com/... bun test-local.ts
 *
 *   # Test weekly summary
 *   FORCE_RUN=summary SLACK_WEBHOOK_URL=https://hooks.slack.com/... bun test-local.ts
 *
 *   # Test emergency suspension check
 *   FORCE_RUN=emergency SLACK_WEBHOOK_URL=https://hooks.slack.com/... bun test-local.ts
 */

import { main } from './src/main';

await main();
