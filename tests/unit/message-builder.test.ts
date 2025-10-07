import { describe, it, expect } from 'vitest';
import { buildWeeklySummary, buildMoveReminder, buildEmergencyAlert } from '../../src/slack/message-builder';
import { Config, WeekView, MoveDecision } from '../../src/types';

describe('message-builder', () => {
  const mockConfig: Config = {
    slackWebhookUrl: 'test',
    nearSideDays: ['Mon', 'Thu'],
    farSideDays: ['Tue', 'Fri'],
    cleaningStartTime: '09:00',
    cleaningEndTime: '10:30',
    nearSideEmoji: '🏠',
    farSideEmoji: '🌳',
    weeklySummaryTime: '',
    dailyReminderTime: '',
    emergencyCheckTime: '',
  };

  it('should build weekly summary message', () => {
    const weekView: WeekView = {
      startDate: new Date('2025-10-06'),
      endDate: new Date('2025-10-10'),
      days: [
        {
          date: new Date('2025-10-06'),
          dayOfWeek: 'Mon',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far'
        },
        {
          date: new Date('2025-10-07'),
          dayOfWeek: 'Tue',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: false,
          parkOnSide: 'near'
        },
        {
          date: new Date('2025-10-08'),
          dayOfWeek: 'Wed',
          hasNearSideCleaning: false,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'near'
        },
        {
          date: new Date('2025-10-09'),
          dayOfWeek: 'Thu',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far'
        },
        {
          date: new Date('2025-10-10'),
          dayOfWeek: 'Fri',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: false,
          parkOnSide: 'near'
        },
      ],
    };

    const message = buildWeeklySummary(weekView, mockConfig);

    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].type).toBe('header');
    expect(message.blocks[0].text.text).toContain('Parking Strategy');
  });

  it('should build move reminder message', () => {
    const decision: MoveDecision = {
      shouldMove: true,
      currentSide: 'far',
      targetSide: 'near',
      nextMoveDate: new Date('2025-10-09'),
    };

    const message = buildMoveReminder(decision, mockConfig);

    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].text.text).toContain('Move Your Car');
    expect(message.blocks[1].text.text).toContain('far side');
    expect(message.blocks[1].text.text).toContain('near side');
  });

  it('should build emergency alert', () => {
    const message = buildEmergencyAlert('snow');

    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].text.text).toContain('Emergency');
    expect(message.blocks[1].text.text).toContain('snow');
  });
});
