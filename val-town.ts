/**
 * Val Town Entry Point for NYC ASP Bot
 *
 * This file is optimized for Val Town's 80KB code limit by using external npm imports.
 * Copy this entire file into Val Town and set it to run on a schedule.
 *
 * Schedule: Run every hour (0 * * * *)
 *
 * Environment Variables Required:
 * - SLACK_WEBHOOK_URL: Your Slack webhook URL
 * - NEAR_SIDE_DAYS: Days for near side cleaning (e.g., "Mon,Thu")
 * - FAR_SIDE_DAYS: Days for far side cleaning (e.g., "Tue,Fri")
 *
 * Optional Environment Variables:
 * - CLEANING_START_TIME: Start time for cleaning (default: "09:00")
 * - CLEANING_END_TIME: End time for cleaning (default: "10:30")
 * - NEAR_SIDE_EMOJI: Emoji for near side (default: "🏡")
 * - FAR_SIDE_EMOJI: Emoji for far side (default: "🌳")
 */

// ============================================================================
// TYPES
// ============================================================================

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type ParkingSide = 'near' | 'far';

export interface Config {
  slackWebhookUrl: string;
  nearSideDays: DayOfWeek[];
  farSideDays: DayOfWeek[];
  cleaningStartTime: string;
  cleaningEndTime: string;
  nearSideEmoji: string;
  farSideEmoji: string;
  weeklySummaryTime: string;
  dailyReminderTime: string;
  emergencyCheckTime: string;
}

export interface DayInfo {
  date: Date;
  dayOfWeek: DayOfWeek;
  side: ParkingSide | null;
  suspended: boolean;
  suspensionReason?: string;
}

export interface WeekView {
  days: DayInfo[];
}

export interface MoveDecision {
  shouldMove: boolean;
  moveTo: ParkingSide;
  reason: string;
  today: DayInfo;
  tomorrow?: DayInfo;
}

export interface SlackMessage {
  blocks: Array<{
    type: string;
    text?: { type: string; text: string };
    elements?: Array<{ type: string; text: string }>;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

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

function loadConfig(): Config {
  return {
    slackWebhookUrl: getEnv('SLACK_WEBHOOK_URL'),
    nearSideDays: parseDays(getEnv('NEAR_SIDE_DAYS', 'Mon,Thu')),
    farSideDays: parseDays(getEnv('FAR_SIDE_DAYS', 'Tue,Fri')),
    cleaningStartTime: getEnv('CLEANING_START_TIME', '09:00'),
    cleaningEndTime: getEnv('CLEANING_END_TIME', '10:30'),
    nearSideEmoji: getEnv('NEAR_SIDE_EMOJI', '🏡'),
    farSideEmoji: getEnv('FAR_SIDE_EMOJI', '🌳'),
    weeklySummaryTime: getEnv('WEEKLY_SUMMARY_TIME', '0 5 * * 0'),
    dailyReminderTime: getEnv('DAILY_REMINDER_TIME', '0 10 * * 1-4'),
    emergencyCheckTime: getEnv('EMERGENCY_CHECK_TIME', '0 5 * * 1-5'),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const NYC_TIMEZONE = 'America/New_York';

// Import date-fns functions
import { formatInTimeZone, toZonedTime } from 'npm:date-fns-tz@3.0.0';
import { addDays, startOfWeek, format, isSameDay } from 'npm:date-fns@3.0.0';

function getNycNow(): Date {
  return toZonedTime(new Date(), NYC_TIMEZONE);
}

function formatNycDate(date: Date, formatStr: string): string {
  return formatInTimeZone(date, NYC_TIMEZONE, formatStr);
}

function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayMap[date.getDay()];
}

function getThisMonday(now: Date = getNycNow()): Date {
  return startOfWeek(now, { weekStartsOn: 1 });
}

function getWeekdays(now: Date = getNycNow()): Date[] {
  const monday = getThisMonday(now);
  return [0, 1, 2, 3, 4].map(offset => addDays(monday, offset));
}

function toIsoDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function isSameDayNyc(date1: Date, date2: Date): boolean {
  return isSameDay(
    toZonedTime(date1, NYC_TIMEZONE),
    toZonedTime(date2, NYC_TIMEZONE)
  );
}

// ============================================================================
// RETRY UTILITY
// ============================================================================

async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; delayMs: number; backoff?: boolean } = {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: true,
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.maxAttempts) {
        const delay = options.backoff
          ? options.delayMs * attempt
          : options.delayMs;
        console.warn(`Attempt ${attempt}/${options.maxAttempts} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// ============================================================================
// ICS CALENDAR FETCHER
// ============================================================================

const ICS_URL = 'https://www.nyc.gov/assets/dsny/site/resources/streets-and-sanitation/asp-calendar.ics';

async function getIcsContent(storage?: any): Promise<string> {
  return retry(
    async () => {
      const response = await fetch(ICS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICS: ${response.status} ${response.statusText}`);
      }
      return response.text();
    },
    { maxAttempts: 3, delayMs: 1000 }
  );
}

