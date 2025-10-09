#!/usr/bin/env bun
/**
 * Debug script for Oct 9 Thursday issue
 */

import { loadConfig } from '../src/config';
import { buildWeekView, optimizeParkingSides } from '../src/parking-logic/week-analyzer';
import { shouldSendMoveReminder } from '../src/parking-logic/move-decision';
import { getNycNow, formatNycDate, getDayOfWeek } from '../src/utils/date-utils';

async function debug() {
  console.log('=== Debugging Oct 9 Thursday ===\n');

  const config = loadConfig();
  const now = getNycNow();

  console.log(`Current time: ${formatNycDate(now, 'yyyy-MM-dd HH:mm')} (${getDayOfWeek(now)})`);
  console.log(`Near side days: ${config.nearSideDays.join(', ')}`);
  console.log(`Far side days: ${config.farSideDays.join(', ')}`);
  console.log('');

  const rawWeekView = await buildWeekView(config);
  const weekView = optimizeParkingSides(rawWeekView);

  console.log('=== Week View ===');
  for (const day of weekView.days) {
    console.log(
      `${day.dayOfWeek} ${formatNycDate(day.date, 'MMM d')}: ` +
      `parkOn=${day.parkOnSide}, ` +
      `nearCleaning=${day.hasNearSideCleaning}, ` +
      `farCleaning=${day.hasFarSideCleaning}, ` +
      `suspended=${day.isSuspended}` +
      (day.suspensionReason ? ` (${day.suspensionReason})` : '')
    );
  }
  console.log('');

  const decision = shouldSendMoveReminder(weekView, config);

  console.log('=== Move Decision ===');
  console.log(`Should move: ${decision.shouldMove}`);
  if (decision.shouldMove) {
    console.log(`Current side: ${decision.currentSide}`);
    console.log(`Target side: ${decision.targetSide}`);
    console.log(`Next move date: ${decision.nextMoveDate ? formatNycDate(decision.nextMoveDate, 'EEE MMM d') : 'N/A'}`);
  }
}

debug().catch(console.error);
