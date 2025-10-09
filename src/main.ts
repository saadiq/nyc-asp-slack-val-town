// src/main.ts
import { loadConfig } from './config';
import { getNycNow, formatNycDate, getDayOfWeek } from './utils/date-utils';
import { buildWeekView, optimizeParkingSides } from './parking-logic/week-analyzer';
import { shouldSendMoveReminder } from './parking-logic/move-decision';
import { isSuspended } from './parking-logic/suspension-checker';
import {
  buildWeeklySummary,
  buildMoveReminder,
  buildEmergencyAlert,
  buildErrorNotification,
} from './slack/message-builder';
import { sendToSlack } from './slack/webhook';

/**
 * Main entry point - called by Val Town scheduler every hour
 */
export async function main() {
  try {
    const config = loadConfig();
    const now = getNycNow();
    const hour = now.getHours();
    const dayOfWeek = getDayOfWeek(now);

    console.log(`Running NYC ASP Bot at ${formatNycDate(now, 'yyyy-MM-dd HH:mm')}`);

    // Check for force run override
    const forceRun = process.env.FORCE_RUN?.toLowerCase();

    // Sunday 5 AM - Weekly summary
    if (forceRun === 'summary' || (dayOfWeek === 'Sun' && hour === 5)) {
      await sendWeeklySummary(config);
    }

    // Mon-Thu 10 AM - Move reminder
    if (forceRun === 'move' || (hour === 10 && ['Mon', 'Tue', 'Wed', 'Thu'].includes(dayOfWeek))) {
      await checkAndSendMoveReminder(config);
    }

    // Mon-Fri 5 AM - Emergency check (excluding Sunday to avoid collision with weekly summary)
    if (forceRun === 'emergency' || (hour === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayOfWeek))) {
      await checkEmergencySuspension(config);
    }

    console.log('NYC ASP Bot run completed');
  } catch (error) {
    console.error('NYC ASP Bot error:', error);

    // Try to send error notification
    try {
      const config = loadConfig();
      const errorMsg = error instanceof Error ? error.message : String(error);
      const message = buildErrorNotification(errorMsg);
      await sendToSlack(config.slackWebhookUrl, message);
    } catch (notifyError) {
      console.error('Failed to send error notification:', notifyError);
    }
  }
}

/**
 * Send weekly parking strategy summary
 */
async function sendWeeklySummary(config: any) {
  console.log('Sending weekly summary...');

  const rawWeekView = await buildWeekView(config);
  const weekView = optimizeParkingSides(rawWeekView);

  const message = buildWeeklySummary(weekView, config);
  await sendToSlack(config.slackWebhookUrl, message);

  console.log('Weekly summary sent');
}

/**
 * Check if move reminder should be sent and send if needed
 */
async function checkAndSendMoveReminder(config: any) {
  const rawWeekView = await buildWeekView(config);
  const weekView = optimizeParkingSides(rawWeekView);

  const decision = shouldSendMoveReminder(weekView, config);

  if (decision.shouldMove) {
    console.log('Sending move reminder...');
    const message = buildMoveReminder(decision, config);
    await sendToSlack(config.slackWebhookUrl, message);
    console.log('Move reminder sent');
  } else {
    console.log('No move needed today');
  }
}

/**
 * Check for emergency suspension and alert if found
 */
async function checkEmergencySuspension(config: any) {
  const today = getNycNow();
  const todayDow = getDayOfWeek(today);

  // Only check on weekdays with scheduled cleaning
  if (!config.nearSideDays.includes(todayDow) &&
      !config.farSideDays.includes(todayDow)) {
    console.log('No cleaning scheduled today, skipping emergency check');
    return;
  }

  const { suspended, reason } = await isSuspended(today);

  // Check if this is an emergency (not a scheduled holiday)
  // This catches snow/weather emergencies and other unplanned suspensions
  // Holidays are already in the ICS calendar, so they're handled by the weekly summary

  if (suspended && reason !== 'holiday') {
    console.log('Emergency suspension detected!');
    const message = buildEmergencyAlert(reason);
    await sendToSlack(config.slackWebhookUrl, message);
    console.log('Emergency alert sent');
  } else {
    console.log('No emergency suspension detected');
  }
}

// Export for Val Town
export default main;
