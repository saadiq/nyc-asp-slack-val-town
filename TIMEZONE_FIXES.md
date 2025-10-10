# Comprehensive Timezone Fixes

## Summary
This document details all timezone-related bugs that were identified and fixed in the NYC ASP Bot codebase to ensure all date/time operations correctly use NYC timezone (America/New_York), not the system's local timezone.

## Background
The bot runs on Val Town servers (UTC timezone) but needs to make scheduling decisions based on NYC time. Any use of JavaScript's native Date methods that don't account for timezone (like `.getHours()`, `.getDay()`, `.setDate()`) can cause bugs when the system and target timezones differ.

---

## Fixes Applied

### 1. **src/main.ts:24** - Hour Extraction ✅ (Previously Fixed)
**Issue**: Used `.getHours()` which returns system timezone hour
**Impact**: Weekly summaries, move reminders, and emergency checks wouldn't fire at correct NYC times
**Fix**: Changed to `parseInt(formatInTimeZone(now, NYC_TIMEZONE, 'H'), 10)`

---

### 2. **src/utils/date-utils.ts:27** - getDayOfWeek() Function ✅
**Issue**: Used `date.getDay()` which returns day-of-week in system timezone
**Impact**: Could detect wrong day near midnight UTC (e.g., 8 PM Thursday NYC = midnight Friday UTC)
**Fix**: Changed to use `formatInTimeZone(date, NYC_TIMEZONE, 'i')` to get day index in NYC timezone

**Before**:
```typescript
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayMap[date.getDay()]; // ❌ System timezone
}
```

**After**:
```typescript
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayIndex = parseInt(formatInTimeZone(date, NYC_TIMEZONE, 'i'), 10);
  return dayMap[dayIndex % 7]; // ✅ NYC timezone
}
```

---

### 3. **src/utils/date-utils.ts:38-50** - getThisMonday() Function ✅
**Issue**: Used `date.getDay()` and `.setDate()` / `.setHours()` which operate in system timezone
**Impact**: Week calculation could be off by a day, causing wrong parking strategy
**Fix**: Rewrote to use `addDays()` and timezone-aware date construction

**Before**:
```typescript
export function getThisMonday(now: Date = getNycNow()): Date {
  const dayOfWeek = now.getDay(); // ❌ System timezone
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday); // ❌ System timezone
  monday.setHours(12, 0, 0, 0); // ❌ System timezone
  return monday;
}
```

**After**:
```typescript
export function getThisMonday(now: Date = getNycNow()): Date {
  const dayIndex = parseInt(formatInTimeZone(now, NYC_TIMEZONE, 'i'), 10);
  const dayOfWeek = dayIndex % 7;
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = addDays(now, -daysFromMonday); // ✅ Timezone-safe
  const mondayStr = formatInTimeZone(monday, NYC_TIMEZONE, 'yyyy-MM-dd');
  return new Date(`${mondayStr}T12:00:00${getCurrentNycOffset()}`); // ✅ NYC timezone
}
```

---

### 4. **src/utils/date-utils.ts:65-68** - getThisFriday() Function ✅
**Issue**: Used `.setDate()` which operates in system timezone
**Fix**: Changed to use `addDays()` for timezone-safe arithmetic

---

### 5. **src/utils/date-utils.ts:74-77** - getWeekdays() Function ✅
**Issue**: Used `.setDate()` which operates in system timezone
**Fix**: Changed to use `addDays()` for timezone-safe arithmetic

---

### 6. **src/utils/date-utils.ts:110-112** - getNextWeekday() Function ✅
**Issue**: Used `checkDate.getDay()` which returns day in system timezone
**Fix**: Changed to use `getDayOfWeek(checkDate)` which now correctly uses NYC timezone

---

### 7. **src/calendar/ics-fetcher.ts:61** - Year Extraction ✅
**Issue**: Used `new Date().getFullYear()` which gets year in system timezone
**Impact**: On New Year's Eve in UTC (still Dec 31 in NYC), would fetch wrong year's calendar
**Fix**: Changed to use `formatNycDate(getNycNow(), 'yyyy')` to get year in NYC timezone

