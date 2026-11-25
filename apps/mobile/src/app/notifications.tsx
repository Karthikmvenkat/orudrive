import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen, StateView } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationApi } from '@/lib/api/endpoints';
import type { ApiNotification } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { useAsyncList } from '@/lib/use-async';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const inbox = useAsyncList<ApiNotification>(async () => {
    const page = await notificationApi.list({ limit: 50 });
    return page.items;
  });

  if (inbox.status === 'loading') {
    return (
      <Screen tabBarSpace={false}>
        <PageHeader
          title="Notifications"
          subtitle="Booking updates and reminders"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
        <StateView state="loading" />
      </Screen>
    );
  }

  if (inbox.status === 'error') {
    return (
      <Screen tabBarSpace={false}>
        <PageHeader
          title="Notifications"
          subtitle="Booking updates and reminders"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
        <StateView state="error" message={inbox.error} onRetry={inbox.reload} />
      </Screen>
    );
  }

  const unread = inbox.items.filter((entry) => !entry.isRead);

  const markOne = async (notification: ApiNotification) => {
    if (notification.isRead) return;
    await notificationApi.markRead(notification.id).catch(() => undefined);
    inbox.reload();
  };

  return (
    <Screen tabBarSpace={false}>
      <PageHeader
        title="Notifications"
        subtitle="Booking updates and reminders"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <View style={styles.head}>
        <ThemedText type="subtitle">
          {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
        </ThemedText>
        {unread.length > 0 ? (
          <Button
            title="Mark all read"
            variant="ghost"
            style={styles.markAll}
            onPress={async () => {
              await notificationApi.markAllRead().catch(() => undefined);
              inbox.reload();
            }}
          />
        ) : null}
      </View>

      {inbox.items.length === 0 ? (
        <StateView
          state="empty"
          message="Booking updates from SavariGo land here. Turn on notifications to get them on this device."
        />
      ) : (
        inbox.items.map((notification) => (
          <Card key={notification.id} onPress={() => markOne(notification)}>
            <View style={styles.row}>
              <ThemedText type="subtitle" style={styles.title}>
                {notification.title}
              </ThemedText>
              {!notification.isRead ? <Badge text="new" tone="brand" /> : null}
            </View>
            <ThemedText type="body" themeColor="textSecondary">
              {notification.body}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDateTime(notification.createdAt)}
            </ThemedText>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  markAll: { minHeight: 36, paddingVertical: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
});
