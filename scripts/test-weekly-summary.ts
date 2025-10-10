#!/usr/bin/env bun
// Test script to generate and display weekly summary locally

import { loadConfig } from '../src/config';
import { buildWeekView, optimizeParkingSides } from '../src/parking-logic/week-analyzer';
import { buildWeeklySummary } from '../src/slack/message-builder';
import { sendToSlack } from '../src/slack/webhook';
import { getNycNow, formatNycDate, NYC_TIMEZONE } from '../src/utils/date-utils';
import { toZonedTime } from 'date-fns-tz';

async function testWeeklySummary() {
  try {
    // Parse optional date argument (format: YYYY-MM-DD)
    const dateArg = process.argv[2];
    let referenceDate: Date | undefined;

    if (dateArg) {
      // Parse the date string as if it's in NYC timezone
      // Format: YYYY-MM-DD gets interpreted as noon on that date in NYC
      const dateParts = dateArg.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateParts) {
        console.error(`Invalid date format: ${dateArg}`);
        console.error('Please use format: YYYY-MM-DD');
        process.exit(1);
      }

      const [, year, month, day] = dateParts;
      // Create date in NYC timezone at noon
      const dateString = `${year}-${month}-${day}T12:00:00`;
      referenceDate = toZonedTime(dateString, NYC_TIMEZONE);

      console.log(`Testing week containing: ${formatNycDate(referenceDate, 'yyyy-MM-dd (EEEE)')}\n`);
    } else {
      referenceDate = undefined;
      console.log(`Testing current week (${formatNycDate(getNycNow(), 'yyyy-MM-dd')})\n`);
    }

    console.log('Generating weekly parking summary...\n');

    const config = loadConfig();
    const rawWeekView = await buildWeekView(config, referenceDate);
    const weekView = optimizeParkingSides(rawWeekView);
    const message = buildWeeklySummary(weekView, config);

    // Display the message locally
    console.log('Weekly Summary Message:');
    console.log(JSON.stringify(message, null, 2));
    console.log('\n');

    // Display in readable format
    for (const block of message.blocks) {
      if (block.text) {
        console.log(block.text.text);
      }
    }

    // Optionally send to Slack (uncomment if you want to actually send)
    // await sendToSlack(config.slackWebhookUrl, message);
    // console.log('\nMessage sent to Slack!');

  } catch (error) {
    console.error('Error generating weekly summary:', error);
    process.exit(1);
  }
}

testWeeklySummary();
