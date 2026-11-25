/**
 * SavariGo palette: taxi-sign yellow on warm ivory, charcoal ink, soft pastels.
 * Yellow is a fill colour only — labels on it are charcoal. Green/blue/teal are
 * status colours, never brand colours.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#242424',
    background: '#fff9ed',
    backgroundElement: '#ffffff',
    backgroundSelected: '#f9f1df',
    textSecondary: '#737373',
    brand: '#ffc400',
    onBrand: '#242424',
    /** Golden text tone for small links/labels on ivory (contrast-safe). */
    brandStrong: '#8a6400',
    /** Brighter gold for illustration icons on cream cards. */
    accentGold: '#e09400',
    brandSoft: '#fff1c2',
    line: '#eae5da',
    lineStrong: '#dcd5c6',
    hero: '#242424',
    heroSoft: '#333333',
    onHero: '#ffffff',
    onHeroMuted: 'rgba(255,255,255,0.72)',
    /** Yellow accent for dark surfaces; the historical name is kept for call sites. */
    lime: '#ffc400',
    limeOn: '#242424',
    /** Status/info chip only; blue never carries the brand. */
    accentBlue: '#e9effb',
    accentBlueText: '#2f4f8b',
    warning: '#b45309',
    danger: '#c62828',
    info: '#faf1de',
    success: '#2e7d4f',
    successSoft: '#e8f3ea',
    /** Services use a warm terracotta accent so a repair never reads as a rental. */
    service: '#9a4a18',
    serviceStrong: '#7a370f',
    serviceSoft: '#fce3d6',
    serviceOn: '#ffffff',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  field: 14,
  card: 20,
  sheet: 28,
  pill: 999,
  tile: 18,
} as const;

/** White cards float on the ivory page with a charcoal-tinted shadow. */
export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#242424',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 2 },
  default: {},
}) ?? {};

export const BottomTabInset = Platform.select({ ios: 64, android: 84 }) ?? 0;
export const MaxContentWidth = 560;
