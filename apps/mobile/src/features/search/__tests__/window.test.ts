import {
  buildDayOptions,
  buildTimeOptions,
  composeWindow,
  dateKey,
  isWindowInFuture,
  windowSummary,
} from '@/features/search/window';

describe('dateKey', () => {
  it('uses the device calendar day, not the UTC one', () => {
    expect(dateKey(new Date(2026, 10, 16, 23, 30))).toBe('2026-11-16');
  });
});

describe('buildDayOptions', () => {
  const start = new Date(2026, 10, 16, 13, 45);

  it('starts at midnight today and steps by calendar day', () => {
    const days = buildDayOptions(start, 4);
    expect(days.map((day) => day.key)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
    expect(days[0].date.getHours()).toBe(0);
    expect(days[0].date.getMinutes()).toBe(0);
  });

  it('spills into the next month instead of clamping', () => {
    expect(buildDayOptions(new Date(2026, 0, 30, 8, 0), 4).map((day) => day.key)).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });

  it('names only the first two slots in words', () => {
    const days = buildDayOptions(start, 3);
    expect(days.map((day) => day.label)).toEqual(['Today', 'Tomorrow', expect.stringMatching(/^[A-Z][a-z]+$/)]);
    expect(days.map((day) => day.isToday)).toEqual([true, false, false]);
    expect(days[0].sublabel).toBe('16 Nov');
  });
});

describe('buildTimeOptions', () => {
  it('offers half-hour slots across the hand-over window', () => {
    const times = buildTimeOptions();
    expect(times).toHaveLength(34);
    expect(times[0]).toEqual({ value: '06:00', label: '6:00am' });
    expect(times[times.length - 1]).toEqual({ value: '22:30', label: '10:30pm' });
    expect(times.find((time) => time.value === '11:30')?.label).toBe('11:30am');
    expect(times.find((time) => time.value === '12:00')?.label).toBe('12:00pm');
    expect(times.find((time) => time.value === '13:00')?.label).toBe('1:00pm');
  });
});

describe('composeWindow', () => {
  it('reads the wall clock locally and adds whole days', () => {
    const window = composeWindow('2026-11-18', '09:30', 3);
    expect(window.pickupAt).toBe(new Date(2026, 10, 18, 9, 30, 0, 0).toISOString());
    expect(window.returnAt).toBe(new Date(2026, 10, 21, 9, 30, 0, 0).toISOString());
    expect(window.durationDays).toBe(3);
  });

  it('carries a month-end pick-up into the next month', () => {
    expect(composeWindow('2026-01-31', '06:00', 1).returnAt).toBe(new Date(2026, 1, 1, 6, 0, 0, 0).toISOString());
  });

  it('never builds a zero-length or fractional hire', () => {
    expect(composeWindow('2026-03-05', '18:00', 0).durationDays).toBe(1);
    expect(composeWindow('2026-03-05', '18:00', 2.4).durationDays).toBe(2);
  });

  it('refuses a half-entered window', () => {
    expect(() => composeWindow('', '', 1)).toThrow(/Incomplete rental window/);
    expect(() => composeWindow('2026-11', '09:30', 1)).toThrow(/Incomplete rental window/);
  });
});

describe('isWindowInFuture', () => {
  it('draws the line exactly at pick-up', () => {
    const window = composeWindow('2026-11-18', '09:30', 1);
    expect(isWindowInFuture(window, new Date(2026, 10, 18, 9, 0))).toBe(true);
    expect(isWindowInFuture(window, new Date(2026, 10, 18, 9, 30))).toBe(false);
    expect(isWindowInFuture(window, new Date(2026, 10, 18, 12, 0))).toBe(false);
  });
});

describe('windowSummary', () => {
  it('shows both ends of a multi-day hire', () => {
    expect(windowSummary(composeWindow('2026-11-18', '09:30', 3))).toBe('18 Nov → 21 Nov, 3 days');
  });

  it('does not pluralise a single day', () => {
    expect(windowSummary(composeWindow('2026-11-18', '09:30', 1))).toBe('18 Nov → 19 Nov, 1 day');
  });
});
