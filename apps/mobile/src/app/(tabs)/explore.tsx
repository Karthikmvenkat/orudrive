import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MenuRow, Sheet } from '@/components/kit';
import { Chip, StateView } from '@/components/ui';
import { BottomTabInset, CardShadow, Radius, Spacing } from '@/constants/theme';
import { RideCard } from '@/features/catalogue/ride-card';
import {
  EMPTY_FILTERS,
  FiltersSheet,
  type ExploreFilters,
} from '@/features/catalogue/filters-sheet';
import { useVehicleList } from '@/features/search/use-vehicles';
import { useTheme } from '@/hooks/use-theme';
import { catalogueApi, type VehicleQuery } from '@/lib/api/endpoints';
import type { ApiCategory, ApiLocation, VehicleSort } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';

const SORTS: { value: VehicleSort; label: string }[] = [
  { value: 'popular', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest first' },
];

function ActiveChip({ text, onRemove }: { text: string; onRemove: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.activeChip, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
      <Text style={[styles.activeChipText, { color: theme.brandStrong }]} numberOfLines={1}>
        {text}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${text} filter`}
        onPress={onRemove}
        hitSlop={8}>
        <Ionicons name="close" size={14} color={theme.brandStrong} />
      </Pressable>
    </View>
  );
}

export default function ExploreScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ category?: string; location?: string }>();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [availableToday, setAvailableToday] = useState<number | null>(null);
  const [suggestedMaxPrice, setSuggestedMaxPrice] = useState<number | null>(null);
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [locationSlug, setLocationSlug] = useState<string | undefined>();
  const [sort, setSort] = useState<VehicleSort>('popular');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterSheet, setFilterSheet] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([catalogueApi.categories(), catalogueApi.locations(), catalogueApi.vehicles({ limit: 100 })])
      .then(([nextCategories, nextLocations, page]) => {
        if (!active) return;
        setCategories(nextCategories.filter((entry) => entry.isActive));
        setLocations(nextLocations.filter((entry) => entry.isActive));
        setBrands([...new Set(page.items.map((vehicle) => vehicle.brand))].sort((a, b) => a.localeCompare(b)));
        setAvailableToday(page.items.filter((vehicle) => vehicle.status === 'AVAILABLE').length);
        const prices = page.items.map((vehicle) => vehicle.pricePerDay).sort((a, b) => a - b);
        const upper = prices[Math.floor(prices.length * 0.75)] ?? null;
        setSuggestedMaxPrice(upper === null ? null : Math.round(upper / 50) * 50);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // The home tiles land here with a category or hub already chosen; the tab can
  // stay mounted, so the params have to be reapplied whenever they change.
  useEffect(() => {
    const raw = typeof params.category === 'string' ? params.category : '';
    setFilters((current) => ({
      ...current,
      categories: raw ? raw.split(',').map((slug) => slug.trim()).filter(Boolean) : [],
    }));
  }, [params.category]);

  useEffect(() => {
    setLocationSlug(typeof params.location === 'string' && params.location ? params.location : undefined);
  }, [params.location]);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  const query = useMemo<VehicleQuery>(
    () => ({
      ...(search.trim() ? { q: search.trim() } : {}),
      ...(filters.categories.length ? { category: filters.categories.join(',') } : {}),
      ...(locationSlug ? { location: locationSlug } : {}),
      ...(filters.brand ? { brand: filters.brand } : {}),
      ...(filters.fuelType ? { fuelType: filters.fuelType } : {}),
      ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
      ...(filters.minRating !== undefined ? { minRating: filters.minRating } : {}),
      ...(filters.availableNow ? { availableNow: true } : {}),
      sort,
    }),
    [filters, locationSlug, search, sort],
  );

  const list = useVehicleList(query);

  function onSearchChange(next: string) {
    setSearchInput(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setSearch(next), 350);
  }

  function resetAll() {
    setFilters(EMPTY_FILTERS);
    setLocationSlug(undefined);
    setSearch('');
    setSearchInput('');
  }

  const categoryNames = filters.categories.map(
    (slug) => categories.find((entry) => entry.slug === slug)?.name ?? slug,
  );
  const locationName = locations.find((entry) => entry.slug === locationSlug)?.city;

  const activeChips: { key: string; text: string; onRemove: () => void }[] = [
    ...filters.categories.map((slug, index) => ({
      key: `category-${slug}`,
      text: categoryNames[index],
      onRemove: () =>
        setFilters((current) => ({
          ...current,
          categories: current.categories.filter((entry) => entry !== slug),
        })),
    })),
    ...(locationSlug
      ? [
          {
            key: 'location',
            text: locationName ?? locationSlug,
            onRemove: () => setLocationSlug(undefined),
          },
        ]
      : []),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? [
          {
            key: 'price',
            text:
              filters.minPrice !== undefined && filters.maxPrice !== undefined
                ? `${formatMoney(filters.minPrice)} – ${formatMoney(filters.maxPrice)}`
                : filters.minPrice !== undefined
                  ? `From ${formatMoney(filters.minPrice)}`
                  : `Under ${formatMoney(filters.maxPrice ?? 0)}`,
            onRemove: () => setFilters((current) => ({ ...current, minPrice: undefined, maxPrice: undefined })),
          },
        ]
      : []),
    ...(filters.brand
      ? [{ key: 'brand', text: filters.brand, onRemove: () => setFilters((current) => ({ ...current, brand: undefined })) }]
      : []),
    ...(filters.fuelType
      ? [
          {
            key: 'fuel',
            text: filters.fuelType.charAt(0) + filters.fuelType.slice(1).toLowerCase(),
            onRemove: () => setFilters((current) => ({ ...current, fuelType: undefined })),
          },
        ]
      : []),
    ...(filters.minRating !== undefined
      ? [
          {
            key: 'rating',
            text: `${filters.minRating}+ rating`,
            onRemove: () => setFilters((current) => ({ ...current, minRating: undefined })),
          },
        ]
      : []),
    ...(filters.availableNow
      ? [
          {
            key: 'available',
            text: 'Available now',
            onRemove: () => setFilters((current) => ({ ...current, availableNow: false })),
          },
        ]
      : []),
  ];

  const filterCount = activeChips.length;
  const singularNames = categoryNames.map((name) => name.replace(/s$/i, ''));
  const title = singularNames.length
    ? `${singularNames.join(' & ')} rentals`
    : `Rentals${locationName ? ` in ${locationName}` : ''}`;
  const total = list.meta?.total ?? 0;

  // The spec keeps a chip row on screen even before anything is filtered: the
  // unselected categories and one price suggestion, both of which apply for real.
  const suggestions: { key: string; text: string; onPress: () => void }[] = [
    ...categories
      .filter((category) => !filters.categories.includes(category.slug))
      .slice(0, 3)
      .map((category) => ({
        key: `suggested-${category.slug}`,
        text: category.name.replace(/s$/i, ''),
        onPress: () =>
          setFilters((current) => ({ ...current, categories: [...current.categories, category.slug] })),
      })),
    ...(suggestedMaxPrice !== null && filters.maxPrice === undefined
      ? [
          {
            key: 'suggested-price',
            text: `Under ${formatMoney(suggestedMaxPrice)}`,
            onPress: () => setFilters((current) => ({ ...current, maxPrice: suggestedMaxPrice })),
          },
        ]
      : []),
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.header}>
          <ThemedText type="title" numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.availableRow}>
            <View style={[styles.dot, { backgroundColor: theme.brand }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {availableToday === null
                ? 'Checking the fleet…'
                : `${availableToday} vehicles available today`}
            </ThemedText>
          </View>

          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: theme.backgroundElement, borderColor: theme.line },
              ]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput
                value={searchInput}
                onChangeText={onSearchChange}
                placeholder="Search Activa, Classic, i20…"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Search vehicles"
                returnKeyType="search"
                onSubmitEditing={() => setSearch(searchInput)}
                style={[styles.searchInput, { color: theme.text }]}
              />
              {searchInput ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              onPress={() => setFilterSheet(true)}
              style={({ pressed }) => [
                styles.filterButton,
                { backgroundColor: theme.hero, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Ionicons name="options-outline" size={20} color={theme.lime} />
              {filterCount > 0 ? (
                <View style={[styles.filterBadge, { backgroundColor: theme.lime }]}>
                  <Text style={[styles.filterBadgeText, { color: theme.limeOn }]}>{filterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {activeChips.length > 0 || suggestions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {activeChips.map((chip) => (
                <ActiveChip key={chip.key} text={chip.text} onRemove={chip.onRemove} />
              ))}
              {activeChips.length > 0 ? (
                <Pressable accessibilityRole="button" onPress={resetAll} hitSlop={8} style={styles.clearAll}>
                  <Text style={[styles.clearAllText, { color: theme.textSecondary }]}>Clear all</Text>
                </Pressable>
              ) : null}
              {activeChips.length === 0
                ? suggestions.map((entry) => (
                    <Chip key={entry.key} text={entry.text} onPress={entry.onPress} />
                  ))
                : null}
            </ScrollView>
          ) : null}

          <View style={styles.resultsHead}>
            <ThemedText type="small" themeColor="textSecondary">
              {list.status === 'loading'
                ? 'Finding rides…'
                : `${total} vehicle${total === 1 ? '' : 's'} found`}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSortSheet(true)}
              hitSlop={8}
              style={styles.sortButton}>
              <ThemedText type="smallBold">
                Sort: {SORTS.find((entry) => entry.value === sort)?.label ?? 'Recommended'}
              </ThemedText>
              <Ionicons name="chevron-down" size={14} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={list.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.listItem}>
              <RideCard
                vehicle={item}
                onPress={() => router.push({ pathname: '/vehicles/[slug]', params: { slug: item.slug } })}
              />
              {index === 1 ? (
                <View style={[styles.delivery, CardShadow, { backgroundColor: theme.brandSoft }]}>
                  <View style={[styles.deliveryIcon, { backgroundColor: theme.brand }]}>
                    <Ionicons name="cube-outline" size={18} color="#ffffff" />
                  </View>
                  <View style={styles.deliveryText}>
                    <ThemedText type="smallBold" style={{ color: theme.brandStrong }}>
                      Need it delivered?
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Doorstep delivery in {item.location.city} can be added at checkout — the hub confirms the slot
                      for your dates.
                    </ThemedText>
                  </View>
                </View>
              ) : null}
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            list.status === 'loading' ? (
              <StateView state="loading" />
            ) : list.status === 'error' ? (
              <StateView state="error" message={list.error} onRetry={list.refresh} />
            ) : (
              <StateView state="empty" message="No vehicles match these filters yet. Widen the price or clear a chip." />
            )
          }
          ListFooterComponent={
            list.items.length > 0 ? (
              <View style={styles.footerNote}>
                {list.status === 'paginating' ? (
                  <StateView state="loading" />
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Showing {list.items.length} of {total} vehicles
                  </ThemedText>
                )}
              </View>
            ) : undefined
          }
        />
      </SafeAreaView>

      <FiltersSheet
        visible={filterSheet}
        onClose={() => setFilterSheet(false)}
        filters={filters}
        onChange={setFilters}
        onReset={resetAll}
        categories={categories}
        brands={brands}
        resultCount={total}
      />

      <Sheet visible={sortSheet} onClose={() => setSortSheet(false)} title="Sort rides">
        {SORTS.map((entry, index) => (
          <MenuRow
            key={entry.value}
            icon="swap-vertical-outline"
            label={entry.label}
            meta={sort === entry.value ? 'Selected' : undefined}
            last={index === SORTS.length - 1}
            onPress={() => {
              setSort(entry.value);
              setSortSheet(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
  availableRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  searchRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    minHeight: 50,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 10 },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: Radius.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: { fontSize: 11, fontWeight: '800' },
  chipRow: { gap: Spacing.two, paddingVertical: 2, alignItems: 'center' },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
  },
  activeChipText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  clearAll: { paddingHorizontal: 4 },
  clearAllText: { fontSize: 13, fontWeight: '700' },
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.three },
  listItem: { gap: Spacing.three },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.tile, padding: Spacing.three },
  deliveryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deliveryText: { flex: 1, gap: 2 },
  footerNote: { alignItems: 'center', paddingVertical: Spacing.two },
});
