import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { catalogueApi, type VehicleQuery } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import type { ApiVehicle, PageMeta } from '@/lib/api/types';

type Status = 'idle' | 'loading' | 'refreshing' | 'paginating' | 'ready' | 'error';

export type VehicleListState = {
  items: ApiVehicle[];
  meta: PageMeta | null;
  status: Status;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
};

/**
 * One hook drives every catalogue surface. It keeps the request in a ref so a
 * filter change cannot be answered by an older response — the failure mode that
 * shows a customer the wrong fleet after they tap a chip.
 */
export function useVehicleList(query: VehicleQuery): VehicleListState {
  const [items, setItems] = useState<ApiVehicle[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestToken = useRef(0);
  const pageRef = useRef(1);
  const inflight = useRef(false);
  const stabilityRef = useRef<string>('');

  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const fetchPage = useCallback(
    async (mode: 'first' | 'more') => {
      if (inflight.current) return;
      inflight.current = true;
      const token = ++requestToken.current;

      setStatus(mode === 'first' ? 'loading' : 'paginating');
      try {
        const page = mode === 'first' ? 1 : pageRef.current + 1;
        const result = await catalogueApi.vehicles({ ...query, page, limit: 12 });
        if (token !== requestToken.current) return;

        pageRef.current = result.meta.page;
        setMeta(result.meta);
        setItems((current) => (mode === 'first' ? result.items : [...current, ...result.items]));
        setError(null);
        setStatus('ready');
      } catch (cause) {
        if (token !== requestToken.current) return;
        setError(describeApiError(cause));
        setStatus('error');
      } finally {
        inflight.current = false;
      }
    },
    [query],
  );

  useEffect(() => {
    if (stabilityRef.current === queryKey) return;
    stabilityRef.current = queryKey;
    pageRef.current = 1;
    void fetchPage('first');
  }, [queryKey, fetchPage]);

  return {
    items,
    meta,
    status,
    error,
    refresh: () => void fetchPage('first'),
    loadMore: () => {
      if (!meta || items.length >= meta.total || status === 'paginating') return;
      void fetchPage('more');
    },
  };
}

export function useCatalogueFilters() {
  const [category, setCategory] = useState<string | undefined>();
  const [location, setLocation] = useState<string | undefined>();
  const [sort, setSort] = useState<VehicleQuery['sort']>('popular');
  const [seats, setSeats] = useState<number | undefined>();
  const [fuelType, setFuelType] = useState<VehicleQuery['fuelType']>();
  const [q, setQ] = useState<string>('');

  const query = useMemo<VehicleQuery>(
    () => ({
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(category ? { category } : {}),
      ...(location ? { location } : {}),
      ...(seats ? { seats } : {}),
      ...(fuelType ? { fuelType } : {}),
      sort,
    }),
    [q, category, location, seats, fuelType, sort],
  );

  const reset = useCallback(() => {
    setCategory(undefined);
    setLocation(undefined);
    setSeats(undefined);
    setFuelType(undefined);
    setQ('');
    setSort('popular');
  }, []);

  const activeCount = [category, location, seats, fuelType, q.trim()].filter(Boolean).length;

  return { query, category, setCategory, location, setLocation, sort, setSort, seats, setSeats, fuelType, setFuelType, q, setQ, reset, activeCount };
}
