import { Pressable, StyleSheet, View } from 'react-native';

import { InterlinearVerse } from '@/components/interlinear-verse';
import { AskTextPanel } from '@/components/live-ai';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  COMPARE_TRANSLATIONS,
  formatRef,
  getStudyVerse,
  getTopicsForVerse,
  verseKey,
  type CompareId,
  type ExegesisTopic,
  type Verse,
  type Word,
} from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useNotes } from '@/state/notes';
import { useSettings } from '@/state/settings';

type Props = {
  chapter: number;
  verse: Verse | null;
  mainText: string;
  onClose: () => void;
  onWordPress: (word: Word, index: number) => void;
  onNotePress: () => void;
  onTopicPress: (topic: ExegesisTopic) => void;
  onOpenAccount: () => void;
};

/** Zweite Ebene beim Lesen: ein Vers im Urtext, im Vergleich, mit Fußnoten, Auslegungen und Notiz. */
export function VerseSheet({ chapter, verse, mainText, onClose, onWordPress, onNotePress, onTopicPress, onOpenAccount }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { getNote } = useNotes();
  if (!verse) return null;
  const note = getNote(verseKey(chapter, verse.v));
  const footnotes = getStudyVerse(chapter, verse.v)?.notes ?? [];
  const topics = getTopicsForVerse(chapter, verse.v);

  return (
    <Sheet visible onClose={onClose} title={formatRef(chapter, verse.v)}>
      <ThemedText type="scripture">{mainText}</ThemedText>

      {footnotes.length ? (
        <View style={styles.block}>
          {footnotes.map((n, i) => (
            <ThemedText key={i} type="small" themeColor="textSecondary">
              <ThemedText type="smallBold" themeColor="accent">
                {n.anchor}:{' '}
              </ThemedText>
              {n.text}
            </ThemedText>
          ))}
        </View>
      ) : null}

      {topics.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onTopicPress(t)}
          style={[styles.topic, { backgroundColor: theme.accentSoft }]}
          accessibilityRole="button">
          <ThemedText type="caption" themeColor="accent">
            AUSLEGUNGEN · {t.positions.length} POSITIONEN
          </ThemedText>
          <ThemedText type="smallBold">{t.title}</ThemedText>
        </Pressable>
      ))}

      <View style={styles.block}>
        <ThemedText type="caption" themeColor="textSecondary">
          URTEXT · WORT ANTIPPEN FÜR DETAILS
        </ThemedText>
        <InterlinearVerse chapter={chapter} verse={verse} settings={settings} onWordPress={onWordPress} />
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

      <AskTextPanel chapter={chapter} verse={verse.v} onOpenAccount={onOpenAccount} />

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
  topic: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.half,
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
