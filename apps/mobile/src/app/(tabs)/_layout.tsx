import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
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

  function icon(
    name: keyof typeof Ionicons.glyphMap,
    focused: boolean,
    color: unknown,
  ) {
    return (
      <View style={[styles.pill, focused && { backgroundColor: theme.brandSoft }]}>
        <Ionicons name={name} size={21} color={cssColor(color, theme.textSecondary)} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => icon(focused ? 'home' : 'home-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) =>
            icon(focused ? 'compass' : 'compass-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) =>
            icon(focused ? 'ticket' : 'ticket-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) =>
            icon(focused ? 'person' : 'person-outline', focused, color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 54,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: { fontSize: 11, fontWeight: '700' },
});
