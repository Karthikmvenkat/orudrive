import {
  ApiOriginError,
  resolveApiBaseUrl,
  resolveMediaBaseUrl,
  resolveMediaUrl,
  resetApiBaseUrlCache,
  resetMediaBaseUrlCache,
} from '@/lib/api/config';

const ENV_KEYS = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_DEV_API_PORT', 'EXPO_PUBLIC_MEDIA_URL', 'EXPO_PUBLIC_DEV_WEB_PORT'];

describe('resolveApiBaseUrl', () => {
  it('puts every call behind the versioned prefix', () => {
    expect(resolveApiBaseUrl({ configuredOrigin: 'https://api.savarigo.test' })).toBe('https://api.savarigo.test/api/v1');
  });

  it('adds the prefix to a bare origin and trusts one that carries its own path', () => {
    expect(resolveApiBaseUrl({ configuredOrigin: 'https://api.savarigo.test/api/v1' })).toBe('https://api.savarigo.test/api/v1');
    expect(resolveApiBaseUrl({ configuredOrigin: 'https://api.savarigo.test/' })).toBe('https://api.savarigo.test/api/v1');
    expect(resolveApiBaseUrl({ configuredOrigin: 'https://gateway.test/savarigo/api/v1/' })).toBe(
      'https://gateway.test/savarigo/api/v1',
    );
  });

  it('derives the LAN origin from the Expo dev server', () => {
    expect(resolveApiBaseUrl({ hostUri: '192.168.0.4:8081', devApiPort: '4100', platform: 'ios' })).toBe(
      'http://192.168.0.4:4100/api/v1',
    );
  });

  it('rewrites only the Android emulator loopback', () => {
    expect(resolveApiBaseUrl({ hostUri: 'localhost:8081', platform: 'android' })).toBe('http://10.0.2.2:4100/api/v1');
    expect(resolveApiBaseUrl({ hostUri: 'localhost:8081', platform: 'ios' })).toBe('http://localhost:4100/api/v1');
    expect(resolveApiBaseUrl({ hostUri: '192.168.0.4:8081', platform: 'android' })).toBe('http://192.168.0.4:4100/api/v1');
  });

  it('brackets an IPv6 host so the port stays separable', () => {
    expect(resolveApiBaseUrl({ hostUri: '[fe80::1]:8081', platform: 'ios' })).toBe('http://[fe80::1]:4100/api/v1');
  });

  it('falls back to the default dev port on a nonsense override', () => {
    expect(resolveApiBaseUrl({ hostUri: '10.1.1.1:8081', devApiPort: 'not-a-port', platform: 'ios' })).toBe(
      'http://10.1.1.1:4100/api/v1',
    );
    expect(resolveApiBaseUrl({ hostUri: '10.1.1.1:8081', devApiPort: '70000', platform: 'ios' })).toBe(
      'http://10.1.1.1:4100/api/v1',
    );
    expect(resolveApiBaseUrl({ hostUri: '10.1.1.1:8081', devApiPort: '4321', platform: 'ios' })).toBe(
      'http://10.1.1.1:4321/api/v1',
    );
  });

  it('refuses to guess rather than calling localhost silently', () => {
    expect(() => resolveApiBaseUrl({ configuredOrigin: 'api.savarigo.test' })).toThrow(ApiOriginError);
    expect(() => resolveApiBaseUrl({ hostUri: null })).toThrow(/No API origin available/);
  });
});

describe('resolveMediaBaseUrl', () => {
  it('trims the trailing slash without adding the API prefix', () => {
    expect(resolveMediaBaseUrl({ configuredOrigin: 'https://savarigo.test/' })).toBe('https://savarigo.test');
  });

  it('points at the website dev port when only a LAN host is known', () => {
    expect(resolveMediaBaseUrl({ hostUri: '192.168.0.4:8081', devWebPort: '3001', platform: 'ios' })).toBe(
      'http://192.168.0.4:3001',
    );
  });

  it('fails loudly when the catalogue images have nowhere to come from', () => {
    expect(() => resolveMediaBaseUrl({ configuredOrigin: 'savarigo.test' })).toThrow(/EXPO_PUBLIC_MEDIA_URL/);
    expect(() => resolveMediaBaseUrl({ hostUri: null })).toThrow(ApiOriginError);
  });
});

describe('resolveMediaUrl', () => {
  const original = ENV_KEYS.reduce<Record<string, string | undefined>>((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});

  beforeEach(() => {
    process.env.EXPO_PUBLIC_MEDIA_URL = 'https://savarigo.test';
    resetMediaBaseUrlCache();
  });

  afterAll(() => {
    for (const key of ENV_KEYS) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetMediaBaseUrlCache();
    resetApiBaseUrlCache();
  });

  it('prefixes the catalogue paths the API stores', () => {
    expect(resolveMediaUrl('/images/vehicles/ola-s1-pro.jpg')).toBe('https://savarigo.test/images/vehicles/ola-s1-pro.jpg');
    expect(resolveMediaUrl('images/vehicles/ola-s1-pro.jpg')).toBe('https://savarigo.test/images/vehicles/ola-s1-pro.jpg');
  });

  it('leaves already-absolute sources alone', () => {
    expect(resolveMediaUrl('https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg');
    expect(resolveMediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('maps a missing image to null so callers can render a placeholder', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeNull();
    expect(resolveMediaUrl('')).toBeNull();
  });
});
