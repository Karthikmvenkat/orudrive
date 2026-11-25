import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { SERVICE_PAGES, type ServiceSlug } from '@/features/services/content';
import { useTheme } from '@/hooks/use-theme';
import { catalogueApi } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/format';
import { useAsyncList } from '@/lib/use-async';

const SUPPORT_EMAIL = 'support@savarigo.com';

const HERO_ICON: Record<ServiceSlug, keyof typeof Ionicons.glyphMap> = {
  puncture: 'flash',
  tow: 'construct',
  driver: 'person',
};

export default function ServiceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug: string }>();
  const locations = useAsyncList(() => catalogueApi.locations());
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const slug = params.slug as ServiceSlug;
  const page = SERVICE_PAGES[slug] ?? null;

  if (!page) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <PageHeader title="Services" onBack={() => router.back()} />
          </View>
          <View style={styles.missing}>
            <ThemedText type="body">This service is not available in the app yet.</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const phone = locations.items.find((entry) => entry.isActive && entry.phone)?.phone ?? null;
  const digits = phone ? phone.replace(/\D/g, '') : null;

  const call = () => {
    if (digits) void Linking.openURL(`tel:+${digits}`);
  };
  const whatsapp = () => {
    if (digits) {
      void Linking.openURL(
        `https://wa.me/${digits}?text=${encodeURIComponent(page.whatsappText)}`,
      );
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.header}>
          <PageHeader title={page.name} subtitle={page.eyebrow} onBack={() => router.back()} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, CardShadow]}>
            <LinearGradient
              colors={['#3a3a3a', '#1d1d1d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons
              name={HERO_ICON[page.slug]}
              size={150}
              color="rgba(255,196,0,0.16)"
              style={styles.heroWatermark}
            />
            <ThemedText type="display" style={styles.heroTitle}>
              {page.headline}
            </ThemedText>
            <ThemedText type="small" style={styles.heroIntro}>
              {page.intro}
            </ThemedText>
          </View>

          {page.highlights ? (
            <View style={styles.grid}>
              {page.highlights.map((item) => (
                <View
                  key={item.title}
                  style={[
                    styles.gridCard,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.line },
                  ]}>
                  <View style={[styles.gridIcon, { backgroundColor: theme.serviceSoft }]}>
                    <Ionicons name={item.icon} size={16} color={theme.service} />
                  </View>
                  <ThemedText type="smallBold">{item.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.detail}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {page.rates ? (
            <View style={styles.block}>
              <ThemedText type="heading">{page.rates.title}</ThemedText>
              <View
                style={[
                  styles.rateCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.line },
                ]}>
                {page.rates.rows.map((rate, index) => (
                  <View
                    key={rate.label}
                    style={[
                      styles.rateRow,
                      index > 0 && { borderTopWidth: 1, borderTopColor: theme.line },
                    ]}>
                    <View style={styles.rateText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {rate.label}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {rate.note}
                      </ThemedText>
                    </View>
                    <ThemedText type="price" style={{ color: theme.serviceStrong }}>
                      {formatMoney(rate.price)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {page.plans ? (
            <View style={styles.block}>
              <ThemedText type="heading">Plans & pricing</ThemedText>
              {page.plans.map((plan) => (
                <View
                  key={plan.name}
                  style={[
                    styles.plan,
                    {
                      backgroundColor: plan.popular ? theme.serviceSoft : theme.backgroundElement,
                      borderColor: plan.popular ? theme.service : theme.line,
                    },
                  ]}>
                  <View style={styles.planHead}>
                    <ThemedText type="smallBold" style={{ color: theme.serviceStrong }}>
                      {plan.name}
                    </ThemedText>
                    {plan.popular ? (
                      <View style={[styles.tag, { backgroundColor: theme.service }]}>
                        <ThemedText type="small" style={styles.tagText}>
                          Most booked
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.planPriceRow}>
                    <ThemedText type="display" style={{ color: theme.hero }}>
                      {formatMoney(plan.price)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      / {plan.unit}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {plan.minimum}
                  </ThemedText>
                  <View style={[styles.perks, { borderTopColor: theme.line }]}>
                    {plan.perks.map((perk) => (
                      <View key={perk} style={styles.perk}>
                        <Ionicons name="checkmark-circle" size={13} color={theme.service} />
                        <ThemedText type="small">{perk}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {page.included ? (
            <View style={styles.block}>
              <ThemedText type="heading">What you get</ThemedText>
              <View style={styles.included}>
                {page.included.map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.includedRow,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.line },
                    ]}>
                    <Ionicons name={item.icon} size={15} color={theme.service} />
                    <ThemedText type="small" style={styles.includedLabel}>
                      {item.label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.block}>
            <ThemedText type="heading">How it works</ThemedText>
            <View style={styles.steps}>
              {page.steps.map((step, index) => (
                <View key={step.title} style={styles.step}>
                  <View style={[styles.stepNumber, { borderColor: theme.line, backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="smallBold" style={{ color: theme.service }}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.stepText}>
                    <ThemedText type="smallBold">{step.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {step.detail}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {page.faqs ? (
            <View style={styles.block}>
              <ThemedText type="heading">Towing FAQs</ThemedText>
              <View
                style={[
                  styles.faqCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.line },
                ]}>
                {page.faqs.map((faq, index) => {
                  const open = openFaq === index;
                  return (
                    <View
                      key={faq.question}
                      style={[
                        styles.faqRow,
                        index > 0 && { borderTopWidth: 1, borderTopColor: theme.line },
                      ]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        onPress={() => setOpenFaq(open ? null : index)}
                        style={styles.faqHead}>
                        <ThemedText type="smallBold" style={styles.faqQuestion}>
                          {faq.question}
                        </ThemedText>
                        <Ionicons
                          name={open ? 'remove' : 'add'}
                          size={16}
                          color={theme.service}
                        />
                      </Pressable>
                      {open ? (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.faqAnswer}>
                          {faq.answer}
                        </ThemedText>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {page.note ? (
            <View style={[styles.note, { backgroundColor: theme.serviceSoft }]}>
              <Ionicons name="information-circle" size={16} color={theme.serviceStrong} />
              <ThemedText type="small" style={[styles.noteText, { color: theme.serviceStrong }]}>
                {page.note}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.bar,
            {
              borderTopColor: theme.line,
              backgroundColor: theme.backgroundElement,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}>
          {digits ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Message support on WhatsApp"
                onPress={whatsapp}
                style={({ pressed }) => [
                  styles.chat,
                  { borderColor: theme.lineStrong, opacity: pressed ? 0.88 : 1 },
                ]}>
                <Ionicons name="logo-whatsapp" size={21} color={theme.service} />
              </Pressable>
              <Button
                title={page.callLabel}
                onPress={call}
                variant="service"
                style={styles.callButton}
                icon={<Ionicons name="call" size={16} color={theme.serviceOn} />}
              />
            </>
          ) : (
            <Button
              title="Email support"
              variant="secondary"
              onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              style={styles.callButton}
              icon={<Ionicons name="mail-outline" size={16} color={theme.text} />}
            />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  missing: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four },
  scroll: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.three },
  hero: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    padding: Spacing.four,
    gap: Spacing.two,
    minHeight: 190,
    justifyContent: 'flex-end',
  },
  heroWatermark: { position: 'absolute', right: -14, top: -18 },
  heroTitle: { color: '#ffffff', fontSize: 27, lineHeight: 33 },
  heroIntro: { color: 'rgba(255,255,255,0.78)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.tile,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 5,
  },
  gridIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  block: { gap: Spacing.two },
  rateCard: { borderRadius: Radius.card, borderWidth: 1, paddingHorizontal: Spacing.three },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 11,
  },
  rateText: { flex: 1, gap: 1 },
  plan: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three, gap: 4 },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  tag: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { color: '#ffffff', fontSize: 10, lineHeight: 13, fontWeight: '800' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  perks: { borderTopWidth: 1, paddingTop: Spacing.two, marginTop: Spacing.two, gap: 6 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  included: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  includedRow: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: Radius.field,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  includedLabel: { flexShrink: 1 },
  steps: { gap: Spacing.two },
  step: { flexDirection: 'row', gap: Spacing.two },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
  faqCard: { borderRadius: Radius.card, borderWidth: 1, paddingHorizontal: Spacing.three },
  faqRow: { paddingVertical: 11 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  faqQuestion: { flex: 1 },
  faqAnswer: { marginTop: 6 },
  note: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radius.tile,
    padding: Spacing.three,
  },
  noteText: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  chat: {
    width: 48,
    height: 48,
    borderRadius: Radius.field,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: { flex: 1, gap: 8 },
});
