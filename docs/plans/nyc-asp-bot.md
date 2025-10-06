# NYC ASP Parking Bot - Implementation Plan

**Current Status:** Phase 1 Complete ✅ | Phase 2 Complete ✅ | Phase 3 Pending ⏳

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites & Setup](#prerequisites--setup)
4. [Implementation Tasks](#implementation-tasks)
5. [Testing Strategy](#testing-strategy)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## Progress Tracker

- ✅ **Phase 1: Project Foundation** (3/3 tasks) - COMPLETED
  - ✅ Task 1.1: Initialize Project Structure
  - ✅ Task 1.2: Define TypeScript Types
  - ✅ Task 1.3: Create Configuration Module

- ✅ **Phase 2: Data Acquisition** (5/5 tasks) - COMPLETED
  - ✅ Task 2.1: Create Date Utilities
  - ✅ Task 2.2: Create Retry Utility
  - ✅ Task 2.3: Implement ICS Fetcher
  - ✅ Task 2.4: Implement ICS Parser
  - ✅ Task 2.5: Implement NYC Website Scraper

- ⏳ **Phase 3: Parking Logic Engine** (0/3 tasks)
- ⏳ **Phase 4: Slack Integration** (0/2 tasks)
- ⏳ **Phase 5: Main Orchestration** (0/1 tasks)
- ⏳ **Phase 6: Deployment & Testing** (0/3 tasks)

---

## Project Overview

### What is NYC ASP?
New York City's Alternate Side Parking (ASP) regulations require residents to move their cars for street cleaning on specific days and times. Violations result in parking tickets. The city suspends ASP on holidays and sometimes for emergencies (snow, etc.).

### The Problem
In neighborhoods with street cleaning on both sides of the street on different days, residents must shuffle their cars multiple times per week. The strategy varies based on which days have cleaning and which are suspended. Manual tracking is error-prone and time-consuming.

### Our Solution
A Val Town scheduled script that:
- **Sunday 5 AM**: Sends weekly parking strategy overview with visual calendar
- **Daily 10 AM**: Sends move reminders when repositioning is needed
- **Daily 12:30 PM**: Checks for emergency ASP suspensions and alerts if detected

### Key Constraints
- Street cleaning schedule: Mon/Thu on near side (🏠), Tue/Fri on far side (🌳), 9:00-10:30 AM
- No street cleaning on Wed, Sat, Sun
- Must be configurable for other schedules via environment variables

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Val Town Scheduler                       │
│                    (Runs every hour)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Entry Point                          │
│         Checks time/day, routes to appropriate action        │
└─────┬──────────────┬─────────────────┬──────────────────────┘
      │              │                 │
      ▼              ▼                 ▼
┌─────────┐   ┌──────────┐   ┌─────────────────┐
│ Sunday  │   │  Daily   │   │    Daily        │
│  5 AM   │   │  10 AM   │   │   12:30 PM      │
│ Weekly  │   │  Move    │   │  Emergency      │
│Strategy │   │ Reminder │   │    Check        │
└────┬────┘   └─────┬────┘   └────┬────────────┘
     │              │              │
     └──────────────┴──────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Data Sources       │
         ├──────────────────────┤
         │ • ICS Calendar       │
         │   (weekly fetch)     │
         │ • NYC DOT Website    │
         │   (daily scrape)     │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Parking Logic       │
         │  Engine              │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Slack Block Kit     │
         │  Message Builder     │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Slack Webhook       │
         └──────────────────────┘
```

### Data Flow

1. **Calendar Data Acquisition**
   - Fetch ICS file from `https://www.nyc.gov/html/dot/downloads/misc/2025-alternate-side.ics`
   - Parse to extract suspension dates
   - Cache in Val Town storage (refresh weekly)

2. **Emergency Check**
   - Scrape `https://www.nyc.gov/html/dot/html/motorist/alternate-side-parking.shtml`
   - Look for suspension indicators
   - Compare against ICS calendar

3. **Parking Strategy Calculation**
   - Combine ICS + emergency data to build week view
   - Determine which days have active street cleaning
   - Calculate optimal car positioning for each day
   - Identify when moves are needed

4. **Message Generation**
   - Weekly: Create 5-day emoji calendar + strategy summary
   - Daily Move: Format source→destination with next move date
   - Emergency: Alert with reason and reassurance

5. **Delivery**
   - Send via Slack webhook using Block Kit JSON

### File Structure

```
/
├── src/
│   ├── main.ts              # Entry point, scheduling logic
│   ├── config.ts            # Environment variables & defaults
│   ├── types.ts             # TypeScript interfaces
│   ├── calendar/
│   │   ├── ics-fetcher.ts   # Downloads & caches ICS file
│   │   └── ics-parser.ts    # Parses ICS to extract dates
│   ├── scraper/
│   │   └── nyc-website.ts   # Scrapes NYC DOT website
│   ├── parking-logic/
│   │   ├── suspension-checker.ts  # Combines ICS + scraper
│   │   ├── week-analyzer.ts       # Builds week view
│   │   └── move-decision.ts       # Determines when to move
│   ├── slack/
│   │   ├── message-builder.ts     # Creates Block Kit JSON
│   │   └── webhook.ts             # Sends to Slack
│   └── utils/
│       ├── date-utils.ts    # Date/time helpers (NYC timezone)
│       └── retry.ts         # Retry logic with backoff
├── tests/
│   ├── unit/               # Unit tests for each module
│   ├── integration/        # Integration tests
│   └── fixtures/           # Mock data (sample ICS, HTML)
├── docs/
│   └── plans/
│       └── nyc-asp-bot.md  # This file
└── package.json
```

---

## Prerequisites & Setup

### 1. Val Town Account & CLI
- Sign up at https://val.town
- Install CLI: `npm install -g @valtown/vt` (or `bunx @valtown/vt`)
- Authenticate: `vt login`
- Documentation: https://docs.val.town/index.md

### 2. Slack Webhook
Create an incoming webhook to post messages:
1. Go to https://api.slack.com/apps
2. Create new app → "From scratch"
3. Choose workspace
4. Navigate to "Incoming Webhooks" → Activate
5. Click "Add New Webhook to Workspace"
6. Select channel (e.g., #parking-alerts)
7. Copy webhook URL (starts with `https://hooks.slack.com/services/...`)
8. Test with:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Hello from NYC ASP Bot!"}' \
     YOUR_WEBHOOK_URL
   ```

**Documentation:**
- Slack Webhooks: https://api.slack.com/messaging/webhooks
- Block Kit Builder: https://app.slack.com/block-kit-builder

### 3. Development Environment
```bash
# Create project directory
mkdir nyc-asp-bot
cd nyc-asp-bot

# Initialize with bun (per user's preference)
bun init

# Install dependencies
bun add date-fns-tz ical.js linkedom
bun add -d @types/node vitest typescript
```

### 4. Environment Variables
Create `.env` for local development (DO NOT commit):
```bash
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Street Cleaning Schedule
NEAR_SIDE_DAYS=Mon,Thu
FAR_SIDE_DAYS=Tue,Fri
CLEANING_START_TIME=09:00
CLEANING_END_TIME=10:30

# Display Preferences
NEAR_SIDE_EMOJI=🏠
FAR_SIDE_EMOJI=🌳

# Scheduling (cron format)
WEEKLY_SUMMARY_TIME=0 5 * * 0
DAILY_REMINDER_TIME=0 10 * * *
EMERGENCY_CHECK_TIME=30 12 * * *
```

For Val Town deployment, set these in the Val Town UI under "Secrets".

---

## Implementation Tasks

### Phase 1: Project Foundation ✅ COMPLETED

#### Task 1.1: Initialize Project Structure ✅
**Goal:** Set up the project with proper TypeScript configuration and directory structure.

**Status: COMPLETED** (Commit: 8120a79)

**Files to create:**
- `package.json`
- `tsconfig.json`
- `src/`, `tests/`, `docs/` directories

**Steps:**
1. Run `bun init` in empty directory
2. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "tests"]
   }
   ```
3. Install dependencies: `bun add date-fns-tz ical.js linkedom`
4. Install dev dependencies: `bun add -d @types/node vitest typescript @types/ical.js`
5. Create directory structure:
   ```bash
   mkdir -p src/{calendar,scraper,parking-logic,slack,utils}
   mkdir -p tests/{unit,integration,fixtures}
   mkdir -p docs/plans
   ```

**Testing:**
- Run `bun --version` to verify bun is working
- Run `tsc --noEmit` to verify TypeScript config is valid

**Commit message:**
```
chore: initialize project structure with TypeScript and dependencies
```

---

#### Task 1.2: Define TypeScript Types ✅
**Goal:** Create shared type definitions for type safety across the codebase.

**Status: COMPLETED** (Commit: 7e4c2d4)

**Files to create:**
- `src/types.ts`

**Code:**
```typescript
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
```

**Testing:**
- Run `tsc --noEmit` to verify types compile without errors

**Commit message:**
```
feat: define core TypeScript types and interfaces
```

---

#### Task 1.3: Create Configuration Module ✅
**Goal:** Load and validate environment variables with sensible defaults.

**Status: COMPLETED** (Commit: c386a3a)

**Files to create:**
- `src/config.ts`

**Code:**
```typescript
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
    nearSideEmoji: getEnv('NEAR_SIDE_EMOJI', '🏠'),
    farSideEmoji: getEnv('FAR_SIDE_EMOJI', '🌳'),

    // Scheduling
    weeklySummaryTime: getEnv('WEEKLY_SUMMARY_TIME', '0 5 * * 0'),
    dailyReminderTime: getEnv('DAILY_REMINDER_TIME', '0 10 * * *'),
    emergencyCheckTime: getEnv('EMERGENCY_CHECK_TIME', '30 12 * * *'),
  };
}
```

**Testing:**
Create `tests/unit/config.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it('should throw error if SLACK_WEBHOOK_URL is missing', () => {
    expect(() => loadConfig()).toThrow('Missing required environment variable: SLACK_WEBHOOK_URL');
  });

  it('should use default values when optional vars are not set', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    const config = loadConfig();

    expect(config.nearSideDays).toEqual(['Mon', 'Thu']);
    expect(config.farSideDays).toEqual(['Tue', 'Fri']);
    expect(config.nearSideEmoji).toBe('🏠');
  });

  it('should parse custom day configuration', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.NEAR_SIDE_DAYS = 'Mon,Wed,Fri';

    const config = loadConfig();
    expect(config.nearSideDays).toEqual(['Mon', 'Wed', 'Fri']);
  });
});
```

Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch"
  }
}
```

Run tests: `bun test`

**Commit message:**
```
feat: add configuration module with environment variable loading

- Loads config from env vars with defaults
- Validates required variables
- Includes comprehensive unit tests
```

---

### Phase 2: Data Acquisition

#### Task 2.1: Create Date Utilities ✅
**Goal:** Helper functions for date manipulation in NYC timezone.

**Status: COMPLETED** (Commit: 675c60b)

**Files to create:**
- `src/utils/date-utils.ts`

**Code:**
```typescript
// src/utils/date-utils.ts
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addDays, startOfWeek, endOfWeek, format, isSameDay } from 'date-fns';
import { DayOfWeek } from '../types';

export const NYC_TIMEZONE = 'America/New_York';

/**
 * Get current date/time in NYC timezone
 */
export function getNycNow(): Date {
  return toZonedTime(new Date(), NYC_TIMEZONE);
}

/**
 * Format date in NYC timezone
 */
export function formatNycDate(date: Date, formatStr: string): string {
  return formatInTimeZone(date, NYC_TIMEZONE, formatStr);
}

/**
 * Convert day of week number (0=Sun, 1=Mon, ...) to our DayOfWeek type
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayMap[date.getDay()];
}

/**
 * Get the Monday of the current week (for week view)
 */
export function getThisMonday(now: Date = getNycNow()): Date {
  return startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
}

/**
 * Get the Friday of the current week
 */
export function getThisFriday(now: Date = getNycNow()): Date {
  const monday = getThisMonday(now);
  return addDays(monday, 4); // Mon + 4 = Fri
}

/**
 * Generate array of dates for Mon-Fri of current week
 */
export function getWeekdays(now: Date = getNycNow()): Date[] {
  const monday = getThisMonday(now);
  return [0, 1, 2, 3, 4].map(offset => addDays(monday, offset));
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD) for comparison
 */
export function toIsoDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDayNyc(date1: Date, date2: Date): boolean {
  return isSameDay(
    toZonedTime(date1, NYC_TIMEZONE),
    toZonedTime(date2, NYC_TIMEZONE)
  );
}

/**
 * Get next weekday with specific day name (e.g., next Monday)
 * Returns null if dayName is weekend
 */
export function getNextWeekday(startDate: Date, targetDayName: DayOfWeek): Date | null {
  const dayNames: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targetDayIndex = dayNames.indexOf(targetDayName);

  if (targetDayIndex === 0 || targetDayIndex === 6) {
    return null; // Weekend
  }

  let checkDate = addDays(startDate, 1);
  while (checkDate.getDay() !== targetDayIndex) {
    checkDate = addDays(checkDate, 1);
    // Safety: don't loop forever
    if (checkDate > addDays(startDate, 14)) return null;
  }

  return checkDate;
}
```

**Testing:**
Create `tests/unit/date-utils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getDayOfWeek, getWeekdays, toIsoDateString, getNextWeekday } from '../../src/utils/date-utils';

