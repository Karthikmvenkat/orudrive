import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: undefined,
        contentStyle: { paddingHorizontal: 0 },
      }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="verify" options={{ headerShown: false }} />
      <Stack.Screen name="email" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
    </Stack>
  );
}