// ============================================================================
// ICS PARSER
// ============================================================================

import ICAL from 'npm:ical.js@2.0.0';

function parseIcsSuspensions(icsContent: string): Date[] {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const suspendedDates: Date[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate.toJSDate();
      suspendedDates.push(startDate);
    }

    return suspendedDates;
  } catch (error) {
    console.error('Failed to parse ICS:', error);
    return [];
  }
}

function isSuspendedByIcs(date: Date, suspensions: Date[]): boolean {
  return suspensions.some(suspDate => isSameDayNyc(date, suspDate));
}

// ============================================================================
// NYC WEBSITE SCRAPER
// ============================================================================

import { parseHTML } from 'npm:linkedom@0.18.0';

async function scrapeNycWebsite(storage?: any): Promise<{ isSuspendedToday: boolean; scrapedAt: Date }> {
  return retry(
    async () => {
      const response = await fetch('https://www.nyc.gov/assets/dsny/site/services/streets/alternate-side-parking');
      if (!response.ok) {
        throw new Error(`Failed to fetch NYC website: ${response.status}`);
      }

      const html = await response.text();
      const { document } = parseHTML(html);

      const suspensionElement = document.querySelector('.asp-status, .suspension-status, [class*="suspend"]');
      const isSuspendedToday = suspensionElement?.textContent?.toLowerCase().includes('suspend') ?? false;

      return {
        isSuspendedToday,
        scrapedAt: new Date(),
      };
    },
    { maxAttempts: 3, delayMs: 1000 }
  );
}

// ============================================================================
// SUSPENSION CHECKER
// ============================================================================

async function isSuspended(date: Date, storage?: any): Promise<{ suspended: boolean; reason: string }> {
  try {
    const [icsContent, webData] = await Promise.all([
      getIcsContent(storage),
      scrapeNycWebsite(storage).catch(() => null),
    ]);

    const suspensions = parseIcsSuspensions(icsContent);
    const suspendedByIcs = isSuspendedByIcs(date, suspensions);

    if (suspendedByIcs) {
      return { suspended: true, reason: 'holiday' };
    }

    const isToday = isSameDayNyc(date, getNycNow());
    if (isToday && webData?.isSuspendedToday) {
      return { suspended: true, reason: 'emergency' };
    }

    return { suspended: false, reason: 'none' };
  } catch (error) {
    console.error('Failed to check suspension:', error);
    return { suspended: false, reason: 'error' };
  }
}

// ============================================================================
// WEEK ANALYZER
// ============================================================================

async function buildWeekView(config: Config, storage?: any): Promise<WeekView> {
  const weekdays = getWeekdays();
  const days: DayInfo[] = [];

  for (const date of weekdays) {
    const dayOfWeek = getDayOfWeek(date);
    const { suspended, reason } = await isSuspended(date, storage);

    let side: ParkingSide | null = null;
    if (config.nearSideDays.includes(dayOfWeek)) side = 'near';
    if (config.farSideDays.includes(dayOfWeek)) side = 'far';

    days.push({
      date,
      dayOfWeek,
      side,
      suspended,
      suspensionReason: suspended ? reason : undefined,
    });
  }

  return { days };
}

function optimizeParkingSides(weekView: WeekView): WeekView {
  const days = [...weekView.days];

  for (let i = 0; i < days.length - 1; i++) {
    const today = days[i];
    const tomorrow = days[i + 1];

    if (today.suspended && today.side && tomorrow.side && today.side !== tomorrow.side) {
      today.side = tomorrow.side;
    }
  }

  return { days };
}

// ============================================================================
// MOVE DECISION
// ============================================================================

