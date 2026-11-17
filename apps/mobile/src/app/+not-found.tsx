import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <Screen tabBarSpace={false}>
      <View style={styles.body}>
        <ThemedText type="heading">That page is not here</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          The link may be from an older build of SavariGo.
        </ThemedText>
        <Link href="/" replace>
          <ThemedText type="link">Back to search</ThemedText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
});
