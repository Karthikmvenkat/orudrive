import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * React Native's colour union is wider than an icon font can take. The tab bar
 * only ever hands back the plain strings set on `tabBar*TintColor` below.
 */
function cssColor(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  function icon(
    name: keyof typeof Ionicons.glyphMap,
    color: unknown,
  ) {
    return <Ionicons name={name} size={22} color={cssColor(color, theme.textSecondary)} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentGold,
        tabBarInactiveTintColor: theme.text,
        tabBarLabelStyle: styles.label,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Math.max(insets.bottom, 10),
          height: 66,
          borderRadius: 26,
          backgroundColor: theme.backgroundElement,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 10,
          shadowColor: '#242424',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => icon(focused ? 'home' : 'home-outline', color),
        }}
      />
      {/* Explore stays routable from the home tiles and "View all" links, but
          the mockup's tab bar is Home / My Bookings / Wallet / Profile.
          `href: null` would mark the tab hidden, and this router version
          immediately redirects a focused hidden tab back to Home — which made
          every home tile look dead. Hiding the item with style keeps it a
          normal, reachable tab that just has no button. */}
      <Tabs.Screen name="explore" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ color, focused }) =>
            icon(focused ? 'calendar' : 'calendar-outline', color),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) =>
            icon(focused ? 'wallet' : 'wallet-outline', color),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) =>
            icon(focused ? 'person' : 'person-outline', color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700' },
});