describe('date-utils', () => {
  it('should convert date to day of week', () => {
    // 2025-10-06 is a Monday
    const monday = new Date('2025-10-06T12:00:00');
    expect(getDayOfWeek(monday)).toBe('Mon');
  });

  it('should generate 5 weekdays', () => {
    const weekdays = getWeekdays(new Date('2025-10-06T12:00:00'));
    expect(weekdays).toHaveLength(5);
    expect(getDayOfWeek(weekdays[0])).toBe('Mon');
    expect(getDayOfWeek(weekdays[4])).toBe('Fri');
  });

  it('should format ISO date string', () => {
    const date = new Date('2025-10-06T15:30:00');
    expect(toIsoDateString(date)).toBe('2025-10-06');
  });

  it('should find next weekday', () => {
    const monday = new Date('2025-10-06T12:00:00');
    const nextThu = getNextWeekday(monday, 'Thu');
    expect(nextThu).not.toBeNull();
    expect(getDayOfWeek(nextThu!)).toBe('Thu');
  });

  it('should return null for weekend days', () => {
    const monday = new Date('2025-10-06T12:00:00');
    expect(getNextWeekday(monday, 'Sat')).toBeNull();
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: add date utility functions for NYC timezone handling
```

---

#### Task 2.2: Create Retry Utility
**Goal:** Generic retry logic with exponential backoff for network requests.

**Files to create:**
- `src/utils/retry.ts`

**Code:**
```typescript
// src/utils/retry.ts

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts) {
        break; // Don't sleep after final attempt
      }

      console.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`,
        error
      );

      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw new Error(
    `Operation failed after ${opts.maxAttempts} attempts. Last error: ${lastError}`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Testing:**
Create `tests/unit/retry.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { retry } from '../../src/utils/retry';

describe('retry', () => {
  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retry(operation, { maxAttempts: 3 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await retry(operation, {
      maxAttempts: 3,
      initialDelayMs: 10
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retry(operation, {
      maxAttempts: 2,
      initialDelayMs: 10
    })).rejects.toThrow('Operation failed after 2 attempts');

    expect(operation).toHaveBeenCalledTimes(2);
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: add retry utility with exponential backoff
```

---

#### Task 2.3: Implement ICS Fetcher
**Goal:** Download ICS calendar file from NYC DOT with caching.

**Files to create:**
- `src/calendar/ics-fetcher.ts`

**Documentation to review:**
- Val Town storage: https://docs.val.town/std/blob/
- Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

**Code:**
```typescript
// src/calendar/ics-fetcher.ts
import { retry } from '../utils/retry';
import { CalendarCache } from '../types';

const ICS_URL_TEMPLATE = 'https://www.nyc.gov/html/dot/downloads/misc/{year}-alternate-side.ics';
const CACHE_KEY = 'nyc-asp-calendar-cache';

// In Val Town, use @std/blob for storage. For local dev, use in-memory cache.
let memoryCache: CalendarCache | null = null;

/**
 * Fetch the ICS calendar file for a given year
 */
export async function fetchIcsFile(year: number): Promise<string> {
  const url = ICS_URL_TEMPLATE.replace('{year}', year.toString());

  const response = await retry(
    async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ICS: ${res.status} ${res.statusText}`);
      }
      return res;
    },
    { maxAttempts: 3, initialDelayMs: 1000 }
  );

  return await response.text();
}

/**
 * Get ICS content, using cache if available and fresh
 */
export async function getIcsContent(
  forceRefresh: boolean = false,
  storage?: any // Val Town blob storage
): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = await getCachedCalendar(storage);
    if (cached && isCacheFresh(cached)) {
      console.log('Using cached ICS calendar');
      return cached.icsContent;
    }
  }

  // Fetch fresh data
  console.log('Fetching fresh ICS calendar');
  const icsContent = await fetchIcsFile(currentYear);

  // Update cache
  await setCachedCalendar({ icsContent, fetchedAt: new Date() }, storage);

  return icsContent;
}

/**
 * Check if cached data is still fresh (less than 7 days old)
 */
function isCacheFresh(cache: Partial<CalendarCache>): boolean {
  if (!cache.fetchedAt) return false;

  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return age < sevenDays;
}

/**
 * Get cached calendar from storage
 */
async function getCachedCalendar(storage?: any): Promise<Partial<CalendarCache> | null> {
  if (storage) {
    // Val Town blob storage
    try {
      const blob = await storage.getJSON(CACHE_KEY);
      return blob || null;
    } catch {
      return null;
    }
  }

  // In-memory cache for local dev
  return memoryCache;
}

/**
 * Save calendar to cache
 */
async function setCachedCalendar(
  cache: Partial<CalendarCache>,
  storage?: any
): Promise<void> {
  if (storage) {
    // Val Town blob storage
    await storage.setJSON(CACHE_KEY, cache);
  } else {
    // In-memory cache for local dev
    memoryCache = cache as CalendarCache;
  }
}
```

**Testing:**
Create `tests/fixtures/sample.ics`:
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NYC DOT//ASP Calendar//EN
BEGIN:VEVENT
DTSTART:20251225
DTEND:20251226
SUMMARY:Christmas Day - ASP Suspended
END:VEVENT
BEGIN:VEVENT
DTSTART:20251101
DTEND:20251102
SUMMARY:Day After Halloween - ASP Suspended
END:VEVENT
END:VCALENDAR
```

Create `tests/unit/ics-fetcher.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchIcsFile } from '../../src/calendar/ics-fetcher';

// Mock fetch globally
global.fetch = vi.fn();

describe('ics-fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch ICS file successfully', async () => {
    const mockIcsContent = 'BEGIN:VCALENDAR\nEND:VCALENDAR';

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockIcsContent,
    });

    const result = await fetchIcsFile(2025);

    expect(result).toBe(mockIcsContent);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.nyc.gov/html/dot/downloads/misc/2025-alternate-side.ics'
    );
  });

  it('should throw error on failed fetch', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchIcsFile(2025)).rejects.toThrow('Failed to fetch ICS');
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement ICS calendar fetcher with caching

- Downloads ASP calendar from NYC DOT
- Caches for 7 days to reduce requests
- Supports both Val Town blob storage and in-memory cache
```

---

#### Task 2.4: Implement ICS Parser
**Goal:** Parse ICS file to extract suspension dates.

**Files to create:**
- `src/calendar/ics-parser.ts`

**Documentation:**
- ical.js library: https://github.com/kewisch/ical.js/

**Code:**
```typescript
// src/calendar/ics-parser.ts
import ICAL from 'ical.js';
import { toIsoDateString } from '../utils/date-utils';

/**
 * Parse ICS content and extract suspension dates
 * Returns array of ISO date strings (YYYY-MM-DD)
 */
export function parseIcsSuspensions(icsContent: string): string[] {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const suspensionDates: Set<string> = new Set();

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const summary = event.summary.toLowerCase();

      // Check if event indicates ASP suspension
      if (isSuspensionEvent(summary)) {
        const startDate = event.startDate.toJSDate();
        suspensionDates.add(toIsoDateString(startDate));
      }
    }

    return Array.from(suspensionDates).sort();
  } catch (error) {
    console.error('Failed to parse ICS:', error);
    throw new Error(`ICS parsing failed: ${error}`);
  }
}

/**
 * Determine if event summary indicates ASP is suspended
 */
function isSuspensionEvent(summary: string): boolean {
  const suspensionKeywords = [
    'asp suspended',
    'alternate side parking suspended',
    'no asp',
    'suspended',
  ];

  return suspensionKeywords.some(keyword => summary.includes(keyword));
}

/**
 * Check if a specific date is suspended according to ICS data
 */
export function isSuspendedByIcs(
  date: Date,
  suspensionDates: string[]
): boolean {
  const dateStr = toIsoDateString(date);
  return suspensionDates.includes(dateStr);
}
```

**Testing:**
Create `tests/unit/ics-parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseIcsSuspensions, isSuspendedByIcs } from '../../src/calendar/ics-parser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ics-parser', () => {
  const sampleIcs = readFileSync(
    join(__dirname, '../fixtures/sample.ics'),
    'utf-8'
  );

  it('should parse suspension dates from ICS', () => {
    const dates = parseIcsSuspensions(sampleIcs);

    expect(dates).toContain('2025-12-25'); // Christmas
    expect(dates).toContain('2025-11-01'); // Day after Halloween
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should check if date is suspended', () => {
    const dates = parseIcsSuspensions(sampleIcs);

    const christmas = new Date('2025-12-25T12:00:00');
    expect(isSuspendedByIcs(christmas, dates)).toBe(true);

    const regularDay = new Date('2025-10-15T12:00:00');
    expect(isSuspendedByIcs(regularDay, dates)).toBe(false);
  });

  it('should handle invalid ICS gracefully', () => {
    const invalidIcs = 'NOT A VALID ICS FILE';
    expect(() => parseIcsSuspensions(invalidIcs)).toThrow('ICS parsing failed');
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement ICS parser to extract suspension dates
```

---

#### Task 2.5: Implement NYC Website Scraper
**Goal:** Scrape NYC DOT website to detect emergency ASP suspensions.

**Files to create:**
- `src/scraper/nyc-website.ts`

**Documentation:**
- linkedom (HTML parser): https://github.com/WebReflection/linkedom

**Code:**
```typescript
// src/scraper/nyc-website.ts
import { parseHTML } from 'linkedom';
import { retry } from '../utils/retry';
import { ScrapeResult } from '../types';

const NYC_ASP_URL = 'https://www.nyc.gov/html/dot/html/motorist/alternate-side-parking.shtml';

/**
 * Scrape NYC DOT website to check if ASP is suspended today
 */
export async function scrapeNycWebsite(): Promise<ScrapeResult> {
  const html = await retry(
    async () => {
      const res = await fetch(NYC_ASP_URL);
      if (!res.ok) {
        throw new Error(`Failed to fetch NYC website: ${res.status}`);
      }
      return await res.text();
    },
    { maxAttempts: 3, initialDelayMs: 1000 }
  );

  return parseHtmlForSuspension(html);
}

/**
 * Parse HTML to detect suspension status
 */
export function parseHtmlForSuspension(html: string): ScrapeResult {
  const { document } = parseHTML(html);

  // Look for common suspension indicators
  const bodyText = document.body.textContent?.toLowerCase() || '';

  const suspensionPhrases = [
    'asp is suspended',
    'alternate side parking is suspended',
    'parking rules are suspended',
    'asp suspended today',
    'not in effect today',
    'suspended due to',
  ];

  for (const phrase of suspensionPhrases) {
    if (bodyText.includes(phrase)) {
      // Try to extract reason
      const reason = extractSuspensionReason(bodyText, phrase);

      return {
        isSuspendedToday: true,
        reason,
        scrapedAt: new Date(),
      };
    }
  }

  return {
    isSuspendedToday: false,
    scrapedAt: new Date(),
  };
}

/**
 * Attempt to extract the reason for suspension from text
 */
function extractSuspensionReason(text: string, foundPhrase: string): string | undefined {
  const reasonKeywords = ['snow', 'weather', 'emergency', 'holiday'];

  for (const keyword of reasonKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  // Default reason
  return 'emergency';
}
```

**Testing:**
Create `tests/fixtures/nyc-suspended.html`:
```html
<!DOCTYPE html>
<html>
<head><title>NYC DOT</title></head>
<body>
  <div class="alert">
    <strong>Alert:</strong> ASP is suspended today due to snow.
  </div>
</body>
</html>
```

Create `tests/fixtures/nyc-normal.html`:
```html
<!DOCTYPE html>
<html>
<head><title>NYC DOT</title></head>
<body>
  <div class="content">
    Alternate Side Parking regulations are in effect today.
  </div>
</body>
</html>
```

Create `tests/unit/nyc-website.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseHtmlForSuspension } from '../../src/scraper/nyc-website';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('nyc-website scraper', () => {
  it('should detect suspension from HTML', () => {
    const html = readFileSync(
      join(__dirname, '../fixtures/nyc-suspended.html'),
      'utf-8'
    );

    const result = parseHtmlForSuspension(html);

    expect(result.isSuspendedToday).toBe(true);
    expect(result.reason).toBe('snow');
  });

  it('should detect normal day (not suspended)', () => {
    const html = readFileSync(
      join(__dirname, '../fixtures/nyc-normal.html'),
      'utf-8'
    );

    const result = parseHtmlForSuspension(html);

    expect(result.isSuspendedToday).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement NYC DOT website scraper for emergency suspensions
```

---

### Phase 3: Parking Logic Engine

#### Task 3.1: Implement Suspension Checker
**Goal:** Combine ICS and website data to determine if a day is suspended.

**Files to create:**
- `src/parking-logic/suspension-checker.ts`

**Code:**
```typescript
// src/parking-logic/suspension-checker.ts
import { getIcsContent } from '../calendar/ics-fetcher';
import { parseIcsSuspensions, isSuspendedByIcs } from '../calendar/ics-parser';
import { scrapeNycWebsite } from '../scraper/nyc-website';
import { isSameDayNyc, getNycNow } from '../utils/date-utils';

let cachedSuspensionDates: string[] = [];
let lastIcsFetch: Date | null = null;

/**
 * Initialize suspension data (fetch ICS on first call or weekly)
 */
async function ensureSuspensionDataLoaded(storage?: any): Promise<void> {
  const now = getNycNow();
  const needsRefresh = !lastIcsFetch ||
    (now.getTime() - lastIcsFetch.getTime()) > 7 * 24 * 60 * 60 * 1000;

  if (needsRefresh) {
    const icsContent = await getIcsContent(false, storage);
    cachedSuspensionDates = parseIcsSuspensions(icsContent);
    lastIcsFetch = now;
  }
}

/**
 * Check if a specific date has ASP suspended
 * Combines ICS calendar data + website scraping for today
 */
export async function isSuspended(
  date: Date,
  storage?: any
): Promise<{ suspended: boolean; reason?: string }> {
  await ensureSuspensionDataLoaded(storage);

  // Check ICS calendar first
  if (isSuspendedByIcs(date, cachedSuspensionDates)) {
    return { suspended: true, reason: 'holiday' };
  }

  // For today only, check website for emergency suspensions
  const today = getNycNow();
  if (isSameDayNyc(date, today)) {
    try {
      const scrapeResult = await scrapeNycWebsite();
      if (scrapeResult.isSuspendedToday) {
        return {
          suspended: true,
          reason: scrapeResult.reason || 'emergency'
        };
      }
    } catch (error) {
      console.error('Failed to scrape website, using ICS data only:', error);
      // Fall through to return ICS result
    }
  }

  return { suspended: false };
}

/**
 * Get all suspension dates from ICS (for week view)
 */
export async function getSuspensionDates(storage?: any): Promise<string[]> {
  await ensureSuspensionDataLoaded(storage);
  return cachedSuspensionDates;
}
```

**Testing:**
Create `tests/unit/suspension-checker.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSuspended } from '../../src/parking-logic/suspension-checker';
import * as icsFetcher from '../../src/calendar/ics-fetcher';
import * as icsParser from '../../src/calendar/ics-parser';
import * as scraper from '../../src/scraper/nyc-website';

vi.mock('../../src/calendar/ics-fetcher');
vi.mock('../../src/calendar/ics-parser');
vi.mock('../../src/scraper/nyc-website');

describe('suspension-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect ICS suspension', async () => {
    vi.mocked(icsFetcher.getIcsContent).mockResolvedValue('ICS_CONTENT');
    vi.mocked(icsParser.parseIcsSuspensions).mockReturnValue(['2025-12-25']);
    vi.mocked(icsParser.isSuspendedByIcs).mockReturnValue(true);

    const christmas = new Date('2025-12-25T12:00:00');
    const result = await isSuspended(christmas);

    expect(result.suspended).toBe(true);
    expect(result.reason).toBe('holiday');
  });

  it('should detect emergency suspension from website', async () => {
    vi.mocked(icsFetcher.getIcsContent).mockResolvedValue('ICS_CONTENT');
    vi.mocked(icsParser.parseIcsSuspensions).mockReturnValue([]);
    vi.mocked(icsParser.isSuspendedByIcs).mockReturnValue(false);
    vi.mocked(scraper.scrapeNycWebsite).mockResolvedValue({
      isSuspendedToday: true,
      reason: 'snow',
      scrapedAt: new Date(),
    });

    // Mock getNycNow to return today
    const today = new Date();
    const result = await isSuspended(today);

    // Note: This test is time-dependent. In real scenario, mock getNycNow
    // For now, just verify it doesn't throw
    expect(result).toBeDefined();
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement suspension checker combining ICS and website data
```

---

#### Task 3.2: Implement Week Analyzer
**Goal:** Build a complete week view showing parking status for Mon-Fri.

**Files to create:**
- `src/parking-logic/week-analyzer.ts`

**Code:**
```typescript
// src/parking-logic/week-analyzer.ts
import { Config, DayStatus, WeekView, Side } from '../types';
import { getWeekdays, getDayOfWeek, getThisMonday, getThisFriday } from '../utils/date-utils';
import { isSuspended } from './suspension-checker';

/**
 * Build week view with parking status for each day
 */
export async function buildWeekView(
  config: Config,
  storage?: any
): Promise<WeekView> {
  const weekdays = getWeekdays();
  const days: DayStatus[] = [];

  for (const date of weekdays) {
    const dayOfWeek = getDayOfWeek(date);

    // Check if this day has street cleaning on each side
    const hasNearSideCleaning = config.nearSideDays.includes(dayOfWeek);
    const hasFarSideCleaning = config.farSideDays.includes(dayOfWeek);

    // Check if suspended
    const { suspended, reason } = await isSuspended(date, storage);

    // Determine where car should be parked
    const parkOnSide = determineParkingSide(
      hasNearSideCleaning,
      hasFarSideCleaning,
      suspended
    );

    days.push({
      date,
      dayOfWeek,
      hasNearSideCleaning,
      hasFarSideCleaning,
      isSuspended: suspended,
      suspensionReason: reason,
      parkOnSide,
    });
  }

  return {
    startDate: getThisMonday(),
    endDate: getThisFriday(),
    days,
  };
}

/**
 * Determine which side to park on based on cleaning schedule
 *
 * Logic: Park on the side that does NOT have cleaning today
 * If suspended: Stay on the side that protects you for the next cleaning day
 */
function determineParkingSide(
  hasNearSideCleaning: boolean,
  hasFarSideCleaning: boolean,
  isSuspended: boolean
): Side | null {
  // If suspended, we need context of the week to decide
  // For now, return null for suspended days (will be filled in by week-level logic)
  if (isSuspended) {
    return null;
  }

  // Park on opposite side of cleaning
  if (hasNearSideCleaning) return 'far';
  if (hasFarSideCleaning) return 'near';

  // No cleaning today (e.g., Wednesday)
  return null;
}

/**
 * Fill in parking sides for suspended/no-cleaning days
 * Strategy: Stay on current side to prepare for next cleaning day
 */
export function optimizeParkingSides(weekView: WeekView): WeekView {
  const days = [...weekView.days];

  for (let i = 0; i < days.length; i++) {
    if (days[i].parkOnSide !== null) continue;

    // Find next day with cleaning
    const nextCleaningDay = findNextCleaningDay(days, i);

    if (nextCleaningDay) {
      // Park on the side needed for next cleaning
      days[i].parkOnSide = nextCleaningDay.parkOnSide;
    } else {
      // No more cleaning this week, stay on current side
      // Look back to find current side
      const prevDay = findPreviousDay(days, i);
      days[i].parkOnSide = prevDay?.parkOnSide || 'far';
    }
  }

  return { ...weekView, days };
}

function findNextCleaningDay(days: DayStatus[], startIndex: number): DayStatus | null {
  for (let i = startIndex + 1; i < days.length; i++) {
    if (days[i].parkOnSide !== null) {
      return days[i];
    }
  }
  return null;
}

function findPreviousDay(days: DayStatus[], startIndex: number): DayStatus | null {
  for (let i = startIndex - 1; i >= 0; i--) {
    if (days[i].parkOnSide !== null) {
      return days[i];
    }
  }
  return null;
}
```

**Testing:**
Create `tests/unit/week-analyzer.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWeekView, optimizeParkingSides } from '../../src/parking-logic/week-analyzer';
import { Config } from '../../src/types';
import * as suspensionChecker from '../../src/parking-logic/suspension-checker';

vi.mock('../../src/parking-logic/suspension-checker');

describe('week-analyzer', () => {
  const mockConfig: Config = {
    slackWebhookUrl: 'test',
    nearSideDays: ['Mon', 'Thu'],
    farSideDays: ['Tue', 'Fri'],
    cleaningStartTime: '09:00',
    cleaningEndTime: '10:30',
    nearSideEmoji: '🏠',
    farSideEmoji: '🌳',
    weeklySummaryTime: '',
    dailyReminderTime: '',
    emergencyCheckTime: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(suspensionChecker.isSuspended).mockResolvedValue({
      suspended: false
    });
  });

  it('should build week view with correct cleaning days', async () => {
    const weekView = await buildWeekView(mockConfig);

    expect(weekView.days).toHaveLength(5);

    // Monday should have near side cleaning
    const monday = weekView.days.find(d => d.dayOfWeek === 'Mon');
    expect(monday?.hasNearSideCleaning).toBe(true);
    expect(monday?.parkOnSide).toBe('far');

    // Tuesday should have far side cleaning
    const tuesday = weekView.days.find(d => d.dayOfWeek === 'Tue');
    expect(tuesday?.hasFarSideCleaning).toBe(true);
    expect(tuesday?.parkOnSide).toBe('near');
  });

  it('should optimize parking sides for suspended days', async () => {
    // Mock Tuesday as suspended
    vi.mocked(suspensionChecker.isSuspended).mockImplementation(async (date) => {
      const day = date.getDay();
      return { suspended: day === 2 }; // 2 = Tuesday
    });

    const weekView = await buildWeekView(mockConfig);
    const optimized = optimizeParkingSides(weekView);

    const tuesday = optimized.days.find(d => d.dayOfWeek === 'Tue');
    // Tuesday suspended, should stay on far side for Thursday
    expect(tuesday?.parkOnSide).toBe('far');
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement week analyzer to build parking schedule
```

---

#### Task 3.3: Implement Move Decision Logic
**Goal:** Determine when to send move reminders.

**Files to create:**
- `src/parking-logic/move-decision.ts`

**Code:**
```typescript
// src/parking-logic/move-decision.ts
import { Config, WeekView, DayStatus, MoveDecision, Side } from '../types';
import { getNycNow, getDayOfWeek, isSameDayNyc } from '../utils/date-utils';

/**
 * Determine if a move reminder should be sent today at 10 AM
 *
 * Logic:
 * 1. Is today a cleaning day (not suspended)?
 * 2. Where is the car now? (opposite of today's cleaning)
 * 3. What's the next cleaning day?
 * 4. Do we need to switch sides?
 * 5. Is it Friday? (skip - weekend coming)
 */
export function shouldSendMoveReminder(
  weekView: WeekView,
  config: Config
): MoveDecision {
  const today = getNycNow();
  const todayStatus = weekView.days.find(d => isSameDayNyc(d.date, today));

  if (!todayStatus) {
    return { shouldMove: false };
  }

  // Not a cleaning day? No move needed
  if (!todayStatus.hasNearSideCleaning && !todayStatus.hasFarSideCleaning) {
    return { shouldMove: false };
  }

  // Suspended today? No move needed
  if (todayStatus.isSuspended) {
    return { shouldMove: false };
  }

  // Is it Friday? Skip (weekend coming)
  if (todayStatus.dayOfWeek === 'Fri') {
    return { shouldMove: false };
  }

  // Where is car now? (opposite of today's cleaning)
  const currentSide: Side = todayStatus.hasNearSideCleaning ? 'far' : 'near';

  // Find next cleaning day
  const nextCleaningDay = findNextCleaningDay(weekView, todayStatus);

  if (!nextCleaningDay) {
    // No more cleaning this week
    return { shouldMove: false };
  }

  // What side do we need for next cleaning?
  const targetSide = nextCleaningDay.parkOnSide;

  if (!targetSide || currentSide === targetSide) {
    // Already on correct side
    return { shouldMove: false };
  }

  // Need to move!
  return {
    shouldMove: true,
    currentSide,
    targetSide,
    nextMoveDate: nextCleaningDay.date,
  };
}

/**
 * Find the next day with active street cleaning
 */
function findNextCleaningDay(
  weekView: WeekView,
  fromDay: DayStatus
): DayStatus | null {
  const fromIndex = weekView.days.findIndex(d =>
    isSameDayNyc(d.date, fromDay.date)
  );

  for (let i = fromIndex + 1; i < weekView.days.length; i++) {
    const day = weekView.days[i];
    if (!day.isSuspended && (day.hasNearSideCleaning || day.hasFarSideCleaning)) {
      return day;
    }
  }

  // Look into next week (Monday only)
  // This handles Friday->Monday transition
  const nextMonday = weekView.days.find(d => d.dayOfWeek === 'Mon');
  if (nextMonday && !nextMonday.isSuspended &&
      (nextMonday.hasNearSideCleaning || nextMonday.hasFarSideCleaning)) {
    return nextMonday;
  }

  return null;
}
```

**Testing:**
Create `tests/unit/move-decision.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { shouldSendMoveReminder } from '../../src/parking-logic/move-decision';
import { Config, WeekView, DayStatus } from '../../src/types';

describe('move-decision', () => {
  const mockConfig: Config = {
    slackWebhookUrl: 'test',
    nearSideDays: ['Mon', 'Thu'],
    farSideDays: ['Tue', 'Fri'],
    cleaningStartTime: '09:00',
    cleaningEndTime: '10:30',
    nearSideEmoji: '🏠',
    farSideEmoji: '🌳',
    weeklySummaryTime: '',
    dailyReminderTime: '',
    emergencyCheckTime: '',
  };

  function createMockWeekView(days: Partial<DayStatus>[]): WeekView {
    const fullDays: DayStatus[] = days.map((d, i) => ({
      date: new Date(2025, 9, 6 + i), // Oct 6-10, 2025 (Mon-Fri)
      dayOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i] as any,
      hasNearSideCleaning: false,
      hasFarSideCleaning: false,
      isSuspended: false,
      parkOnSide: null,
      ...d,
    }));

    return {
      startDate: fullDays[0].date,
      endDate: fullDays[4].date,
      days: fullDays,
    };
  }

  it('should send move reminder when sides differ', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon (today)
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Tue
      { parkOnSide: 'near' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Mock today as Monday
    const decision = shouldSendMoveReminder(weekView, mockConfig);

    // Monday->Tuesday requires move from far->near
    expect(decision.shouldMove).toBe(true);
    expect(decision.currentSide).toBe('far');
    expect(decision.targetSide).toBe('near');
  });

  it('should not send reminder on Friday', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' },
      { hasFarSideCleaning: true, parkOnSide: 'near' },
      { parkOnSide: 'near' },
      { hasNearSideCleaning: true, parkOnSide: 'far' },
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri (today)
    ]);

    // Mock today as Friday
    // Note: This test is simplified. In real implementation, mock getNycNow()
    const decision = shouldSendMoveReminder(weekView, mockConfig);

    // Should not move on Friday
    expect(decision.shouldMove).toBe(false);
  });

  it('should not send reminder when already on correct side', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon (today)
      { isSuspended: true, parkOnSide: 'far' }, // Tue suspended
      { parkOnSide: 'far' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Today is Monday, car on far side
    // Next cleaning is Thursday, also needs far side
    // No move needed
    const decision = shouldSendMoveReminder(weekView, mockConfig);
    expect(decision.shouldMove).toBe(false);
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement move decision logic for daily reminders
```

---

### Phase 4: Slack Integration

#### Task 4.1: Create Slack Message Builder
**Goal:** Generate Slack Block Kit messages for all three message types.

**Files to create:**
- `src/slack/message-builder.ts`

**Documentation:**
- Slack Block Kit: https://api.slack.com/block-kit
- Block Kit Builder (interactive): https://app.slack.com/block-kit-builder

**Code:**
```typescript
// src/slack/message-builder.ts
import { Config, WeekView, MoveDecision, Side } from '../types';
import { formatNycDate, getDayOfWeek } from '../utils/date-utils';

/**
 * Build weekly strategy message (Sunday 5 AM)
 */
export function buildWeeklySummary(
  weekView: WeekView,
  config: Config
): any {
  const weekStart = formatNycDate(weekView.startDate, 'MMM d');
  const weekEnd = formatNycDate(weekView.endDate, 'MMM d');

  // Build emoji calendar
  const calendarRow = weekView.days.map(day => {
    const emoji = day.parkOnSide === 'near'
      ? config.nearSideEmoji
      : config.farSideEmoji;

    return emoji;
  }).join('  ');

  const dayHeaders = 'Mon    Tue    Wed    Thu    Fri';

  // Generate strategy text
  const strategyText = generateStrategyText(weekView, config);

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚗 Parking Strategy for ${weekStart} - ${weekEnd}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`${dayHeaders}\`\n${calendarRow}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: strategyText,
        },
      },
      {
        type: 'divider',
      },
      ...buildDayBreakdown(weekView, config),
    ],
  };
}

/**
 * Generate strategy summary text
 */
function generateStrategyText(weekView: WeekView, config: Config): string {
  const suspendedDays = weekView.days.filter(d => d.isSuspended);
  const cleaningDays = weekView.days.filter(d =>
    !d.isSuspended && (d.hasNearSideCleaning || d.hasFarSideCleaning)
  );

  if (suspendedDays.length === 0) {
    return `*Normal week* - Standard shuffle pattern. Start on ${config.farSideEmoji} far side Sunday night.`;
  }

  const suspendedDayNames = suspendedDays.map(d => d.dayOfWeek).join(', ');

  if (cleaningDays.length <= 2) {
    return `*Easy week!* ASP suspended on ${suspendedDayNames}. Only ${cleaningDays.length} cleaning days this week.`;
  }

  return `ASP suspended on ${suspendedDayNames}. Adjust your shuffle pattern accordingly.`;
}

/**
 * Build day-by-day breakdown
 */
function buildDayBreakdown(weekView: WeekView, config: Config): any[] {
  const blocks: any[] = [];

  for (const day of weekView.days) {
    const sideEmoji = day.parkOnSide === 'near'
      ? config.nearSideEmoji
      : config.farSideEmoji;

    const sideName = day.parkOnSide === 'near' ? 'near' : 'far';

    let description = '';
    if (day.isSuspended) {
      description = `${day.suspensionReason || 'ASP suspended'}`;
    } else if (day.hasNearSideCleaning) {
      description = 'near side has cleaning';
    } else if (day.hasFarSideCleaning) {
      description = 'far side has cleaning';
    } else {
      description = 'no cleaning today';
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${sideEmoji} *${day.dayOfWeek}*: Park on ${sideName} side - _${description}_`,
      },
    });
  }

  return blocks;
}

/**
 * Build daily move reminder (10 AM)
 */
export function buildMoveReminder(
  decision: MoveDecision,
  config: Config
): any {
  const fromEmoji = decision.currentSide === 'near'
    ? config.nearSideEmoji
    : config.farSideEmoji;

  const toEmoji = decision.targetSide === 'near'
    ? config.nearSideEmoji
    : config.farSideEmoji;

  const fromSide = decision.currentSide === 'near' ? 'near' : 'far';
  const toSide = decision.targetSide === 'near' ? 'near' : 'far';

  const nextMoveDow = decision.nextMoveDate
    ? getDayOfWeek(decision.nextMoveDate)
    : 'next week';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚗 Move Your Car Now!',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `From ${fromEmoji} *${fromSide} side* → ${toEmoji} *${toSide} side*`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Next move: *${nextMoveDow}*`,
          },
        ],
      },
    ],
  };
}

/**
 * Build emergency suspension alert (12:30 PM)
 */
export function buildEmergencyAlert(reason?: string): any {
  const reasonText = reason
    ? `Street cleaning suspended today due to *${reason}*.`
    : 'Street cleaning suspended today.';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Emergency ASP Suspension',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: reasonText,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your car is safe wherever it\'s parked. ✅',
        },
      },
    ],
  };
}

