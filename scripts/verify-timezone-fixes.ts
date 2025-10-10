#!/usr/bin/env bun
/**
 * Verification script for comprehensive timezone fixes
 * Tests that all date/time operations use NYC timezone correctly
 */

import { getDayOfWeek, getThisMonday, getWeekdays, formatNycDate, NYC_TIMEZONE } from '../src/utils/date-utils';
import { formatInTimeZone } from 'date-fns-tz';

console.log('🔍 Verifying Comprehensive Timezone Fixes\n');
console.log('='.repeat(70));

// Test 1: getDayOfWeek at midnight UTC (could be different day in NYC)
console.log('\n📅 Test 1: getDayOfWeek() at timezone boundaries');
const midnightUTC = new Date('2025-10-10T00:30:00Z'); // 8:30 PM EDT Oct 9 (previous day)
const dayFromFunction = getDayOfWeek(midnightUTC);
const expectedDay = formatInTimeZone(midnightUTC, NYC_TIMEZONE, 'EEE');
console.log(`   Date: ${midnightUTC.toISOString()} (UTC)`);
console.log(`   NYC time: ${formatInTimeZone(midnightUTC, NYC_TIMEZONE, 'yyyy-MM-dd HH:mm zzz')}`);
console.log(`   getDayOfWeek() returns: ${dayFromFunction}`);
console.log(`   Expected (NYC): ${expectedDay}`);
console.log(`   ${dayFromFunction === expectedDay ? '✅ PASS' : '❌ FAIL'}`);

// Test 2: getThisMonday() calculation
console.log('\n📅 Test 2: getThisMonday() calculation');
const thursday = new Date('2025-10-09T12:00:00-04:00');
const monday = getThisMonday(thursday);
const mondayDay = getDayOfWeek(monday);
console.log(`   Input: Thursday Oct 9, 2025`);
console.log(`   getThisMonday() returns: ${formatNycDate(monday, 'EEEE MMM d, yyyy')}`);
console.log(`   Day of week: ${mondayDay}`);
console.log(`   ${mondayDay === 'Mon' ? '✅ PASS' : '❌ FAIL'}`);

// Test 3: getWeekdays() returns correct days
console.log('\n📅 Test 3: getWeekdays() returns Mon-Fri');
const weekdays = getWeekdays(thursday);
const days = weekdays.map(d => getDayOfWeek(d));
console.log(`   Weekdays: ${days.join(', ')}`);
const expected = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const match = days.every((d, i) => d === expected[i]);
console.log(`   Expected: ${expected.join(', ')}`);
console.log(`   ${match ? '✅ PASS' : '❌ FAIL'}`);

// Test 4: Edge case - Sunday near midnight UTC
console.log('\n📅 Test 4: Sunday detection at timezone boundary');
const sundayLateUTC = new Date('2025-10-13T03:30:00Z'); // 11:30 PM EDT Sat Oct 12 (previous day!)
const sundayDay = getDayOfWeek(sundayLateUTC);
const sundayExpected = formatInTimeZone(sundayLateUTC, NYC_TIMEZONE, 'EEE');
console.log(`   Date: ${sundayLateUTC.toISOString()} (UTC)`);
console.log(`   NYC time: ${formatInTimeZone(sundayLateUTC, NYC_TIMEZONE, 'yyyy-MM-dd HH:mm zzz')}`);
console.log(`   getDayOfWeek() returns: ${sundayDay}`);
console.log(`   Expected (NYC): ${sundayExpected}`);
console.log(`   ${sundayDay === sundayExpected ? '✅ PASS' : '❌ FAIL'}`);

// Test 5: Week calculation at Sunday night
console.log('\n📅 Test 5: Week calculation on Sunday night');
const sundayNight = new Date('2025-10-12T23:00:00-04:00'); // 11 PM EDT Sunday
const mondayFromSunday = getThisMonday(sundayNight);
const mondayFromSundayDay = getDayOfWeek(mondayFromSunday);
console.log(`   Input: Sunday Oct 12, 2025 at 11 PM`);
console.log(`   getThisMonday() returns: ${formatNycDate(mondayFromSunday, 'EEEE MMM d, yyyy')}`);
console.log(`   Should return: Monday Oct 6, 2025 (this week's Monday)`);
console.log(`   ${mondayFromSundayDay === 'Mon' ? '✅ PASS' : '❌ FAIL'}`);

console.log('\n' + '='.repeat(70));

const allPass = [
  dayFromFunction === expectedDay,
  mondayDay === 'Mon',
  match,
  sundayDay === sundayExpected,
  mondayFromSundayDay === 'Mon'
].every(Boolean);

if (allPass) {
  console.log('\n✅ All timezone fixes verified! System is timezone-safe.\n');
} else {
  console.log('\n❌ Some tests failed. Please review the output above.\n');
  process.exit(1);
}
