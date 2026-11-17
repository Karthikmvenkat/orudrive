import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  buildDayOptions,
  buildTimeOptions,
  composeWindow,
  dateKey,
  type RentalWindow,
} from './window';

type RentalWindowContextValue = {
  days: ReturnType<typeof buildDayOptions>;
  times: ReturnType<typeof buildTimeOptions>;
  dayKey: string;
  timeValue: string;
  durationDays: number;
  window: RentalWindow;
  setDayKey: (next: string) => void;
  setTimeValue: (next: string) => void;
  setDurationDays: (next: number) => void;
};

const RentalWindowContext = createContext<RentalWindowContextValue | null>(null);

/**
 * The picked-up/return window belongs to the whole booking flow, not to the
 * search screen: detail, quote and checkout all have to price the same hours,
 * otherwise the rupee figure the customer taps is not the one they reserve.
 */
export function RentalWindowProvider({ children }: { children: ReactNode }) {
  const days = useMemo(() => buildDayOptions(), []);
  const times = useMemo(() => buildTimeOptions(), []);

  // The first slot the customer sees has to be bookable: 09:00 is in the past
  // for anyone opening the app mid-morning, and the API refuses a past window.
  const initial = useMemo(() => {
    const now = new Date();
    const latest = new Date(now);
    latest.setHours(22, 30, 0, 0);
    const lead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (lead > latest) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return { dayKey: dateKey(tomorrow), timeValue: '09:00' };
    }
    const slot = Math.ceil((lead.getHours() * 60 + lead.getMinutes()) / 30) * 30;
    const timeValue = `${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}`;
    return { dayKey: dateKey(now), timeValue };
  }, []);

  const [dayKey, setDayKey] = useState(initial.dayKey);
  const [timeValue, setTimeValue] = useState(initial.timeValue);
  const [durationDays, setDurationDays] = useState(3);

  const value = useMemo<RentalWindowContextValue>(
    () => ({
      days,
      times,
      dayKey,
      timeValue,
      durationDays,
      window: composeWindow(dayKey, timeValue, durationDays),
      setDayKey,
      setTimeValue,
      setDurationDays,
    }),
    [days, times, dayKey, timeValue, durationDays],
  );

  return <RentalWindowContext.Provider value={value}>{children}</RentalWindowContext.Provider>;
}

export function useRentalWindow(): RentalWindowContextValue {
  const context = useContext(RentalWindowContext);
  if (!context) throw new Error('useRentalWindow must be used inside <RentalWindowProvider>.');
  return context;
}
