import { useCallback, useEffect, useRef, useState } from 'react';

import { describeApiError } from '@/lib/api/errors';

export type AsyncList<T> = {
  items: T[];
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  reload: () => void;
};

/**
 * A list endpoint with no pagination to manage. The token guard is what makes
 * it safe to call from `useFocusEffect`, which re-runs the loader every time a
 * tab is opened again: only the newest response may write to state.
 */
export function useAsyncList<T>(load: () => Promise<T[]>): AsyncList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<AsyncList<T>['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const token = useRef(0);
  const loader = useRef(load);

  // Declared ahead of the loading effect, so `run` always reads the newest
  // closure and no ref is written while the component renders.
  useEffect(() => {
    loader.current = load;
  });

  const run = useCallback(() => {
    const current = ++token.current;
    setStatus('loading');
    loader
      .current()
      .then((next) => {
        if (current !== token.current) return;
        setItems(next);
        setError(null);
        setStatus('ready');
      })
      .catch((cause) => {
        if (current !== token.current) return;
        setError(describeApiError(cause));
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return { items, status, error, reload: run };
}

export type AsyncResource<T> = {
  data: T | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  reload: () => void;
};

/** Same guard as `useAsyncList`, for one row that is re-read when `key` changes. */
export function useAsyncResource<T>(key: string, load: () => Promise<T>): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncResource<T>['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const token = useRef(0);
  const loader = useRef(load);

  // Same ordering as `useAsyncList`: the newest closure lands in the ref before
  // the effect that spends it re-runs on a key change.
  useEffect(() => {
    loader.current = load;
  });

  const run = useCallback(() => {
    const current = ++token.current;
    setStatus('loading');
    loader
      .current()
      .then((next) => {
        if (current !== token.current) return;
        setData(next);
        setError(null);
        setStatus('ready');
      })
      .catch((cause) => {
        if (current !== token.current) return;
        setError(describeApiError(cause));
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    run();
  }, [run, key]);

  return { data, status, error, reload: run };
}
