/**
 * The rental window the booking flow works with. Kept as pure functions because
 * a wrong hour here is a wrong quote downstream, and it is far cheaper to prove
 * in a unit test than on a device.
 */

export type DayOption = {
  /** `2026-11-18` — the calendar date in the device's own time zone. */
  key: string;
  date: Date;
  label: string;
  sublabel: string;
  isToday: boolean;
};

export type TimeOption = {
  /** `09:30` */
  value: string;
  label: string;
};

export type RentalWindow = {
  pickupAt: string;
  returnAt: string;
  durationDays: number;
};

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const dayMonthFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });

export function dateKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

export function buildDayOptions(start: Date = new Date(), count = 21): DayOption[] {
  const today = new Date(start);
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return {
      key: dateKey(date),
      date,
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : weekdayFormatter.format(date),
      sublabel: dayMonthFormatter.format(date),
      isToday: offset === 0,
    };
  });
}

/** Half-hour slots from 06:00 to 22:30, the window the fleet is handed over in. */
export function buildTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let minutes = 6 * 60; minutes <= 22 * 60 + 30; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const suffix = hour < 12 ? 'am' : 'pm';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    options.push({ value, label: `${displayHour}:${String(minute).padStart(2, '0')}${suffix}` });
  }
  return options;
}

/**
 * A day of the strip plus a slot becomes the pair of timestamps the API wants,
 * which keeps the device time zone honest: the pickup instant is built from the
 * local wall clock, then serialised as UTC.
 */
export function composeWindow(dayKey: string, timeValue: string, durationDays: number): RentalWindow {
  const [year, month, day] = dayKey.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  if (!year || !month || !day || hour === undefined || minute === undefined) {
    throw new Error(`Incomplete rental window: ${dayKey} ${timeValue}`);
  }

  const pickup = new Date(year, month - 1, day, hour, minute, 0, 0);
  const returned = new Date(pickup);
  returned.setDate(pickup.getDate() + Math.max(1, Math.round(durationDays)));

  return { pickupAt: pickup.toISOString(), returnAt: returned.toISOString(), durationDays: Math.max(1, Math.round(durationDays)) };
}

/** Refuses windows that start in the past, before the request ever leaves the phone. */
export function isWindowInFuture(window: RentalWindow, now: Date = new Date()): boolean {
  return new Date(window.pickupAt).getTime() > now.getTime();
}

export function windowSummary(window: RentalWindow): string {
  const pickup = new Date(window.pickupAt);
  const returned = new Date(window.returnAt);
  const duration = `${window.durationDays} day${window.durationDays === 1 ? '' : 's'}`;
  const datePart = dayMonthFormatter.format(pickup);
  return dateKey(pickup) === dateKey(returned)
    ? `${datePart}, ${duration}`
    : `${datePart} → ${dayMonthFormatter.format(returned)}, ${duration}`;
}