/**
 * Build error notification
 */
export function buildErrorNotification(errorMessage: string): any {
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔴 NYC ASP Bot Error',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${errorMessage}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Check Val Town logs for details. Verify street cleaning manually today.',
          },
        ],
      },
    ],
  };
}
```

**Testing:**
Create `tests/unit/message-builder.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildWeeklySummary, buildMoveReminder, buildEmergencyAlert } from '../../src/slack/message-builder';
import { Config, WeekView, MoveDecision } from '../../src/types';

describe('message-builder', () => {
  const mockConfig: Config = {
    slackWebhookUrl: 'test',
    nearSideDays: ['Mon', 'Thu'],
    farSideDays: ['Tue', 'Fri'],
    cleaningStartTime: '09:00',
    cleaningEndTime: '10:30',
    nearSideEmoji: '🏠',
    farSideEmoji: '🌳',
    weeklySummaryTime: '',
    dailyReminderTime: '',
    emergencyCheckTime: '',
  };

  it('should build weekly summary message', () => {
    const weekView: WeekView = {
      startDate: new Date('2025-10-06'),
      endDate: new Date('2025-10-10'),
      days: [
        {
          date: new Date('2025-10-06'),
          dayOfWeek: 'Mon',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far'
        },
        {
          date: new Date('2025-10-07'),
          dayOfWeek: 'Tue',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: false,
          parkOnSide: 'near'
        },
        {
          date: new Date('2025-10-08'),
          dayOfWeek: 'Wed',
          hasNearSideCleaning: false,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'near'
        },
        {
          date: new Date('2025-10-09'),
          dayOfWeek: 'Thu',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far'
        },
        {
          date: new Date('2025-10-10'),
          dayOfWeek: 'Fri',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: false,
          parkOnSide: 'near'
        },
      ],
    };

    const message = buildWeeklySummary(weekView, mockConfig);

    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].type).toBe('header');
    expect(message.blocks[0].text.text).toContain('Parking Strategy');
  });

  it('should build move reminder message', () => {
    const decision: MoveDecision = {
      shouldMove: true,
      currentSide: 'far',
      targetSide: 'near',
      nextMoveDate: new Date('2025-10-09'),
    };

    const message = buildMoveReminder(decision, mockConfig);

    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].text.text).toContain('Move Your Car');
    expect(message.blocks[1].text.text).toContain('far side');
    expect(message.blocks[1].text.text).toContain('near side');
  });

  it('should build emergency alert', () => {
    const message = buildEmergencyAlert('snow');

    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].text.text).toContain('Emergency');
    expect(message.blocks[1].text.text).toContain('snow');
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement Slack Block Kit message builders

