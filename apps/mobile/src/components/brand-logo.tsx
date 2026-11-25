import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/** The SavariGo swoosh + wordmark, as drawn on the website and the reference app. */
export function BrandLogo({
  scale = 1,
  align = 'flex-start',
  style,
}: {
  scale?: number;
  align?: 'flex-start' | 'center';
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const wordSize = 24 * scale;
  return (
    <View style={[styles.logo, { alignItems: align }, style]}>
      <View style={[styles.markRow, { gap: 7 * scale }]}>
        <Swoosh size={30 * scale} />
        <View style={{ alignItems: align }}>
          <Text
            style={{
              fontSize: wordSize,
              lineHeight: wordSize * 1.04,
              fontWeight: '800',
              letterSpacing: -0.7 * scale,
              color: theme.text,
            }}>
            Savari<Text style={{ color: theme.brandStrong }}>Go</Text>
          </Text>
          <Text
            style={{
              fontSize: 9.5 * scale,
              lineHeight: 13 * scale,
              fontWeight: '700',
              letterSpacing: 0.35 * scale,
              color: theme.text,
            }}>
            Drive · Rent · Go
          </Text>
        </View>
      </View>
    </View>
  );
}

function Swoosh({ size }: { size: number }) {
  const theme = useTheme();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <Path
          d="M17.5 6.4c-1.5-1.6-3.9-2.1-6-1.5-2.2.6-3.5 2.3-3 4 .4 1.5 2 2.1 3.6 2.5l2.1.5c1.5.4 2.2 1 1.9 1.9-.3.9-1.5 1.5-2.9 1.4-1.8-.1-3.1-.9-4-2"
          stroke={theme.brandStrong}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <Path d="M18.6 3.6c.6-1 1.7-1.5 2.8-1.3-.1 1.2-.9 2.2-2 2.6" fill={theme.brandStrong} />
        <Path d="M5.9 15.4c-.6.7-1.1 1.5-1.4 2.3.9.1 1.8-.2 2.3-.8" fill="#e23c1e" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { justifyContent: 'center' },
  markRow: { flexDirection: 'row', alignItems: 'center' },
});