function shouldSendMoveReminder(weekView: WeekView, config: Config): MoveDecision {
  const now = getNycNow();
  const today = weekView.days.find(d => isSameDayNyc(d.date, now));
  const todayIndex = weekView.days.indexOf(today!);
  const tomorrow = todayIndex >= 0 ? weekView.days[todayIndex + 1] : undefined;

  if (!today) {
    return {
      shouldMove: false,
      moveTo: 'near',
      reason: 'Today not found in week view',
      today: weekView.days[0],
    };
  }

  if (today.suspended) {
    return {
      shouldMove: false,
      moveTo: today.side || 'near',
      reason: `Today is suspended (${today.suspensionReason})`,
      today,
      tomorrow,
    };
  }

  if (!today.side) {
    return {
      shouldMove: false,
      moveTo: 'near',
      reason: 'No cleaning scheduled today',
      today,
      tomorrow,
    };
  }

  return {
    shouldMove: true,
    moveTo: today.side,
    reason: `Move car to ${today.side} side for cleaning`,
    today,
    tomorrow,
  };
}

// ============================================================================
// SLACK MESSAGE BUILDER
// ============================================================================

function buildWeeklySummary(weekView: WeekView, config: Config): SlackMessage {
  const lines = ['*📅 Weekly Parking Strategy*\n'];

  for (const day of weekView.days) {
    const dateStr = formatNycDate(day.date, 'EEE M/d');
    const emoji = day.side === 'near' ? config.nearSideEmoji : config.farSideEmoji;
    const sideStr = day.side ? `${emoji} ${day.side}` : '—';
    const status = day.suspended ? ` _(suspended: ${day.suspensionReason})_` : '';
    lines.push(`${dateStr}: ${sideStr}${status}`);
  }

  return {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') },
      },
    ],
  };
}

function buildMoveReminder(decision: MoveDecision, config: Config): SlackMessage {
  const emoji = decision.moveTo === 'near' ? config.nearSideEmoji : config.farSideEmoji;
  const message = `*${emoji} Move your car to the ${decision.moveTo.toUpperCase()} side*\n\n${decision.reason}`;

  return {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message },
      },
    ],
  };
}

function buildEmergencyAlert(reason: string): SlackMessage {
  return {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*🚨 Emergency Suspension Alert*\n\nASP is suspended today: ${reason}` },
      },
    ],
  };
}

function buildErrorNotification(error: string): SlackMessage {
  return {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*🔴 NYC ASP Bot Error*\n\n${error}` },
      },
    ],
  };
}

// ============================================================================
// SLACK WEBHOOK
// ============================================================================

async function sendToSlack(webhookUrl: string, message: SlackMessage): Promise<void> {
  return retry(
    async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('Message sent to Slack successfully');
    },
    { maxAttempts: 3, delayMs: 1000 }
  );
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function sendWeeklySummary(config: Config, storage?: any) {
  console.log('Sending weekly summary...');
  const rawWeekView = await buildWeekView(config, storage);
  const weekView = optimizeParkingSides(rawWeekView);
  const message = buildWeeklySummary(weekView, config);
  await sendToSlack(config.slackWebhookUrl, message);
  console.log('Weekly summary sent');
}

async function checkAndSendMoveReminder(config: Config, storage?: any) {
  const rawWeekView = await buildWeekView(config, storage);
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

async function checkEmergencySuspension(config: Config, storage?: any) {
  const today = getNycNow();
  const todayDow = getDayOfWeek(today);

  if (!config.nearSideDays.includes(todayDow) && !config.farSideDays.includes(todayDow)) {
    console.log('No cleaning scheduled today, skipping emergency check');
    return;
  }

  const { suspended, reason } = await isSuspended(today, storage);

  if (suspended && reason !== 'holiday') {
    console.log('Emergency suspension detected!');
    const message = buildEmergencyAlert(reason);
    await sendToSlack(config.slackWebhookUrl, message);
    console.log('Emergency alert sent');
  } else {
    console.log('No emergency suspension detected');
  }
}

export default async function main(storage?: any) {
  try {
    const config = loadConfig();
    const now = getNycNow();
    const hour = now.getHours();
    const dayOfWeek = getDayOfWeek(now);

    console.log(`Running NYC ASP Bot at ${formatNycDate(now, 'yyyy-MM-dd HH:mm')}`);

    // Sunday 5 AM - Weekly summary
    if (dayOfWeek === 'Sun' && hour === 5) {
      await sendWeeklySummary(config, storage);
    }

    // Mon-Thu 10 AM - Move reminder
    if (hour === 10 && ['Mon', 'Tue', 'Wed', 'Thu'].includes(dayOfWeek)) {
      await checkAndSendMoveReminder(config, storage);
    }

    // Mon-Fri 5 AM - Emergency check
    if (hour === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayOfWeek)) {
      await checkEmergencySuspension(config, storage);
    }

    console.log('NYC ASP Bot run completed');
  } catch (error) {
    console.error('NYC ASP Bot error:', error);

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