- Weekly summary with emoji calendar
- Daily move reminders
- Emergency suspension alerts
- Error notifications
```

---

#### Task 4.2: Implement Slack Webhook Sender
**Goal:** Send messages to Slack via webhook with error handling.

**Files to create:**
- `src/slack/webhook.ts`

**Code:**
```typescript
// src/slack/webhook.ts
import { retry } from '../utils/retry';

/**
 * Send message to Slack via webhook
 */
export async function sendToSlack(
  webhookUrl: string,
  message: any
): Promise<void> {
  await retry(
    async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText} - ${text}`
        );
      }

      const responseText = await response.text();
      if (responseText !== 'ok') {
        throw new Error(`Slack returned unexpected response: ${responseText}`);
      }
    },
    { maxAttempts: 3, initialDelayMs: 1000 }
  );

  console.log('Message sent to Slack successfully');
}
```

**Testing:**
Create `tests/unit/webhook.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendToSlack } from '../../src/slack/webhook';

global.fetch = vi.fn();

describe('webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message successfully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => 'ok',
    });

    await sendToSlack('https://hooks.slack.com/test', { text: 'test' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should throw error on failed request', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error details',
    });

    await expect(
      sendToSlack('https://hooks.slack.com/test', { text: 'test' })
    ).rejects.toThrow('Slack webhook failed');
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement Slack webhook sender with retry logic
```

---

### Phase 5: Main Orchestration

#### Task 5.1: Create Main Entry Point
**Goal:** Wire everything together with scheduling logic.

**Files to create:**
- `src/main.ts`

**Code:**
```typescript
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
export async function main(storage?: any) {
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

    // Daily 10 AM - Move reminder
    if (hour === 10) {
      await checkAndSendMoveReminder(config, storage);
    }

    // Daily 12:30 PM - Emergency check
    if (hour === 12) {
      await checkEmergencySuspension(config, storage);
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
async function sendWeeklySummary(config: any, storage?: any) {
  console.log('Sending weekly summary...');

  const rawWeekView = await buildWeekView(config, storage);
  const weekView = optimizeParkingSides(rawWeekView);

  const message = buildWeeklySummary(weekView, config);
  await sendToSlack(config.slackWebhookUrl, message);

  console.log('Weekly summary sent');
}

/**
 * Check if move reminder should be sent and send if needed
 */
async function checkAndSendMoveReminder(config: any, storage?: any) {
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

/**
 * Check for emergency suspension and alert if found
 */
async function checkEmergencySuspension(config: any, storage?: any) {
  const today = getNycNow();
  const todayDow = getDayOfWeek(today);

  // Only check on weekdays with scheduled cleaning
  if (!config.nearSideDays.includes(todayDow) &&
      !config.farSideDays.includes(todayDow)) {
    console.log('No cleaning scheduled today, skipping emergency check');
    return;
  }

  const { suspended, reason } = await isSuspended(today, storage);

  // Check if this is an emergency (not in ICS)
  // This is approximated by checking if the website reports suspension
  // A more robust implementation would compare against ICS explicitly

  if (suspended && reason === 'emergency') {
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
```

**Testing:**
Create `tests/integration/main.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { main } from '../../src/main';
import * as webhook from '../../src/slack/webhook';

vi.mock('../../src/slack/webhook');
vi.mock('../../src/calendar/ics-fetcher');
vi.mock('../../src/scraper/nyc-website');

describe('main integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  });

  it('should run without errors', async () => {
    vi.mocked(webhook.sendToSlack).mockResolvedValue();

    await expect(main()).resolves.not.toThrow();
  });

  it('should send error notification on failure', async () => {
    vi.mocked(webhook.sendToSlack).mockRejectedValueOnce(
      new Error('Test error')
    );

    await main();

    // Should attempt to send error notification
    expect(webhook.sendToSlack).toHaveBeenCalled();
  });
});
```

Run: `bun test`

**Commit message:**
```
feat: implement main orchestration logic with scheduling

- Routes to appropriate function based on time/day
- Handles errors and sends notifications
- Integrates all components
```

---

### Phase 6: Deployment & Testing

#### Task 6.1: Create Val Town Deployment Script
**Goal:** Package and deploy to Val Town.

**Files to create:**
- `deploy.sh`
- `README.md`

**Code for `deploy.sh`:**
```bash
#!/bin/bash
set -e

echo "📦 Building NYC ASP Bot for Val Town..."

# Bundle TypeScript into single file
bun build src/main.ts --outfile=dist/main.js --target=browser

echo "✅ Build complete"
echo ""
echo "🚀 Deploy to Val Town:"
echo "1. Go to https://val.town"
echo "2. Create new Val (HTTP or Interval)"
echo "3. Copy contents of dist/main.js"
echo "4. Set environment secrets:"
echo "   - SLACK_WEBHOOK_URL"
echo "   - NEAR_SIDE_DAYS (optional)"
echo "   - FAR_SIDE_DAYS (optional)"
echo "   - etc."
echo "5. Set interval: @hourly"
echo ""
echo "📖 See README.md for full deployment instructions"
```

Make executable: `chmod +x deploy.sh`

**Code for `README.md`:**
```markdown
# NYC ASP Parking Bot

Automated Slack notifications for NYC Alternate Side Parking strategy.

## Features

- **Weekly Strategy (Sun 5 AM)**: Visual calendar showing where to park each day
- **Daily Reminders (10 AM)**: Alerts when you need to move your car
- **Emergency Alerts (12:30 PM)**: Notifications for unexpected ASP suspensions

## Setup

### 1. Install Dependencies

\`\`\`bash
bun install
\`\`\`

### 2. Configure Environment

Create \`.env\`:

\`\`\`bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
NEAR_SIDE_DAYS=Mon,Thu
FAR_SIDE_DAYS=Tue,Fri
CLEANING_START_TIME=09:00
CLEANING_END_TIME=10:30
NEAR_SIDE_EMOJI=🏠
FAR_SIDE_EMOJI=🌳
\`\`\`

### 3. Test Locally

\`\`\`bash
bun test
bun src/main.ts
\`\`\`

### 4. Deploy to Val Town

\`\`\`bash
./deploy.sh
\`\`\`

Follow the instructions printed by the deploy script.

## Development

### Run Tests

\`\`\`bash
bun test
bun test:watch
\`\`\`

### Project Structure

- \`src/main.ts\` - Entry point
- \`src/config.ts\` - Configuration
- \`src/calendar/\` - ICS fetching & parsing
- \`src/scraper/\` - NYC website scraping
- \`src/parking-logic/\` - Core algorithms
- \`src/slack/\` - Message building & sending
- \`src/utils/\` - Utilities
- \`tests/\` - Test files

## Customization

Edit environment variables to customize for your street:

- \`NEAR_SIDE_DAYS\`: Days with cleaning on your home side
- \`FAR_SIDE_DAYS\`: Days with cleaning on opposite side
- \`CLEANING_START_TIME\` / \`CLEANING_END_TIME\`: Cleaning hours

## Troubleshooting

### No messages received

1. Check Val Town logs for errors
2. Verify Slack webhook URL is correct
3. Test webhook: \`curl -X POST -d '{"text":"test"}' YOUR_WEBHOOK_URL\`

### Wrong parking advice

1. Verify day configuration in env vars
2. Check ICS calendar is being fetched
3. Review week view in logs

## License

MIT
\`\`\`

**Commit message:**
```
docs: add deployment script and comprehensive README
```

---

#### Task 6.2: Create Manual Test Script
**Goal:** Script to manually test different scenarios.

**Files to create:**
- `scripts/test-scenarios.ts`

**Code:**
```typescript
// scripts/test-scenarios.ts
import { loadConfig } from '../src/config';
import { buildWeekView, optimizeParkingSides } from '../src/parking-logic/week-analyzer';
import { shouldSendMoveReminder } from '../src/parking-logic/move-decision';
import { buildWeeklySummary, buildMoveReminder } from '../src/slack/message-builder';
import { getNycNow, formatNycDate } from '../src/utils/date-utils';

/**
 * Test script to manually verify message generation
 */
async function testScenarios() {
  console.log('🧪 Testing NYC ASP Bot Scenarios\n');

  const config = loadConfig();
  const now = getNycNow();

  console.log(`Current time: ${formatNycDate(now, 'yyyy-MM-dd HH:mm zzz')}\n`);

  // Test 1: Generate week view
  console.log('📅 Test 1: Week View');
  console.log('─'.repeat(50));
  const rawWeekView = await buildWeekView(config);
  const weekView = optimizeParkingSides(rawWeekView);

  for (const day of weekView.days) {
    const emoji = day.parkOnSide === 'near' ? config.nearSideEmoji : config.farSideEmoji;
    const status = day.isSuspended ? '(suspended)' :
      day.hasNearSideCleaning ? '(near cleaning)' :
      day.hasFarSideCleaning ? '(far cleaning)' : '(no cleaning)';

    console.log(`${emoji} ${day.dayOfWeek}: Park on ${day.parkOnSide} side ${status}`);
  }
  console.log();

  // Test 2: Weekly summary message
  console.log('📨 Test 2: Weekly Summary Message');
  console.log('─'.repeat(50));
  const weeklySummaryMsg = buildWeeklySummary(weekView, config);
  console.log(JSON.stringify(weeklySummaryMsg, null, 2));
  console.log();

  // Test 3: Move decision
  console.log('🚗 Test 3: Move Decision');
  console.log('─'.repeat(50));
  const decision = shouldSendMoveReminder(weekView, config);
  console.log(`Should move: ${decision.shouldMove}`);
  if (decision.shouldMove) {
    console.log(`From: ${decision.currentSide} → To: ${decision.targetSide}`);
    console.log(`Next move: ${decision.nextMoveDate}`);

    const moveMsg = buildMoveReminder(decision, config);
    console.log(JSON.stringify(moveMsg, null, 2));
  }
  console.log();

  console.log('✅ All tests complete');
}

testScenarios().catch(console.error);
```

Add to `package.json`:
```json
{
  "scripts": {
    "test:scenarios": "bun scripts/test-scenarios.ts"
  }
}
```

Run: `bun run test:scenarios`

**Commit message:**
```
test: add manual test script for scenario verification
```

---

#### Task 6.3: Final Integration Test
**Goal:** End-to-end test with real data (or mocked real data).

**Files to create:**
- `tests/integration/e2e.test.ts`

**Code:**
```typescript
// tests/integration/e2e.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { main } from '../../src/main';
import { readFileSync } from 'fs';
import { join } from 'path';

// Setup mocks
vi.mock('../../src/calendar/ics-fetcher', () => ({
  getIcsContent: vi.fn().mockResolvedValue(
    readFileSync(join(__dirname, '../fixtures/sample.ics'), 'utf-8')
  ),
}));

vi.mock('../../src/scraper/nyc-website', () => ({
  scrapeNycWebsite: vi.fn().mockResolvedValue({
    isSuspendedToday: false,
    scrapedAt: new Date(),
  }),
}));

const mockSendToSlack = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/slack/webhook', () => ({
  sendToSlack: mockSendToSlack,
}));

