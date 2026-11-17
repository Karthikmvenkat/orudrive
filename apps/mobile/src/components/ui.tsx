import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, CardShadow, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'brand' | 'info';

type ScreenProps = Omit<ViewProps, 'style'> & {
  style?: ViewProps['style'];
  /** Tabs sit above the bottom inset; pushed screens do not need the gap. */
  tabBarSpace?: boolean;
  /** Screens with their own full-bleed hero or sticky bar manage their padding. */
  padded?: boolean;
};

export function Screen({ children, style, tabBarSpace = true, padded = true, ...rest }: ScreenProps) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]} {...rest}>
      <SafeAreaView style={styles.screen}>
        <View
          style={[
            styles.body,
            padded ? { paddingHorizontal: Spacing.three } : null,
            { paddingBottom: (tabBarSpace ? BottomTabInset : 0) + Spacing.four },
            style,
          ]}>
          {children}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="label" themeColor="textSecondary">
          {title}
        </ThemedText>
        {action}
      </View>
      <View style={[styles.sectionBody, { borderColor: theme.line }]}>{children}</View>
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewProps['style'];
}) {
  const theme = useTheme();
  const surface = [styles.card, CardShadow, { backgroundColor: theme.backgroundElement }, style];
  if (!onPress) {
    return <View style={surface}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [surface, pressed && { opacity: 0.94 }]}>
      {children}
    </Pressable>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="body" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.line }]} />;
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const theme = useTheme();
  const palette: Record<Tone, { background: string; foreground: string }> = {
    neutral: { background: theme.backgroundSelected, foreground: theme.textSecondary },
    good: { background: theme.brandSoft, foreground: theme.brandStrong },
    warn: { background: theme.warning, foreground: '#ffffff' },
    bad: { background: theme.danger, foreground: '#ffffff' },
    brand: { background: theme.brand, foreground: '#ffffff' },
    info: { background: theme.accentBlue, foreground: theme.accentBlueText },
  };
  const colors = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.badgeText, { color: colors.foreground }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'hero';
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const inert = Boolean(disabled) || Boolean(loading);

  const surfaces: Record<
    NonNullable<ButtonProps['variant']>,
    { background: string; border: string; text: string }
  > = {
    primary: { background: theme.brand, border: theme.brand, text: '#ffffff' },
    secondary: { background: theme.backgroundElement, border: theme.lineStrong, text: theme.text },
    ghost: { background: 'transparent', border: 'transparent', text: theme.brandStrong },
    danger: { background: theme.danger, border: theme.danger, text: '#ffffff' },
    hero: { background: theme.hero, border: theme.hero, text: theme.lime },
  };
  const surface = surfaces[variant];

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      onPress={inert ? undefined : onPress}
      style={(state) => [
        styles.button,
        {
          backgroundColor: surface.background,
          borderColor: surface.border,
          opacity: inert ? 0.55 : state.pressed ? 0.9 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}>
      {loading ? (
        <ActivityIndicator color={surface.text} />
      ) : (
        <>
          <Text style={[styles.buttonText, { color: surface.text }]} numberOfLines={1}>
            {title}
          </Text>
          {icon}
        </>
      )}
    </Pressable>
  );
}

type FieldProps = Pick<
  TextInputProps,
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'editable'
  | 'multiline'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'maxLength'
  | 'autoFocus'
  | 'inputMode'
> & {
  label?: string;
  value: string;
  onChangeText: (next: string) => void;
  error?: string | null;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewProps['style'];
};

export function Field({
  label,
  value,
  onChangeText,
  error,
  left,
  right,
  style,
  ...input
}: FieldProps) {
  const theme = useTheme();
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : theme.lineStrong,
          },
        ]}>
        {left}
        <TextInput
          {...input}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text },
            input.multiline ? styles.inputMultiline : null,
            left ? styles.inputWithLeft : null,
          ]}
        />
        {right}
      </View>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Chip({
  text,
  active,
  onPress,
  icon,
}: {
  text: string;
  active?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.brandSoft : theme.backgroundElement,
          borderColor: active ? theme.brand : theme.lineStrong,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {icon}
      <Text
        style={[styles.chipText, { color: active ? theme.brandStrong : theme.text }]}
        numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

export function StateView({
  state,
  message,
  onRetry,
}: {
  state: 'loading' | 'error' | 'empty';
  message?: string | null;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  if (state === 'loading') {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }
  return (
    <View style={styles.state}>
      <ThemedText type="subtitle" style={styles.stateTitle}>
        {state === 'error' ? (message ?? 'That did not load.') : (message ?? 'Nothing here yet.')}
      </ThemedText>
      {state === 'error' && onRetry ? <Button title="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, gap: Spacing.three, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  section: { gap: Spacing.two },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  sectionBody: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  card: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  rowLabel: { flexShrink: 1 },
  rowValue: { textAlign: 'right', flex: 1, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    maxWidth: 220,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  button: {
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    borderWidth: 1,
  },
  buttonText: { fontSize: 16, fontWeight: '800' },
  field: { gap: 6 },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.field,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, paddingVertical: Spacing.two, fontSize: 16 },
  inputWithLeft: { paddingLeft: Spacing.two },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  state: { paddingVertical: Spacing.five, alignItems: 'center', gap: Spacing.three },
  stateTitle: { textAlign: 'center' },
});
