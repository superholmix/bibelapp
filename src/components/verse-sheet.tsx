import { Pressable, StyleSheet, View } from 'react-native';

import { InterlinearVerse } from '@/components/interlinear-verse';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { COMPARE_TRANSLATIONS, formatRef, verseKey, type CompareId, type Verse, type Word } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useNotes } from '@/state/notes';
import { useSettings } from '@/state/settings';

type Props = {
  chapter: number;
  verse: Verse | null;
  mainText: string;
  onClose: () => void;
  onWordPress: (word: Word) => void;
  onNotePress: () => void;
};

/** Zweite Ebene beim Lesen: ein Vers im Urtext, im Vergleich und mit Notiz. */
export function VerseSheet({ chapter, verse, mainText, onClose, onWordPress, onNotePress }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { getNote } = useNotes();
  if (!verse) return null;
  const note = getNote(verseKey(chapter, verse.v));

  return (
    <Sheet visible onClose={onClose} title={formatRef(chapter, verse.v)}>
      <ThemedText type="scripture">{mainText}</ThemedText>

      <View style={styles.block}>
        <ThemedText type="caption" themeColor="textSecondary">
          URTEXT · WORT ANTIPPEN FÜR DETAILS
        </ThemedText>
        <InterlinearVerse verse={verse} settings={settings} onWordPress={onWordPress} />
      </View>

      <View style={styles.block}>
        <ThemedText type="caption" themeColor="textSecondary">
          VERGLEICH
        </ThemedText>
        {(Object.keys(COMPARE_TRANSLATIONS) as CompareId[]).map((id) =>
          verse.cmp[id] ? (
            <View key={id} style={styles.compareRow}>
              <ThemedText type="caption" themeColor="accent" style={styles.compareLabel}>
                {COMPARE_TRANSLATIONS[id].short}
              </ThemedText>
              <ThemedText type="small" style={styles.compareText}>
                {verse.cmp[id]}
              </ThemedText>
            </View>
          ) : null,
        )}
      </View>

      <Pressable
        onPress={onNotePress}
        style={[styles.noteButton, { borderColor: theme.border, backgroundColor: theme.background }]}
        accessibilityRole="button">
        <ThemedText type="smallBold">{note ? 'Notiz bearbeiten' : 'Notiz schreiben'}</ThemedText>
        {note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {note.text}
          </ThemedText>
        ) : null}
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  compareRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  compareLabel: {
    width: 32,
    paddingTop: 3,
  },
  compareText: {
    flex: 1,
  },
  noteButton: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