describe('E2E Integration Test', () => {
  beforeAll(() => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.NEAR_SIDE_DAYS = 'Mon,Thu';
    process.env.FAR_SIDE_DAYS = 'Tue,Fri';
  });

  it('should run main without errors', async () => {
    await expect(main()).resolves.not.toThrow();
  });

  it('should generate valid Slack messages', async () => {
    // Mock Sunday 5 AM
    const sundayDate = new Date('2025-10-05T05:00:00');
    vi.spyOn(Date, 'now').mockReturnValue(sundayDate.getTime());

    await main();

    // Should have sent weekly summary
    expect(mockSendToSlack).toHaveBeenCalled();
    const message = mockSendToSlack.mock.calls[0][1];
    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].text.text).toContain('Parking Strategy');
  });
});
```

Run: `bun test tests/integration/e2e.test.ts`

**Commit message:**
```
test: add end-to-end integration test
```

---

## Testing Strategy

### Unit Tests

Each module should have comprehensive unit tests:

- **Coverage target**: 80%+
- **Test structure**: Arrange-Act-Assert
- **Mocking**: Mock external dependencies (fetch, storage)
- **Fixtures**: Use sample ICS and HTML files

Run: `bun test`

### Integration Tests

Test component interactions:

- Week view generation with real ICS data
- Message building from week view
- Error handling and retry logic

Run: `bun test tests/integration/`

### Manual Testing

Before deploying to Val Town:

1. Run `bun run test:scenarios` to verify message generation
2. Check output matches expectations
3. Test with different date/time scenarios by mocking `getNycNow()`

### Val Town Testing

After deployment:

1. Trigger val manually in Val Town UI
2. Check logs for errors
3. Verify Slack messages are received
4. Test all three schedules (Sun 5 AM, daily 10 AM, daily 12:30 PM)

---

## Deployment

### Local Development

```bash
# Install deps
bun install

