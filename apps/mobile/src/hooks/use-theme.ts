import { Colors } from '@/constants/theme';

/**
 * The shipped design is the light palette on every screen, so the system's
 * dark-mode preference is deliberately not followed.
 */
export function useTheme() {
  return Colors.light;
}
