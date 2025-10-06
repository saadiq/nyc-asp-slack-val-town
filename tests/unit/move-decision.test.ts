import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldSendMoveReminder } from '../../src/parking-logic/move-decision';
import { Config, WeekView, DayStatus } from '../../src/types';
import * as dateUtils from '../../src/utils/date-utils';

describe('move-decision', () => {
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

  function createMockWeekView(days: Partial<DayStatus>[]): WeekView {
    const fullDays: DayStatus[] = days.map((d, i) => ({
      date: new Date(2025, 9, 6 + i), // Oct 6-10, 2025 (Mon-Fri)
      dayOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i] as any,
      hasNearSideCleaning: false,
      hasFarSideCleaning: false,
      isSuspended: false,
      parkOnSide: null,
      ...d,
    }));

    return {
      startDate: fullDays[0].date,
      endDate: fullDays[4].date,
      days: fullDays,
    };
  }

  it('should send move reminder when sides differ', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon (today)
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Tue
      { parkOnSide: 'near' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Mock today as Monday
    const monday = weekView.days[0].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(monday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    const decision = shouldSendMoveReminder(weekView, mockConfig);

    // Monday->Tuesday requires move from far->near
    expect(decision.shouldMove).toBe(true);
    expect(decision.currentSide).toBe('far');
    expect(decision.targetSide).toBe('near');
    expect(decision.nextMoveDate).toEqual(weekView.days[1].date);
  });

  it('should not send reminder on Friday', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' },
      { hasFarSideCleaning: true, parkOnSide: 'near' },
      { parkOnSide: 'near' },
      { hasNearSideCleaning: true, parkOnSide: 'far' },
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri (today)
    ]);

    // Mock today as Friday
    const friday = weekView.days[4].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(friday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    const decision = shouldSendMoveReminder(weekView, mockConfig);

    // Should not move on Friday
    expect(decision.shouldMove).toBe(false);
  });

  it('should not send reminder when already on correct side', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon (today)
      { isSuspended: true, parkOnSide: 'far' }, // Tue suspended
      { parkOnSide: 'far' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Mock today as Monday
    const monday = weekView.days[0].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(monday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    // Today is Monday, car on far side
    // Next cleaning is Thursday, also needs far side
    // No move needed
    const decision = shouldSendMoveReminder(weekView, mockConfig);
    expect(decision.shouldMove).toBe(false);
  });

  it('should not send reminder when today is suspended', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, isSuspended: true, parkOnSide: null }, // Mon suspended (today)
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Tue
      { parkOnSide: 'near' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Mock today as Monday
    const monday = weekView.days[0].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(monday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    const decision = shouldSendMoveReminder(weekView, mockConfig);
    expect(decision.shouldMove).toBe(false);
  });

  it('should not send reminder when today has no cleaning', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Tue
      { parkOnSide: 'far' }, // Wed (today, no cleaning)
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Mock today as Wednesday
    const wednesday = weekView.days[2].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(wednesday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    const decision = shouldSendMoveReminder(weekView, mockConfig);
    expect(decision.shouldMove).toBe(false);
  });

  it('should not send reminder when no more cleaning days this week', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Tue
      { parkOnSide: 'near' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu (today)
      { isSuspended: true, parkOnSide: 'far' }, // Fri suspended
    ]);

    // Mock today as Thursday
    const thursday = weekView.days[3].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(thursday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    const decision = shouldSendMoveReminder(weekView, mockConfig);
    expect(decision.shouldMove).toBe(false);
  });

  it('should handle Tuesday cleaning day correctly', () => {
    const weekView = createMockWeekView([
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Mon
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Tue (today)
      { parkOnSide: 'far' }, // Wed
      { hasNearSideCleaning: true, parkOnSide: 'far' }, // Thu
      { hasFarSideCleaning: true, parkOnSide: 'near' }, // Fri
    ]);

    // Mock today as Tuesday
    const tuesday = weekView.days[1].date;
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(tuesday);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockImplementation((d1, d2) => {
      return d1.getTime() === d2.getTime();
    });

    const decision = shouldSendMoveReminder(weekView, mockConfig);

    // Tuesday->Thursday requires move from near->far
    expect(decision.shouldMove).toBe(true);
    expect(decision.currentSide).toBe('near');
    expect(decision.targetSide).toBe('far');
    expect(decision.nextMoveDate).toEqual(weekView.days[3].date); // Thursday
  });
});