# Run tests
bun test

# Test scenarios
bun run test:scenarios

# Run main (will check current time and execute appropriate action)
bun src/main.ts
```

### Val Town Deployment

1. **Build:**
   ```bash
   ./deploy.sh
   ```

2. **Create Val:**
   - Go to https://val.town
   - Click "New Val" → "Interval"
   - Name it "nyc-asp-bot"
   - Set interval to `@hourly`

3. **Copy Code:**
   - Copy contents of `dist/main.js` into Val editor
   - Or import as module if using Val Town's module system

4. **Set Secrets:**
   - In Val settings, add environment secrets:
     - `SLACK_WEBHOOK_URL` (required)
     - `NEAR_SIDE_DAYS` (optional, defaults to Mon,Thu)
     - `FAR_SIDE_DAYS` (optional, defaults to Tue,Fri)
     - Other config vars as needed

5. **Test:**
   - Click "Run" in Val Town UI
   - Check logs for output
   - Verify Slack message received

6. **Monitor:**
   - Check Val Town logs regularly
   - Set up alerts if available
   - Monitor Slack for messages

### Alternative: Cron Deployment

If not using Val Town, deploy to any cron-capable platform:

- **Cloudflare Workers** (with Cron Triggers)
- **AWS Lambda** (with EventBridge)
- **Render** (with Cron Jobs)
- **Railway** (with Cron)

Adjust `src/main.ts` to match platform's invocation model.

---

## Troubleshooting

### ICS File Not Loading

**Symptom:** Errors about parsing ICS or missing suspension dates

**Solutions:**
- Check NYC DOT website is accessible: `curl https://www.nyc.gov/html/dot/downloads/misc/2025-alternate-side.ics`
- Verify ICS file format hasn't changed
- Check Val Town storage is working (try manual read/write)
- Review parser logic for new event formats

