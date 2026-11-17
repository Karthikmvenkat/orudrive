import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider, useSession } from '@/lib/session/context';
import { FavoritesProvider } from '@/lib/favorites';
import { RentalWindowProvider } from '@/features/search/window-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useSession();

  useEffect(() => {
    // Holding the splash until the stored session has been checked means a
    // signed-in customer never sees the search screen flash before the guard
    // sends them to the right place.
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 17, fontWeight: '700' },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="vehicles/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="checkout/[vehicleId]" options={{ headerShown: false }} />
      <Stack.Screen name="booking/[code]" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ title: 'Change password' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="details" options={{ headerShown: false }} />
      <Stack.Screen name="licence" options={{ headerShown: false }} />
      <Stack.Screen name="saved" options={{ headerShown: false }} />
      <Stack.Screen name="payments" options={{ headerShown: false }} />
      <Stack.Screen name="offers" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <FavoritesProvider>
          <RentalWindowProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </RentalWindowProvider>
        </FavoritesProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