**Before**:
```typescript
const currentYear = new Date().getFullYear(); // ❌ System timezone
```

**After**:
```typescript
const { getNycNow, formatNycDate } = await import('../utils/date-utils');
const currentYear = parseInt(formatNycDate(getNycNow(), 'yyyy'), 10); // ✅ NYC timezone
```

---

### 8. **src/scraper/nyc-website.ts:52,59** - Scrape Timestamps ✅
**Issue**: Used `new Date()` for `scrapedAt` field
**Impact**: Low - only used for logging, but inconsistent with rest of codebase
**Fix**: Changed to use `getNycNow()` for consistency

---

### 9. **tests/unit/move-decision.test.ts:27** - Test Date Creation ✅
**Issue**: Used `new Date(2025, 9, 6 + i)` which creates dates in system timezone
**Impact**: Tests could fail in UTC environments
**Fix**: Changed to use explicit ISO strings with timezone offsets

**Before**:
```typescript
date: new Date(2025, 9, 6 + i), // ❌ System timezone
```

**After**:
```typescript
const baseDates = [
  new Date('2025-10-06T12:00:00-04:00'), // ✅ Explicit NYC timezone
  new Date('2025-10-07T12:00:00-04:00'),
  // ...
];
```

---

## Test Results

### All Tests Pass ✅
- **46 tests** across 14 files
- **0 failures**
- All timezone edge cases verified

### Verification Script Results
Created `scripts/verify-timezone-fixes.ts` to test timezone boundaries:
- ✅ getDayOfWeek() at midnight UTC (different day in NYC)
- ✅ getThisMonday() calculation
- ✅ getWeekdays() returns correct Mon-Fri
- ✅ Sunday detection at timezone boundary
- ✅ Week calculation on Sunday night

---

## Impact

### Before Fixes
- **Weekly summaries** wouldn't send on Sundays in NYC when running in UTC
- **Move reminders** could fire on wrong days near midnight
- **Emergency checks** could check wrong day's schedule
- **Week calculations** could be off by one day

### After Fixes
- ✅ All scheduled notifications fire at correct NYC times
- ✅ Day-of-week detection always matches NYC time
- ✅ Week calculations always use NYC calendar week
- ✅ System works correctly regardless of deployment environment timezone

---

## Files Modified
1. `src/main.ts` - Hour extraction
2. `src/utils/date-utils.ts` - Multiple functions
3. `src/calendar/ics-fetcher.ts` - Year extraction
4. `src/scraper/nyc-website.ts` - Timestamp consistency
5. `tests/unit/move-decision.test.ts` - Test date creation
6. `tests/unit/timezone-extraction.test.ts` - New test file
7. `tests/integration/e2e.test.ts` - Test date fix
8. `scripts/verify-timezone-fix.ts` - New verification script
9. `scripts/verify-timezone-fixes.ts` - Comprehensive verification script

---

## Key Lessons

### ❌ Never Use (for NYC-specific logic)
- `date.getHours()` - Returns system timezone hour
- `date.getDay()` - Returns system timezone day
- `date.getMonth()` / `date.getFullYear()` - Return system timezone values
- `date.setDate()` / `date.setHours()` - Operate in system timezone
- `new Date(year, month, day)` - Creates date in system timezone

### ✅ Always Use
- `formatInTimeZone(date, NYC_TIMEZONE, format)` - Extract NYC timezone values
- `getNycNow()` - Get current time in NYC
- `formatNycDate(date, format)` - Format dates in NYC timezone
- `addDays(date, n)` from date-fns - Timezone-safe arithmetic
- `new Date('YYYY-MM-DDTHH:mm:ss-04:00')` - Explicit timezone offsets

---

## Related Issues
- Original bug: Weekly summary not sending at 5 AM NYC time
- Root cause: `.getHours()` returning UTC hour instead of NYC hour
- This comprehensive audit found 8 additional timezone issues beyond the original bug

---

## Commit History
1. `fix: correct timezone hour extraction for scheduled notifications` - Fixed original `.getHours()` bug
2. `fix: comprehensive timezone handling across all date operations` - Fixed all remaining timezone issues (this commit)