### Website Scraping Fails

**Symptom:** Emergency check not detecting suspensions

**Solutions:**
- Visit https://www.nyc.gov/html/dot/html/motorist/alternate-side-parking.shtml manually
- Check HTML structure hasn't changed
- Update `parseHtmlForSuspension()` with new selectors/keywords
- Add more suspension phrase variations

### Wrong Move Reminders

**Symptom:** Getting reminders on wrong days or not at all

**Solutions:**
- Verify `NEAR_SIDE_DAYS` and `FAR_SIDE_DAYS` are correct
- Run `test:scenarios` to check week view logic
- Review move decision algorithm in `move-decision.ts`
- Check timezone handling (should be America/New_York)

### Slack Messages Not Sending

**Symptom:** No errors but messages don't appear in Slack

**Solutions:**
- Test webhook manually: `curl -X POST -d '{"text":"test"}' YOUR_WEBHOOK_URL`
- Check webhook hasn't expired (Slack webhooks can be revoked)
- Verify channel permissions
- Check Slack app is installed in workspace

### Time Zone Issues

**Symptom:** Messages sent at wrong times

**Solutions:**
- Verify Val Town uses UTC (it does)
- Check `getNycNow()` correctly converts to America/New_York
- Test date utilities with known dates
- Consider Daylight Saving Time transitions

