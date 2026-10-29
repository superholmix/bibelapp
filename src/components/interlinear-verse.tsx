import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Verse, Word } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { glossFor } from '@/lib/gloss';
import { describeMorph } from '@/lib/grammar';
import type { Settings } from '@/state/settings';

type Props = {
  chapter: number;
  verse: Verse;
  settings: Settings;
  onWordPress: (word: Word, index: number) => void;
};

function InterlinearVerseImpl({ chapter, verse, settings, onWordPress }: Props) {
  const theme = useTheme();
  const kindColor = { verb: theme.verb, noun: theme.noun, function: theme.function, other: theme.textSecondary };

  return (
    <View style={styles.words}>
      {verse.words.map((word, i) => {
        const grammar = describeMorph(word.m[0] ?? '');
        const gloss = glossFor(word, i, chapter, verse.v, settings.glossLanguage);
        return (
          <Pressable
            key={i}
            onPress={() => onWordPress(word, i)}
            style={({ pressed }) => [styles.word, pressed && { backgroundColor: theme.backgroundSelected }]}
            accessibilityRole="button"
            accessibilityLabel={`${word.g}, ${gloss.text}, ${grammar.summary}`}>
            <ThemedText type="greek" style={[styles.greek, { borderBottomColor: kindColor[grammar.kind] }]}>
              {word.g}
            </ThemedText>
            {settings.showTranslit ? (
              <ThemedText type="caption" themeColor="textSecondary" style={styles.translit} scale>
                {word.tr}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor={gloss.silent ? 'textSecondary' : 'text'} style={gloss.silent && styles.silent} scale>
              {gloss.text}
            </ThemedText>
            {settings.showGrammar ? (
              <ThemedText type="caption" style={{ color: kindColor[grammar.kind] }} scale>
                {grammar.short}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const InterlinearVerse = memo(InterlinearVerseImpl);

const styles = StyleSheet.create({
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.one,
    rowGap: Spacing.three,
  },
  word: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    maxWidth: 160,
    gap: 1,
  },
  greek: {
    alignSelf: 'flex-start',
    borderBottomWidth: 2,
    paddingBottom: 1,
  },
  translit: {
    fontStyle: 'italic',
    letterSpacing: 0,
  },
  silent: {
    fontStyle: 'italic',
  },
});
