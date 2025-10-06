// src/types.ts

/**
 * Configuration loaded from environment variables
 */
export interface Config {
  // Slack settings
  slackWebhookUrl: string;

  // Street cleaning schedule
  nearSideDays: DayOfWeek[];
  farSideDays: DayOfWeek[];
  cleaningStartTime: string; // "HH:mm" format
  cleaningEndTime: string;   // "HH:mm" format

  // Display preferences
  nearSideEmoji: string;
  farSideEmoji: string;

  // Scheduling (cron expressions)
  weeklySummaryTime: string;
  dailyReminderTime: string;
  emergencyCheckTime: string;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type Side = 'near' | 'far';

/**
 * Represents a single day's parking status
 */
export interface DayStatus {
  date: Date;
  dayOfWeek: DayOfWeek;
  hasNearSideCleaning: boolean;
  hasFarSideCleaning: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  /** Which side the car should be parked on this day */
  parkOnSide: Side | null;
}

/**
 * A week's worth of parking data (Mon-Fri)
 */
export interface WeekView {
  startDate: Date; // Monday
  endDate: Date;   // Friday
  days: DayStatus[];
}

/**
 * Decision about whether to send a move reminder
 */
export interface MoveDecision {
  shouldMove: boolean;
  currentSide?: Side;
  targetSide?: Side;
  nextMoveDate?: Date;
}

/**
 * Result from scraping NYC DOT website
 */
export interface ScrapeResult {
  isSuspendedToday: boolean;
  reason?: string;
  scrapedAt: Date;
}

/**
 * Cached ICS calendar data
 */
export interface CalendarCache {
  icsContent: string;
  suspensionDates: string[]; // ISO date strings
  fetchedAt: Date;
}
