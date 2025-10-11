// src/slack/message-builder.ts
import { Config, WeekView, MoveDecision, Side } from '../types';
import { formatNycDate, getDayOfWeek } from '../utils/date-utils';

/**
 * Build weekly strategy message (Sunday 5 AM)
 */
export function buildWeeklySummary(
  weekView: WeekView,
  config: Config
): any {
  const weekStart = formatNycDate(weekView.startDate, 'MMM d');
  const weekEnd = formatNycDate(weekView.endDate, 'MMM d');

  // Build emoji calendar with proper spacing for alignment
  // Emojis take ~2 char widths visually, so adjust spacing accordingly
  const icons = weekView.days.map((day, index) => {
    const icon = day.parkOnSide === 'near'
      ? config.nearSideEmoji
      : config.farSideEmoji;

    // Add padding after each icon except the last (emoji ~2 chars + 7 spaces = 9 to match "Mon    ")
    return index < weekView.days.length - 1
      ? icon + '       ' // 7 spaces
      : icon;
  }).join('');

  const calendarRow = '  ' + icons; // 2 spaces to center under day headers
  const dayHeaders = 'Mon    Tue    Wed    Thu    Fri';

  // Generate strategy text
  const strategyText = generateStrategyText(weekView, config);

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚗 Parking Strategy for ${weekStart} - ${weekEnd}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`${dayHeaders}\`\n${calendarRow}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: strategyText,
        },
      },
      {
        type: 'divider',
      },
      ...buildDayBreakdown(weekView, config),
    ],
  };
}

/**
 * Generate strategy summary text
 */
function generateStrategyText(weekView: WeekView, config: Config): string {
  const suspendedDays = weekView.days.filter(d => d.isSuspended);
  const cleaningDays = weekView.days.filter(d =>
    !d.isSuspended && (d.hasNearSideCleaning || d.hasFarSideCleaning)
  );

  if (suspendedDays.length === 0) {
    return `*Normal week* - Standard shuffle pattern. Start on ${config.farSideEmoji} far side Sunday night.`;
  }

  const suspendedDayNames = suspendedDays.map(d => d.dayOfWeek).join(', ');

  if (cleaningDays.length <= 2) {
    return `*Easy week!* ASP suspended on ${suspendedDayNames}. Only ${cleaningDays.length} cleaning days this week.`;
  }

  return `ASP suspended on ${suspendedDayNames}. Adjust your shuffle pattern accordingly.`;
}

/**
 * Build day-by-day breakdown
 */
function buildDayBreakdown(weekView: WeekView, config: Config): any[] {
  const blocks: any[] = [];

  for (const day of weekView.days) {
    const sideEmoji = day.parkOnSide === 'near'
      ? config.nearSideEmoji
      : config.farSideEmoji;

    const sideName = day.parkOnSide === 'near' ? 'near' : 'far';

    let description = '';
    if (day.isSuspended) {
      description = `${day.suspensionReason || 'ASP suspended'}`;
    } else if (day.hasNearSideCleaning) {
      description = 'near side has cleaning';
    } else if (day.hasFarSideCleaning) {
      description = 'far side has cleaning';
    } else {
      description = 'no cleaning today';
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${sideEmoji} *${day.dayOfWeek}*: Park on ${sideName} side - _${description}_`,
      },
    });
  }

  return blocks;
}

/**
 * Build daily move reminder (10 AM)
 */
export function buildMoveReminder(
  decision: MoveDecision,
  config: Config
): any {
  const fromEmoji = decision.currentSide === 'near'
    ? config.nearSideEmoji
    : config.farSideEmoji;

  const toEmoji = decision.targetSide === 'near'
    ? config.nearSideEmoji
    : config.farSideEmoji;

  const fromSide = decision.currentSide === 'near' ? 'near' : 'far';
  const toSide = decision.targetSide === 'near' ? 'near' : 'far';

  const nextMoveDow = decision.nextMoveDate
    ? getDayOfWeek(decision.nextMoveDate)
    : 'next week';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚗 Move Your Car Now!',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `From ${fromEmoji} *${fromSide} side* → ${toEmoji} *${toSide} side*`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Next move: *${nextMoveDow}*`,
          },
        ],
      },
    ],
  };
}

/**
 * Build emergency suspension alert (12:30 PM)
 */
export function buildEmergencyAlert(reason?: string): any {
  const reasonText = reason
    ? `Street cleaning suspended today due to *${reason}*.`
    : 'Street cleaning suspended today.';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Emergency ASP Suspension',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: reasonText,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your car is safe wherever it\'s parked. ✅',
        },
      },
    ],
  };
}

/**
 * Build error notification
 */
export function buildErrorNotification(errorMessage: string): any {
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔴 NYC ASP Bot Error',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${errorMessage}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Check Val Town logs for details. Verify street cleaning manually today.',
          },
        ],
      },
    ],
  };
}
