import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatRef } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useNotes } from '@/state/notes';

export default function NotesScreen() {
  const theme = useTheme();
  const { sorted } = useNotes();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={sorted}
          keyExtractor={(n) => n.key}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title">Notizen</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {sorted.length === 1 ? '1 Notiz' : `${sorted.length} Notizen`} · vorerst nur auf diesem Gerät gespeichert
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">Noch keine Notizen</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tippe beim Lesen auf einen Vers und dann auf „Notiz schreiben“.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.navigate({ pathname: '/', params: { chapter: String(item.chapter), verse: String(item.verse) } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border },
              ]}
              accessibilityRole="button">
              <ThemedText type="smallBold" themeColor="accent">
                {formatRef(item.chapter, item.verse)}
              </ThemedText>
              <ThemedText type="default" numberOfLines={4}>
                {item.text}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {new Date(item.updatedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </ThemedText>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.four,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
