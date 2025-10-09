#!/usr/bin/env bun
/**
 * Simple debug without fetching ICS - use mock data
 */

import { formatNycDate } from '../src/utils/date-utils';

// Mock today as Thursday Oct 9, 2025
const today = new Date('2025-10-09T10:51:00-04:00');

console.log('Today:', formatNycDate(today, 'EEE MMM d yyyy HH:mm zzz'));
console.log('Day of week:', today.getDay()); // 0=Sun, 4=Thu
console.log('Hour:', today.getHours());

// Check what the NYC timezone conversion does
const { toZonedTime } = require('date-fns-tz');
const nycTime = toZonedTime(today, 'America/New_York');
console.log('\nNYC zoned time:', formatNycDate(nycTime, 'EEE MMM d yyyy HH:mm zzz'));
console.log('NYC hour:', nycTime.getHours());

// Check Friday
const friday = new Date('2025-10-10T10:00:00-04:00');
console.log('\nFriday:', formatNycDate(friday, 'EEE MMM d yyyy'));
console.log('Friday day of week:', friday.getDay()); // Should be 5

// Test config
const config = {
  nearSideDays: ['Mon', 'Thu'],
  farSideDays: ['Tue', 'Fri'],
};

console.log('\nConfig:');
console.log('Near side days:', config.nearSideDays);
console.log('Far side days:', config.farSideDays);

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
console.log('\nThursday has near side cleaning:', config.nearSideDays.includes(dayNames[4]));
console.log('Friday has far side cleaning:', config.farSideDays.includes(dayNames[5]));
