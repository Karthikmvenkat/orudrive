import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CircleButton({
  icon,
  onPress,
  label,
  tone = 'light',
  size = 42,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
  tone?: 'light' | 'dark';
  size?: number;
}) {
  const theme = useTheme();
  const background = tone === 'dark' ? 'rgba(36,36,36,0.66)' : theme.backgroundElement;
  const color = tone === 'dark' ? '#ffffff' : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.pageHeader}>
      {onBack ? <CircleButton icon="chevron-back" onPress={onBack} label="Go back" /> : null}
      <View style={styles.pageHeaderText}>
        <ThemedText type="title" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        {eyebrow ? (
          <ThemedText type="label" themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="heading">{title}</ThemedText>
      </View>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <ThemedText type="smallBold" style={{ color: theme.brandStrong }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,20,20,0.45)' }]}
          accessibilityLabel="Close"
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundElement,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
              maxHeight: '92%',
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.lineStrong }]} />
          <View style={styles.sheetHead}>
            <View style={styles.sheetHeadText}>
              <ThemedText type="heading">{title}</ThemedText>
              {subtitle ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>
            <CircleButton icon="close" onPress={onClose} label="Close" />
          </View>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.sheetBody}>{children}</View>
          )}
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function SpecTile({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.specTile, { backgroundColor: theme.backgroundSelected }]}>
      <Ionicons name={icon} size={19} color={theme.accentGold} />
      <ThemedText style={styles.specValue} numberOfLines={1}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Notice({
  icon = 'information-circle-outline',
  text,
  tone = 'info',
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
  tone?: 'info' | 'brand' | 'danger';
}) {
  const theme = useTheme();
  const colors = {
    info: { background: theme.accentBlue, text: theme.accentBlueText },
    brand: { background: theme.brandSoft, text: theme.brandStrong },
    danger: { background: theme.backgroundSelected, text: theme.danger },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <ThemedText type="small" style={[styles.noticeText, { color: colors.text }]}>
        {text}
      </ThemedText>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active && { backgroundColor: theme.brandSoft },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: active ? theme.text : theme.textSecondary }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MenuRow({
  icon,
  label,
  meta,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { opacity: pressed ? 0.75 : 1, borderBottomColor: theme.line },
        last && styles.menuRowLast,
      ]}>
      <Ionicons name={icon} size={21} color={theme.accentGold} />
      <ThemedText type="body" style={styles.menuLabel}>
        {label}
      </ThemedText>
      {meta ? (
        <View style={[styles.menuMeta, { backgroundColor: theme.brandSoft }]}>
          <ThemedText type="small" style={{ color: theme.brandStrong, fontWeight: '700' }}>
            {meta}
          </ThemedText>
        </View>
      ) : null}
      <Ionicons name="arrow-forward" size={17} color={theme.accentGold} />
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="label" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

export function ChipRow({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: ViewProps['style'];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.chipRow, contentStyle]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  pageHeaderText: { flex: 1, gap: 2 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  sectionHeadingText: { flex: 1, gap: 2 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  handle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, marginBottom: Spacing.three },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  sheetHeadText: { flex: 1, gap: 2 },
  sheetBody: { gap: Spacing.three, paddingVertical: Spacing.three },
  sheetFooter: { gap: Spacing.two, paddingBottom: Spacing.two },
  specTile: {
    flex: 1,
    borderRadius: Radius.tile,
    paddingVertical: 12,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 5,
    minWidth: 74,
  },
  specValue: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  specLabel: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radius.field,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, lineHeight: 19 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill, gap: 2 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, fontWeight: '700' },
  menuMeta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  chipRow: { gap: Spacing.two, paddingVertical: 2 },
});
