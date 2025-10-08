#!/usr/bin/env bun
/**
 * Simple verification of the parking logic for Oct 6-12, 2025
 */

type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type ParkingSide = 'near' | 'far';

interface DayInfo {
  date: Date;
  dayOfWeek: DayOfWeek;
  side: ParkingSide | null;
  suspended: boolean;
  suspensionReason?: string;
}

interface WeekView {
  days: DayInfo[];
}

// Simplified logic from val-town.ts
function inferCurrentLocation(weekView: WeekView, today: DayInfo): ParkingSide {
  const todayIndex = weekView.days.indexOf(today);

  for (let i = todayIndex; i >= 0; i--) {
    if (weekView.days[i].side) {
      return weekView.days[i].side;
    }
  }

  return 'far';
}

function findNextCleaningDay(weekView: WeekView, fromDay: DayInfo): DayInfo | null {
  const fromIndex = weekView.days.indexOf(fromDay);

  for (let i = fromIndex + 1; i < weekView.days.length; i++) {
    const day = weekView.days[i];
    if (!day.suspended && day.side) {
      return day;
    }
  }

  return null;
}

// Build the test week
const weekView: WeekView = {
  days: [
    {
      date: new Date('2025-10-06'),
      dayOfWeek: 'Mon',
      side: 'far', // Near-side cleaning, park on far
      suspended: false,
    },
    {
      date: new Date('2025-10-07'),
      dayOfWeek: 'Tue',
      side: null, // SUSPENDED - no parking requirement
      suspended: true,
      suspensionReason: 'holiday',
    },
    {
      date: new Date('2025-10-08'),
      dayOfWeek: 'Wed',
      side: null, // SUSPENDED - no parking requirement
      suspended: true,
      suspensionReason: 'holiday',
    },
    {
      date: new Date('2025-10-09'),
      dayOfWeek: 'Thu',
      side: 'far', // Near-side cleaning, park on far
      suspended: false,
    },
    {
      date: new Date('2025-10-10'),
      dayOfWeek: 'Fri',
      side: 'near', // Far-side cleaning, park on near
      suspended: false,
    },
  ],
};

console.log('🧪 Testing Oct 6-12, 2025 Parking Logic\n');
console.log('Week Setup:');
console.log('Mon: far (near-side cleaning)');
console.log('Tue: SUSPENDED (null)');
console.log('Wed: SUSPENDED (null)');
console.log('Thu: far (near-side cleaning)');
console.log('Fri: near (far-side cleaning)');
console.log('\n' + '='.repeat(80) + '\n');

// Test each day
for (const today of weekView.days) {
  console.log(`📅 ${today.dayOfWeek} ${today.date.toLocaleDateString()}`);

  const currentLocation = inferCurrentLocation(weekView, today);
  const nextCleaning = findNextCleaningDay(weekView, today);

  console.log(`   Current location: ${currentLocation} side`);

  if (today.suspended) {
    console.log(`   ⚠️  Today is SUSPENDED (${today.suspensionReason})`);
  } else if (today.side) {
    console.log(`   🧹 Today has cleaning, park on: ${today.side} side`);
  } else {
    console.log(`   ✅ No cleaning today`);
  }

  if (nextCleaning) {
    console.log(`   ➡️  Next cleaning: ${nextCleaning.dayOfWeek} (park on ${nextCleaning.side} side)`);

    if (currentLocation !== nextCleaning.side) {
      console.log(`   🚨 NEED TO MOVE: from ${currentLocation} → ${nextCleaning.side}`);
    } else {
      console.log(`   ✅ STAY PUT: already on correct side`);
    }
  } else {
    console.log(`   ✅ No more cleaning this week`);
  }

  console.log('');
}

console.log('='.repeat(80));
console.log('\n✅ Key Verification:\n');

const monday = weekView.days[0];
const mondayCurrent = inferCurrentLocation(weekView, monday);
const mondayNext = findNextCleaningDay(weekView, monday);

console.log('Monday Logic Check:');
console.log(`  Current: ${mondayCurrent} side`);
console.log(`  Next cleaning: ${mondayNext?.dayOfWeek} (requires ${mondayNext?.side} side)`);

if (mondayNext?.side === 'near') {
  console.log('  ❌ INCORRECT: Should skip Tue/Wed and find Thursday (far side)');
} else if (mondayNext?.side === 'far') {
  console.log('  ✅ CORRECT: Found Thursday, already on far side, no move needed!');
} else {
  console.log('  ❌ ERROR: No next cleaning found');
}
