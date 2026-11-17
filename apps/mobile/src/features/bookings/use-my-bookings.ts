import { useCallback, useEffect, useRef, useState } from 'react';

import { bookingApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import type { ApiBooking, ApiBookingStatus, PageMeta } from '@/lib/api/types';

export type BookingFilter = 'all' | ApiBookingStatus;

type Status = 'idle' | 'loading' | 'paginating' | 'ready' | 'error';

export type MyBookingsState = {
  items: ApiBooking[];
  meta: PageMeta | null;
  status: Status;
  error: string | null;
  reload: () => void;
  loadMore: () => void;
};

const PAGE_SIZE = 10;

export function useMyBookings(filter: BookingFilter): MyBookingsState {
  const [items, setItems] = useState<ApiBooking[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const token = useRef(0);
  const page = useRef(1);
  const paginating = useRef(false);
  const filterRef = useRef(filter);

  // The filter is read at call time so `reload` keeps one identity — otherwise a
  // screen that refreshes on focus would fire twice for a single chip tap.
  useEffect(() => {
    filterRef.current = filter;
  });

  const run = useCallback((mode: 'first' | 'more') => {
    // A re-read always goes out: the token guard discards whatever was in
    // flight, so changing filters cannot leave the previous filter's rows on
    // screen. Only pagination is de-duplicated.
    if (mode === 'more' && paginating.current) return;

    const current = ++token.current;
    const active = filterRef.current;
    if (mode === 'first') setStatus('loading');
    else {
      paginating.current = true;
      setStatus('paginating');
    }

    bookingApi
      .mine({
        page: mode === 'first' ? 1 : page.current + 1,
        limit: PAGE_SIZE,
        ...(active === 'all' ? {} : { status: active }),
      })
      .then((result) => {
        if (current !== token.current) return;
        page.current = result.meta.page;
        setMeta(result.meta);
        setItems((existing) => (mode === 'first' ? result.items : [...existing, ...result.items]));
        setError(null);
        setStatus('ready');
      })
      .catch((cause) => {
        if (current !== token.current) return;
        setError(describeApiError(cause));
        setStatus('error');
      })
      .finally(() => {
        if (mode === 'more') paginating.current = false;
      });
  }, []);

  const reload = useCallback(() => run('first'), [run]);
  const loadMore = useCallback(() => {
    if (!meta || items.length >= meta.total) return;
    run('more');
  }, [items.length, meta, run]);

  useEffect(() => {
    reload();
  }, [reload, filter]);

  return { items, meta, status, error, reload, loadMore };
}
