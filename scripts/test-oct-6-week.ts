#!/usr/bin/env bun
/**
 * Test the specific week of Oct 6-12, 2025
 * Where Tue Oct 7 and Wed Oct 8 are suspended (Sukkot)
 */

// We need to import and test the val-town logic
// Since val-town.ts uses process.env, let's set that up first
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
process.env.NEAR_SIDE_DAYS = 'Mon,Thu';
process.env.FAR_SIDE_DAYS = 'Tue,Fri';
process.env.CLEANING_START_TIME = '09:00';
process.env.CLEANING_END_TIME = '10:30';
process.env.NEAR_SIDE_EMOJI = '🏡';
process.env.FAR_SIDE_EMOJI = '🌳';

// Mock the Slack webhook to just log instead of sending
const originalFetch = global.fetch;
global.fetch = async (url: any, options?: any) => {
  if (typeof url === 'string' && url.includes('hooks.slack.com')) {
    const body = JSON.parse(options?.body || '{}');
    console.log('\n📨 Slack Message:');
    console.log(body.blocks[0].text.text);
    return new Response('ok', { status: 200 });
  }
  // For ICS and website fetches, use real fetch
  return originalFetch(url, options);
} as any;

import main from '../val-town';

const testCases = [
  {
    name: '🌅 Monday Oct 6 at 5 AM',
    date: new Date('2025-10-06T09:00:00Z'), // 5 AM EDT = 9 AM UTC
    expected: 'Should show: stay on far side for Thursday'
  },
  {
    name: '⏰ Monday Oct 6 at 10 AM',
    date: new Date('2025-10-06T14:00:00Z'), // 10 AM EDT = 2 PM UTC
    expected: 'Should show: stay put, already on correct side for Thursday'
  },
  {
    name: '🌅 Tuesday Oct 7 at 5 AM (SUSPENDED)',
    date: new Date('2025-10-07T09:00:00Z'),
    expected: 'Should show: suspended, no move needed'
  },
  {
    name: '⏰ Tuesday Oct 7 at 10 AM (SUSPENDED)',
    date: new Date('2025-10-07T14:00:00Z'),
    expected: 'Should show: stay put, next cleaning Thursday'
  },
  {
    name: '🌅 Wednesday Oct 8 at 5 AM (SUSPENDED)',
    date: new Date('2025-10-08T09:00:00Z'),
    expected: 'Should show: suspended, no move needed'
  },
  {
    name: '⏰ Wednesday Oct 8 at 10 AM (SUSPENDED)',
    date: new Date('2025-10-08T14:00:00Z'),
    expected: 'Should show: stay put, next cleaning Thursday'
  },
  {
    name: '🌅 Thursday Oct 9 at 5 AM',
    date: new Date('2025-10-09T09:00:00Z'),
    expected: 'Should show: move to near side after cleaning for Friday'
  },
  {
    name: '⏰ Thursday Oct 9 at 10 AM',
    date: new Date('2025-10-09T14:00:00Z'),
    expected: 'Should show: MOVE NOW to near side for Friday'
  },
];

async function runTest() {
  console.log('🧪 Testing Oct 6-12, 2025 (Tue & Wed suspended)\n');
  console.log('Config: Near side Mon/Thu, Far side Tue/Fri');
  console.log('Expected behavior: Stay on FAR side Mon-Thu, move to NEAR on Thu after cleaning\n');
  console.log('='.repeat(80));

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`Expected: ${testCase.expected}`);
    console.log('-'.repeat(80));

    // Mock Date to return our test date
    const RealDate = Date;
    (global as any).Date = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          return testCase.date;
        }
        return new RealDate(...args);
      }
      static now() {
        return testCase.date.getTime();
      }
    };

    try {
      await main();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }

    // Restore real Date
    global.Date = RealDate;

    console.log('='.repeat(80));
  }

  console.log('\n✅ Test completed!\n');
  process.exit(0);
}

runTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
