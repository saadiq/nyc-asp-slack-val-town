// src/config.ts
import { Config, DayOfWeek } from './types';

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseDays(daysString: string): DayOfWeek[] {
  return daysString.split(',').map(d => d.trim() as DayOfWeek);
}

/**
 * Load configuration from environment variables with validation
 */
export function loadConfig(): Config {
  return {
    // Slack
    slackWebhookUrl: getEnv('SLACK_WEBHOOK_URL'),

    // Street cleaning schedule
    nearSideDays: parseDays(getEnv('NEAR_SIDE_DAYS', 'Mon,Thu')),
    farSideDays: parseDays(getEnv('FAR_SIDE_DAYS', 'Tue,Fri')),
    cleaningStartTime: getEnv('CLEANING_START_TIME', '09:00'),
    cleaningEndTime: getEnv('CLEANING_END_TIME', '10:30'),

    // Display
    nearSideEmoji: getEnv('NEAR_SIDE_EMOJI', '🏡'),
    farSideEmoji: getEnv('FAR_SIDE_EMOJI', '🌳'),

    // Scheduling
    weeklySummaryTime: getEnv('WEEKLY_SUMMARY_TIME', '0 5 * * 0'),
    dailyReminderTime: getEnv('DAILY_REMINDER_TIME', '0 10 * * 1-4'),
    emergencyCheckTime: getEnv('EMERGENCY_CHECK_TIME', '0 5 * * 1-5'),
  };
}
