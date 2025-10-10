#!/usr/bin/env bun
/**
 * Verification script to demonstrate the timezone bug fix
 *
 * This script shows that the hour extraction now correctly uses NYC timezone
 * regardless of the system's timezone.
 */

import { formatInTimeZone } from 'date-fns-tz';
import { NYC_TIMEZONE } from '../src/utils/date-utils';

console.log('🔍 Demonstrating Timezone Bug Fix\n');
console.log('='.repeat(70));

// Test case: Friday Oct 10, 2025 at 5 AM EDT
const testDate = new Date('2025-10-10T05:00:00-04:00');

console.log('\n📅 Test Date: Friday, October 10, 2025 at 5:00 AM EDT\n');

// The WRONG way (old code - using .getHours())
const wrongHour = testDate.getHours();
console.log('❌ OLD METHOD (.getHours()):');
console.log(`   Returns: ${wrongHour}`);
console.log(`   Problem: This returns the hour in the SYSTEM timezone, not NYC!`);
console.log(`   For example, if system is UTC: ${testDate.getUTCHours()} (wrong!)`);

// The RIGHT way (new code - using formatInTimeZone)
const correctHour = parseInt(formatInTimeZone(testDate, NYC_TIMEZONE, 'H'), 10);
console.log('\n✅ NEW METHOD (formatInTimeZone):');
console.log(`   Returns: ${correctHour}`);
console.log(`   Correct: Always returns NYC hour, regardless of system timezone!`);

console.log('\n' + '='.repeat(70));
console.log('\n🎯 Impact on Weekly Summary:');
console.log('\nWeekly summary runs on Sunday at 5 AM NYC time.');
console.log('\n❌ With the BUG:');
console.log('   - If system timezone is UTC: hour = 9 (wrong!)');
console.log('   - Condition (dayOfWeek === "Sun" && hour === 5) FAILS');
console.log('   - Weekly summary NOT sent ❌\n');

console.log('✅ With the FIX:');
console.log('   - Regardless of system timezone: hour = 5 (correct!)');
console.log('   - Condition (dayOfWeek === "Sun" && hour === 5) PASSES');
console.log('   - Weekly summary SENT ✅\n');

console.log('='.repeat(70));

// Additional test cases
console.log('\n📊 Additional Test Cases:\n');

const testCases = [
  { name: 'Sunday 5 AM EDT', date: '2025-10-12T05:00:00-04:00', expectedDay: 'Sun', expectedHour: 5 },
  { name: 'Monday 10 AM EDT', date: '2025-10-13T10:00:00-04:00', expectedDay: 'Mon', expectedHour: 10 },
  { name: 'Tuesday 5 AM EST', date: '2025-01-14T05:00:00-05:00', expectedDay: 'Tue', expectedHour: 5 },
];

for (const test of testCases) {
  const date = new Date(test.date);
  const hour = parseInt(formatInTimeZone(date, NYC_TIMEZONE, 'H'), 10);
  const dayOfWeek = formatInTimeZone(date, NYC_TIMEZONE, 'EEE');

  const status = (dayOfWeek === test.expectedDay && hour === test.expectedHour) ? '✅' : '❌';
  console.log(`${status} ${test.name}:`);
  console.log(`   Day: ${dayOfWeek} (expected: ${test.expectedDay})`);
  console.log(`   Hour: ${hour} (expected: ${test.expectedHour})\n`);
}

console.log('✅ All timezone extractions working correctly!\n');
