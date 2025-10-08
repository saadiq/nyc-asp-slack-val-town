#!/usr/bin/env bun
/**
 * Test script for the new 5 AM and 10 AM messaging logic
 * Simulates different days and scenarios to verify correct behavior
 */

import main from '../val-town';

// Mock dates for testing
const testDates = [
  { name: 'Monday Oct 6 at 5 AM', date: new Date('2025-10-06T05:00:00-04:00') },
  { name: 'Monday Oct 6 at 10 AM', date: new Date('2025-10-06T10:00:00-04:00') },
  { name: 'Tuesday Oct 7 at 5 AM (suspended)', date: new Date('2025-10-07T05:00:00-04:00') },
  { name: 'Tuesday Oct 7 at 10 AM (suspended)', date: new Date('2025-10-07T10:00:00-04:00') },
  { name: 'Wednesday Oct 8 at 5 AM (suspended)', date: new Date('2025-10-08T05:00:00-04:00') },
  { name: 'Wednesday Oct 8 at 10 AM (suspended)', date: new Date('2025-10-08T10:00:00-04:00') },
  { name: 'Thursday Oct 9 at 5 AM', date: new Date('2025-10-09T05:00:00-04:00') },
  { name: 'Thursday Oct 9 at 10 AM', date: new Date('2025-10-09T10:00:00-04:00') },
  { name: 'Friday Oct 10 at 5 AM', date: new Date('2025-10-10T05:00:00-04:00') },
  { name: 'Friday Oct 10 at 10 AM', date: new Date('2025-10-10T10:00:00-04:00') },
  { name: 'Saturday Oct 11 at 5 AM', date: new Date('2025-10-11T05:00:00-04:00') },
  { name: 'Saturday Oct 11 at 10 AM', date: new Date('2025-10-11T10:00:00-04:00') },
  { name: 'Sunday Oct 12 at 5 AM', date: new Date('2025-10-12T05:00:00-04:00') },
  { name: 'Sunday Oct 12 at 10 AM', date: new Date('2025-10-12T10:00:00-04:00') },
];

async function runTests() {
  console.log('🧪 Testing new messaging logic for Oct 6-12, 2025\n');
  console.log('Config: Near side cleaning Mon/Thu, Far side cleaning Tue/Fri');
  console.log('Note: Tue Oct 7 & Wed Oct 8 are suspended (Sukkot)\n');
  console.log('='.repeat(80));

  for (const testCase of testDates) {
    console.log(`\n📅 ${testCase.name}`);
    console.log('-'.repeat(80));

    // Mock the current time
    const originalDate = Date;
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(testCase.date.getTime());
        } else {
          super(...args);
        }
      }
      static now() {
        return testCase.date.getTime();
      }
    } as any;

    try {
      await main();
    } catch (error) {
      console.error('Error:', error);
    }

    // Restore original Date
    global.Date = originalDate;

    console.log('='.repeat(80));
  }

  console.log('\n✅ All tests completed!\n');
}

runTests().catch(console.error);
