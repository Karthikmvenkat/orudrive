/**
 * SavariGo palette, taken from the shipped mobile design: a deep forest hero,
 * a vivid green action colour and a lime accent, on a warm off-white page.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#10231a',
    background: '#f5f8f2',
    backgroundElement: '#ffffff',
    backgroundSelected: '#eef6e7',
    textSecondary: '#66786b',
    brand: '#1f7a3a',
    brandStrong: '#14532a',
    brandSoft: '#eaf4e2',
    line: '#e6ece0',
    lineStrong: '#d5dfcd',
    hero: '#0d2e1b',
    heroSoft: '#17452a',
    onHero: '#ffffff',
    onHeroMuted: 'rgba(255,255,255,0.72)',
    lime: '#c9f16b',
    limeOn: '#10301c',
    accentBlue: '#e8f2fb',
    accentBlueText: '#1f5f96',
    warning: '#d97706',
    danger: '#c0392b',
    info: '#e8f2fb',
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

/** White cards float on the page without a hard border. */
export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#0d2e1b',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 2 },
  default: {},
}) ?? {};

export const BottomTabInset = Platform.select({ ios: 64, android: 84 }) ?? 0;
export const MaxContentWidth = 560;
