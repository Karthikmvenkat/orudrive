import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

const KEY = 'savarigo.favorites';

async function readIds(): Promise<string[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null)
        : await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIds(ids: string[]): Promise<void> {
  const raw = JSON.stringify(ids);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(KEY, raw);
}

type FavoritesValue = {
  ids: Set<string>;
  count: number;
  isSaved: (vehicleId: string) => boolean;
  toggle: (vehicleId: string) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

/** Saved rides are a device-local shortlist; the API has no favourites model. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    readIds().then((stored) => {
      if (active) setIds(new Set(stored));
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((vehicleId: string) => {
    setIds((current) => {
      const next = new Set(current);
      if (next.has(vehicleId)) next.delete(vehicleId);
      else next.add(vehicleId);
      void writeIds([...next]);
      return next;
    });
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      count: ids.size,
      isSaved: (vehicleId) => ids.has(vehicleId),
      toggle,
    }),
    [ids, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside <FavoritesProvider>.');
  return context;
}
