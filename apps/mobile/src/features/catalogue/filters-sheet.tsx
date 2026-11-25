import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Chip, Divider } from '@/components/ui';
import { FieldLabel, Sheet } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ApiCategory, FuelValue } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';

export type ExploreFilters = {
  categories: string[];
  brand?: string;
  fuelType?: FuelValue;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availableNow: boolean;
};

export const EMPTY_FILTERS: ExploreFilters = { categories: [], availableNow: false };

const FUELS: { value: FuelValue; label: string }[] = [
  { value: 'PETROL', label: 'Petrol' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'CNG', label: 'CNG' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const RATINGS = [
  { value: undefined, label: 'Any rating' },
  { value: 4.5, label: '4.5+' },
  { value: 4.7, label: '4.7+' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function FiltersSheet({
  visible,
  onClose,
  filters,
  onChange,
  onReset,
  categories,
  brands,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  filters: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  onReset: () => void;
  categories: ApiCategory[];
  brands: string[];
  resultCount: number;
}) {
  const theme = useTheme();
  const [minPrice, setMinPrice] = useState(filters.minPrice ? String(filters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ? String(filters.maxPrice) : '');

  // The sheet opens on the filters currently in force; typing a price is only
  // committed when the customer asks to see the result, so a half-typed number
  // never queries the catalogue.
  useEffect(() => {
    if (!visible) return;
    setMinPrice(filters.minPrice ? String(filters.minPrice) : '');
    setMaxPrice(filters.maxPrice ? String(filters.maxPrice) : '');
  }, [visible, filters.minPrice, filters.maxPrice]);

  function show() {
    onChange({
      ...filters,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    onClose();
  }

  const activeCount =
    filters.categories.length +
    (filters.brand ? 1 : 0) +
    (filters.fuelType ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.availableNow ? 1 : 0);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Filters${activeCount ? ` · ${activeCount}` : ''}`}
      subtitle="Narrow the fleet by what you actually need"
      footer={
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={onReset} style={styles.reset}>
            <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={show}
            style={({ pressed }) => [
              styles.apply,
              { backgroundColor: theme.brand, opacity: pressed ? 0.9 : 1 },
            ]}>
            <Text style={styles.applyText}>
              Show {resultCount} vehicle{resultCount === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>
      }>
      <View style={styles.group}>
        <FieldLabel>Vehicle type</FieldLabel>
        <View style={styles.wrap}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              text={category.name}
              active={filters.categories.includes(category.slug)}
              onPress={() =>
                onChange({ ...filters, categories: toggle(filters.categories, category.slug) })
              }
            />
          ))}
        </View>
      </View>

      <Divider />

      <View style={styles.group}>
        <FieldLabel>Price per day</FieldLabel>
        <View style={styles.priceRow}>
          <View style={[styles.priceField, { borderColor: theme.lineStrong, backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.pricePrefix, { color: theme.textSecondary }]}>₹</Text>
            <TextInput
              value={minPrice}
              onChangeText={(next) => setMinPrice(next.replace(/\D/g, '').slice(0, 5))}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="Minimum"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Minimum price per day"
              style={[styles.priceInput, { color: theme.text }]}
            />
          </View>
          <View style={[styles.priceField, { borderColor: theme.lineStrong, backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.pricePrefix, { color: theme.textSecondary }]}>₹</Text>
            <TextInput
              value={maxPrice}
              onChangeText={(next) => setMaxPrice(next.replace(/\D/g, '').slice(0, 5))}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="Maximum"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Maximum price per day"
              style={[styles.priceInput, { color: theme.text }]}
            />
          </View>
        </View>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Fleet starts at {formatMoney(499)} a day
        </Text>
      </View>

      {brands.length > 0 ? (
        <>
          <Divider />
          <View style={styles.group}>
            <FieldLabel>Brand</FieldLabel>
            <View style={styles.wrap}>
              {brands.map((brand) => (
                <Chip
                  key={brand}
                  text={brand}
                  active={filters.brand === brand}
                  onPress={() =>
                    onChange({ ...filters, brand: filters.brand === brand ? undefined : brand })
                  }
                />
              ))}
            </View>
          </View>
        </>
      ) : null}

      <Divider />

      <View style={styles.group}>
        <FieldLabel>Fuel</FieldLabel>
        <View style={styles.wrap}>
          {FUELS.map((fuel) => (
            <Chip
              key={fuel.value}
              text={fuel.label}
              active={filters.fuelType === fuel.value}
              onPress={() =>
                onChange({ ...filters, fuelType: filters.fuelType === fuel.value ? undefined : fuel.value })
              }
            />
          ))}
        </View>
      </View>

      <Divider />

      <View style={styles.group}>
        <FieldLabel>Rating</FieldLabel>
        <View style={styles.wrap}>
          {RATINGS.map((rating) => (
            <Chip
              key={rating.label}
              text={rating.label}
              active={filters.minRating === rating.value}
              onPress={() => onChange({ ...filters, minRating: rating.value })}
            />
          ))}
        </View>
      </View>

      <Divider />

      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleTitle, { color: theme.text }]}>Available right now</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Hide vehicles that are already booked for these dates
          </Text>
        </View>
        <Switch
          value={filters.availableNow}
          onValueChange={(value) => onChange({ ...filters, availableNow: value })}
          trackColor={{ false: theme.lineStrong, true: theme.brand }}
          thumbColor="#ffffff"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  priceRow: { flexDirection: 'row', gap: Spacing.two },
  priceField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  pricePrefix: { fontSize: 15, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 15, fontWeight: '700', paddingVertical: 10 },
  hint: { fontSize: 12, lineHeight: 17 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 15, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reset: { paddingHorizontal: Spacing.three, paddingVertical: 14 },
  resetText: { fontSize: 15, fontWeight: '700' },
  apply: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: Radius.field,
  },
  applyText: { color: '#242424', fontSize: 15, fontWeight: '800' },
});
