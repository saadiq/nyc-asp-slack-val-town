#!/usr/bin/env bun
// Test script to generate and display weekly summary locally

import { loadConfig } from '../src/config';
import { buildWeekView, optimizeParkingSides } from '../src/parking-logic/week-analyzer';
import { buildWeeklySummary } from '../src/slack/message-builder';
import { sendToSlack } from '../src/slack/webhook';

async function testWeeklySummary() {
  try {
    console.log('Generating weekly parking summary...\n');

    const config = loadConfig();
    const rawWeekView = await buildWeekView(config);
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