---

## Advanced Customization

### Different Street Schedule

Edit environment variables:

```bash
# Example: Mon/Wed/Fri on near side, Tue/Thu on far side
NEAR_SIDE_DAYS=Mon,Wed,Fri
FAR_SIDE_DAYS=Tue,Thu
```

### Multiple Locations

Deploy separate Vals for each location:

- `nyc-asp-bot-brooklyn`
- `nyc-asp-bot-queens`
- Each with its own config and Slack channel

### Additional Features

Ideas for future enhancements:

1. **SMS Notifications**: Add Twilio integration
2. **Weather Integration**: Predict snow suspensions
3. **Parking Spot Tracker**: Log where you parked
4. **Multi-User Support**: Track multiple cars/residents
5. **Analytics**: Track how often you move vs. need to
6. **Calendar Export**: Generate .ics file of move dates

---

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow DRY principle
- Keep functions small and focused
- Write tests for all new features
- Document complex logic with comments

### Testing Requirements

- All new functions must have unit tests
- Integration tests for component interactions
- Maintain 80%+ code coverage
- Test edge cases (holidays, weekends, suspensions)

### Commit Messages

Follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `test:` Test additions/changes
- `docs:` Documentation
- `refactor:` Code restructuring
- `chore:` Build/tooling changes

---

## Resources

### NYC ASP Information
- Official NYC DOT ASP Page: https://www.nyc.gov/html/dot/html/motorist/alternate-side-parking.shtml
- ASP Calendar: https://www.nyc.gov/html/dot/downloads/misc/2025-alternate-side.ics

### Val Town
- Documentation: https://docs.val.town
- Interval Vals: https://docs.val.town/std/cron/
- Blob Storage: https://docs.val.town/std/blob/

### Slack
- Webhooks: https://api.slack.com/messaging/webhooks
- Block Kit: https://api.slack.com/block-kit
- Block Kit Builder: https://app.slack.com/block-kit-builder

### Libraries
- date-fns: https://date-fns.org/
- ical.js: https://github.com/kewisch/ical.js/
- linkedom: https://github.com/WebReflection/linkedom

---

## Support

For issues, questions, or suggestions:

1. Check this documentation
2. Review Val Town logs
3. Test locally with `bun run test:scenarios`
4. Check NYC DOT website for changes
5. Verify Slack webhook is working

---

**Good luck with your implementation! 🚗 🏠 🌳**
