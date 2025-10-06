import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWeekView, optimizeParkingSides } from '../../src/parking-logic/week-analyzer';
import { Config, DayStatus, WeekView } from '../../src/types';
import * as suspensionChecker from '../../src/parking-logic/suspension-checker';
import * as dateUtils from '../../src/utils/date-utils';

describe('week-analyzer', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should build week view with correct cleaning days', async () => {
    // Mock getWeekdays to return Mon-Fri of Oct 6-10, 2025
    const mockWeekdays = [
      new Date('2025-10-06T12:00:00'), // Mon
      new Date('2025-10-07T12:00:00'), // Tue
      new Date('2025-10-08T12:00:00'), // Wed
      new Date('2025-10-09T12:00:00'), // Thu
      new Date('2025-10-10T12:00:00'), // Fri
    ];

    vi.spyOn(dateUtils, 'getWeekdays').mockReturnValue(mockWeekdays);
    vi.spyOn(dateUtils, 'getThisMonday').mockReturnValue(mockWeekdays[0]);
    vi.spyOn(dateUtils, 'getThisFriday').mockReturnValue(mockWeekdays[4]);

    // Mock getDayOfWeek to return correct day names
    vi.spyOn(dateUtils, 'getDayOfWeek').mockImplementation((date) => {
      const dayIndex = mockWeekdays.findIndex(d => d.getTime() === date.getTime());
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIndex] as any;
    });

    // Mock suspension checker to return no suspensions
    vi.spyOn(suspensionChecker, 'isSuspended').mockResolvedValue({
      suspended: false
    });

    const weekView = await buildWeekView(mockConfig);

    expect(weekView.days).toHaveLength(5);

    // Monday should have near side cleaning, park on far side
    const monday = weekView.days.find(d => d.dayOfWeek === 'Mon');
    expect(monday?.hasNearSideCleaning).toBe(true);
    expect(monday?.hasFarSideCleaning).toBe(false);
    expect(monday?.parkOnSide).toBe('far');

    // Tuesday should have far side cleaning, park on near side
    const tuesday = weekView.days.find(d => d.dayOfWeek === 'Tue');
    expect(tuesday?.hasFarSideCleaning).toBe(true);
    expect(tuesday?.hasNearSideCleaning).toBe(false);
    expect(tuesday?.parkOnSide).toBe('near');

    // Wednesday has no cleaning
    const wednesday = weekView.days.find(d => d.dayOfWeek === 'Wed');
    expect(wednesday?.hasNearSideCleaning).toBe(false);
    expect(wednesday?.hasFarSideCleaning).toBe(false);
    expect(wednesday?.parkOnSide).toBeNull();

    // Thursday should have near side cleaning, park on far side
    const thursday = weekView.days.find(d => d.dayOfWeek === 'Thu');
    expect(thursday?.hasNearSideCleaning).toBe(true);
    expect(thursday?.parkOnSide).toBe('far');

    // Friday should have far side cleaning, park on near side
    const friday = weekView.days.find(d => d.dayOfWeek === 'Fri');
    expect(friday?.hasFarSideCleaning).toBe(true);
    expect(friday?.parkOnSide).toBe('near');
  });

  it('should handle suspended days correctly', async () => {
    const mockWeekdays = [
      new Date('2025-10-06T12:00:00'), // Mon
      new Date('2025-10-07T12:00:00'), // Tue
      new Date('2025-10-08T12:00:00'), // Wed
      new Date('2025-10-09T12:00:00'), // Thu
      new Date('2025-10-10T12:00:00'), // Fri
    ];

    vi.spyOn(dateUtils, 'getWeekdays').mockReturnValue(mockWeekdays);
    vi.spyOn(dateUtils, 'getThisMonday').mockReturnValue(mockWeekdays[0]);
    vi.spyOn(dateUtils, 'getThisFriday').mockReturnValue(mockWeekdays[4]);
    vi.spyOn(dateUtils, 'getDayOfWeek').mockImplementation((date) => {
      const dayIndex = mockWeekdays.findIndex(d => d.getTime() === date.getTime());
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIndex] as any;
    });

    // Mock Tuesday as suspended
    vi.spyOn(suspensionChecker, 'isSuspended').mockImplementation(async (date) => {
      const isTuesday = date.getTime() === mockWeekdays[1].getTime();
      return { suspended: isTuesday, reason: isTuesday ? 'holiday' : undefined };
    });

    const weekView = await buildWeekView(mockConfig);

    const tuesday = weekView.days.find(d => d.dayOfWeek === 'Tue');
    expect(tuesday?.isSuspended).toBe(true);
    expect(tuesday?.suspensionReason).toBe('holiday');
    expect(tuesday?.parkOnSide).toBeNull(); // Will be filled in by optimizeParkingSides
  });

  it('should optimize parking sides for suspended days', () => {
    // Create a mock week view with Tuesday suspended
    const mockWeekView: WeekView = {
      startDate: new Date('2025-10-06'),
      endDate: new Date('2025-10-10'),
      days: [
        {
          date: new Date('2025-10-06'),
          dayOfWeek: 'Mon',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far',
        },
        {
          date: new Date('2025-10-07'),
          dayOfWeek: 'Tue',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: true,
          suspensionReason: 'holiday',
          parkOnSide: null,
        },
        {
          date: new Date('2025-10-08'),
          dayOfWeek: 'Wed',
          hasNearSideCleaning: false,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: null,
        },
        {
          date: new Date('2025-10-09'),
          dayOfWeek: 'Thu',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far',
        },
        {
          date: new Date('2025-10-10'),
          dayOfWeek: 'Fri',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: false,
          parkOnSide: 'near',
        },
      ],
    };

    const optimized = optimizeParkingSides(mockWeekView);

    // Tuesday (suspended) should park on far side (for Thursday)
    const tuesday = optimized.days.find(d => d.dayOfWeek === 'Tue');
    expect(tuesday?.parkOnSide).toBe('far');

    // Wednesday (no cleaning) should park on far side (for Thursday)
    const wednesday = optimized.days.find(d => d.dayOfWeek === 'Wed');
    expect(wednesday?.parkOnSide).toBe('far');
  });

  it('should handle week with no cleaning left', () => {
    // Create a mock week view where Friday is a no-cleaning day
    const mockWeekView: WeekView = {
      startDate: new Date('2025-10-06'),
      endDate: new Date('2025-10-10'),
      days: [
        {
          date: new Date('2025-10-06'),
          dayOfWeek: 'Mon',
          hasNearSideCleaning: true,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: 'far',
        },
        {
          date: new Date('2025-10-07'),
          dayOfWeek: 'Tue',
          hasNearSideCleaning: false,
          hasFarSideCleaning: true,
          isSuspended: false,
          parkOnSide: 'near',
        },
        {
          date: new Date('2025-10-08'),
          dayOfWeek: 'Wed',
          hasNearSideCleaning: false,
          hasFarSideCleaning: false,
          isSuspended: false,
          parkOnSide: null,
        },
        {
          date: new Date('2025-10-09'),
          dayOfWeek: 'Thu',
          hasNearSideCleaning: false,
          hasFarSideCleaning: false,
          isSuspended: true,
          parkOnSide: null,
        },
        {
          date: new Date('2025-10-10'),
          dayOfWeek: 'Fri',
          hasNearSideCleaning: false,
          hasFarSideCleaning: false,
          isSuspended: true,
          parkOnSide: null,
        },
      ],
    };

    const optimized = optimizeParkingSides(mockWeekView);

    // Wednesday should stay on near side (from Tuesday)
    const wednesday = optimized.days.find(d => d.dayOfWeek === 'Wed');
    expect(wednesday?.parkOnSide).toBe('near');

    // Thursday should stay on near side (no more cleaning)
    const thursday = optimized.days.find(d => d.dayOfWeek === 'Thu');
    expect(thursday?.parkOnSide).toBe('near');

    // Friday should stay on near side (no more cleaning)
    const friday = optimized.days.find(d => d.dayOfWeek === 'Fri');
    expect(friday?.parkOnSide).toBe('near');
  });
});
