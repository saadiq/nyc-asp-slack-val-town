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
