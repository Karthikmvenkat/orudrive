import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Every API route the app calls sits under this prefix. */
export const API_PATH_PREFIX = '/api/v1';

/** Matches `PORT` in the running development API, see apps/api/.env. */
export const DEFAULT_DEV_API_PORT = 4100;

/** Thrown when no usable origin can be worked out, instead of silently calling localhost. */
export class ApiOriginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiOriginError';
  }
}

export type ApiOriginInput = {
  /** `EXPO_PUBLIC_API_URL`, when the build pins an origin. */
  configuredOrigin?: string;
  /** `EXPO_PUBLIC_DEV_API_PORT`, when the LAN API is not on 4100. */
  devApiPort?: string;
  /** `Constants.expoConfig.hostUri`, e.g. `192.168.0.4:8081`. */
  hostUri?: string | null;
  /** Platform the app is running on; only `android` gets the emulator rewrite. */
  platform?: string;
};

function normalizePort(raw: string | undefined): string {
  const port = Number(raw);
  return Number.isInteger(port) && port > 0 && port < 65_536 ? String(port) : String(DEFAULT_DEV_API_PORT);
}

function withPrefix(origin: string): string {
  const url = new URL(origin);
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path === '' || path === '/' ? API_PATH_PREFIX : path}`;
}

/**
 * The Expo dev server already knows the LAN address this machine has right now,
 * so a phone on the same Wi-Fi can reach the API without anyone hard-coding an
 * IP that goes stale with the next DHCP lease.
 */
function fromHostUri(hostUri: string, port: string, platform: string | undefined): string | null {
  let url: URL;
  try {
    url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
  } catch {
    return null;
  }

  let host = url.hostname;
  if (!host) return null;

  // An Android emulator cannot see the host machine's loopback; 10.0.2.2 is the
  // documented alias for it.
  if ((host === 'localhost' || host === '127.0.0.1') && platform === 'android') {
    host = '10.0.2.2';
  }
  // `URL.hostname` keeps the brackets an IPv6 origin is written with already.
  if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;

  return `http://${host}:${port}`;
}

export function resolveApiBaseUrl(input: ApiOriginInput = {}): string {
  const {
    configuredOrigin = process.env.EXPO_PUBLIC_API_URL,
    devApiPort = process.env.EXPO_PUBLIC_DEV_API_PORT,
    hostUri = Constants.expoConfig?.hostUri ?? null,
    platform = Platform.OS,
  } = input;

  const trimmed = configuredOrigin?.trim();
  if (trimmed) {
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new ApiOriginError(
        `EXPO_PUBLIC_API_URL must start with http:// or https:// — received "${trimmed}".`,
      );
    }
    return withPrefix(trimmed);
  }

  const derived = hostUri ? fromHostUri(hostUri, normalizePort(devApiPort), platform) : null;
  if (derived) return withPrefix(derived);

  throw new ApiOriginError(
    'No API origin available. Start the app with `npx expo start --lan` so a LAN host can be ' +
      'derived, or set EXPO_PUBLIC_API_URL for a build that points at a fixed origin.',
  );
}

let cachedBaseUrl: string | null = null;

/** Cached because every caller wants the same answer, and resolution is pure string work. */
export function apiBaseUrl(): string {
  if (!cachedBaseUrl) cachedBaseUrl = resolveApiBaseUrl();
  return cachedBaseUrl;
}

/** Test seam: forget the cached origin so a test can inject its own environment. */
export function resetApiBaseUrlCache(): void {
  cachedBaseUrl = null;
}

/**
 * Vehicle and category photography is served by the website, not the API — the
 * catalogue stores paths like `/images/vehicles/ola-s1-pro.jpg`. The mobile app
 * therefore needs the media origin as well as the API origin.
 */
export const DEFAULT_DEV_WEB_PORT = 3001;

let cachedMediaBaseUrl: string | null = null;

export function resolveMediaBaseUrl(input: {
  configuredOrigin?: string;
  devWebPort?: string;
  hostUri?: string | null;
  platform?: string;
} = {}): string {
  const {
    configuredOrigin = process.env.EXPO_PUBLIC_MEDIA_URL,
    devWebPort = process.env.EXPO_PUBLIC_DEV_WEB_PORT,
    hostUri = Constants.expoConfig?.hostUri ?? null,
    platform = Platform.OS,
  } = input;

  const trimmed = configuredOrigin?.trim();
  if (trimmed) {
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new ApiOriginError(`EXPO_PUBLIC_MEDIA_URL must start with http:// or https:// — received "${trimmed}".`);
    }
    return trimmed.replace(/\/+$/, '');
  }

  const derived = hostUri ? fromHostUri(hostUri, normalizePort(devWebPort), platform) : null;
  if (derived) return derived;

  throw new ApiOriginError(
    'No media origin available. Set EXPO_PUBLIC_MEDIA_URL to the website origin that serves ' +
      '/images/... , or run the app against an Expo dev server so the LAN origin can be derived.',
  );
}

export function mediaBaseUrl(): string {
  if (!cachedMediaBaseUrl) cachedMediaBaseUrl = resolveMediaBaseUrl();
  return cachedMediaBaseUrl;
}

/** Absolute URLs are already what the browser should fetch; relative ones need the media origin. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${mediaBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resetMediaBaseUrlCache(): void {
  cachedMediaBaseUrl = null;
}
