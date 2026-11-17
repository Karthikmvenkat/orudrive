import { useEffect, useMemo, useRef, useState } from 'react';

import { bookingApi, type BookingInput } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import type { ApiQuote } from '@/lib/api/types';

export type QuoteState = {
  quote: ApiQuote | null;
  stale: boolean;
  error: string | null;
};

/**
 * Prices the booking on the server instead of guessing locally: the deposit,
 * the duration discount and the tax percentage all live in the API, and a
 * rupee figure that turns out to be wrong at the counter is worse than none.
 *
 * The debounce is what keeps a customer dragging the day stepper from firing
 * sixty requests a minute at a route that is explicitly throttled.
 */
export function useQuote(input: BookingInput | null, delayMs = 350): QuoteState {
  const [quote, setQuote] = useState<ApiQuote | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef(0);

  const key = useMemo(() => (input ? JSON.stringify(input) : ''), [input]);

  useEffect(() => {
    if (!input) {
      setQuote(null);
      setStale(false);
      return;
    }
    const current = ++token.current;
    setStale(true);
    const timer = setTimeout(() => {
      bookingApi
        .quote(input)
        .then((next) => {
          if (current !== token.current) return;
          setQuote(next);
          setError(null);
          setStale(false);
        })
        .catch((cause) => {
          if (current !== token.current) return;
          setError(describeApiError(cause));
          setStale(false);
        });
    }, delayMs);

    return () => clearTimeout(timer);
    // `key` is the serialised input: the object identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delayMs]);

  return { quote, stale, error };
}
