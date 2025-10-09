#!/usr/bin/env bun
/**
 * Helper script to set the cron schedule for the NYC ASP Val
 *
 * This script uses the Val Town REST API to programmatically set the cron
 * schedule to "10 * * * *" (every hour at 10 minutes past the hour).
 *
 * Usage:
 *   bun scripts/set-val-schedule.ts
 *   # or
 *   bun run set-schedule
 *
 * Requirements:
 *   - VAL_TOWN_API_TOKEN environment variable (add to .env)
 *   - Token needs "Vals: read and write" permissions
 *
 * To create an API token:
 *   1. Go to https://www.val.town/settings/api
 *   2. Click "Create API Token"
 *   3. Give it "Vals: read and write" permissions
 *   4. Add to .env: VAL_TOWN_API_TOKEN=your_token_here
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const STATE_FILE = join(ROOT_DIR, 'nyc-asp-val', '.vt', 'state.json');

// Cron schedule: every hour at 10 minutes past the hour
const CRON_SCHEDULE = '10 * * * *';

interface ValState {
  val: {
    id: string;
  };
  branch: {
    id: string;
    version: number;
  };
}

async function setValSchedule() {
  console.log('🕐 Setting Val Town cron schedule...\n');

  // Check for API token
  const apiToken = process.env.VAL_TOWN_API_TOKEN;
  if (!apiToken) {
    console.error('❌ Error: VAL_TOWN_API_TOKEN environment variable not set\n');
    console.error('To create an API token:');
    console.error('1. Go to https://www.val.town/settings/api');
    console.error('2. Click "Create API Token"');
    console.error('3. Give it "Vals: read and write" permissions');
    console.error('4. Add to .env: VAL_TOWN_API_TOKEN=your_token_here\n');
    process.exit(1);
  }

  // Read val ID from state file
  let valState: ValState;
  try {
    const stateContent = await readFile(STATE_FILE, 'utf-8');
    valState = JSON.parse(stateContent);
  } catch (error) {
    console.error('❌ Error: Could not read val state file');
    console.error(`   Expected at: ${STATE_FILE}`);
    console.error('\nMake sure you have deployed to Val Town first:\n');
    console.error('   bun run deploy\n');
    process.exit(1);
  }

  const valId = valState.val.id;
  console.log(`Val ID: ${valId}`);
  console.log(`Setting schedule: ${CRON_SCHEDULE} (every hour at :10)\n`);

  // Update val schedule via API
  // Note: This uses the Val Town REST API. The exact endpoint structure
  // is documented at https://docs.val.town/openapi
  try {
    const response = await fetch(`https://api.val.town/v1/vals/${valId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduled: {
          cron: CRON_SCHEDULE,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}\n`);

      if (response.status === 401) {
        console.error('Authentication failed. Please check your API token:');
        console.error('1. Verify VAL_TOWN_API_TOKEN is correct');
        console.error('2. Ensure token has "Vals: read and write" permissions');
        console.error('3. Check token hasn\'t expired\n');
      } else if (response.status === 404) {
        console.error('Val not found. This could mean:');
        console.error('1. The val hasn\'t been deployed yet');
        console.error('2. The val ID in .vt/state.json is incorrect\n');
      } else {
        console.error('Note: The API endpoint structure may have changed.');
        console.error('Please verify the correct endpoint at:');
        console.error('https://docs.val.town/openapi\n');
        console.error('You can also set the schedule manually in the Val Town UI:');
        console.error(`https://www.val.town/v/${valId}\n`);
      }

      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Schedule updated successfully!\n');
    console.log(`View your val: https://www.val.town/v/${valId}`);
    console.log('\nVerify the schedule is set correctly in the Val Town UI.');
  } catch (error) {
    console.error('❌ Error updating schedule:', error);
    console.error('\nFalling back to manual instructions:');
    console.error(`1. Go to https://www.val.town/v/${valId}`);
    console.error('2. Click the cron schedule selector in the top right');
    console.error(`3. Set to: ${CRON_SCHEDULE} (every hour at :10)\n`);
    process.exit(1);
  }
}

// Run the script
setValSchedule().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
