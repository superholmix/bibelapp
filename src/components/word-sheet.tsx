import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExplainWordPanel } from '@/components/live-ai';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { formatRef, getLexiconEntry, type Word } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { glossFor, LANGUAGE_LABEL } from '@/lib/gloss';
import { describeMorph } from '@/lib/grammar';
import { useSettings } from '@/state/settings';

type Props = {
  word: Word | null;
  /** Position des Wortes im Vers, für die deutschen Wortbedeutungen */
  index: number;
  chapter: number;
  verse: number;
  onClose: () => void;
  onOpenAccount: () => void;
};

/** Zweite Ebene: ein Wort mit Bedeutung, Grammatik in Alltagssprache und Lexikon. */
export function WordSheet({ word, index, chapter, verse, onClose, onOpenAccount }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const [showLexicon, setShowLexicon] = useState(false);

  if (!word) return null;
  const gloss = glossFor(word, index, chapter, verse, settings.glossLanguage);

  return (
    <Sheet
      visible
      onClose={() => {
        setShowLexicon(false);
        onClose();
      }}
      header={
        <View>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatRef(chapter, verse).toUpperCase()}
          </ThemedText>
          <ThemedText type="greek" style={styles.bigGreek}>
            {word.g}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.italic}>
            {word.tr}
          </ThemedText>
        </View>
      }>
      <View style={[styles.card, { backgroundColor: theme.accentSoft }]}>
        <ThemedText type="caption" themeColor="textSecondary">
          HIER ÜBERSETZT ({LANGUAGE_LABEL[gloss.language].toUpperCase()})
        </ThemedText>
        <ThemedText type="heading">{gloss.text || '–'}</ThemedText>
        {gloss.silent ? (
          <ThemedText type="small" themeColor="textSecondary">
            Steht im Griechischen, wird im Deutschen aber meist nicht eigens übersetzt.
          </ThemedText>
        ) : null}
        {settings.glossLanguage === 'de' && gloss.language !== 'de' ? (
          <ThemedText type="small" themeColor="textSecondary">
            Deutsche Wortbedeutungen kommen mit der KI-Studienübersetzung.
          </ThemedText>
        ) : null}
      </View>

      {word.s.map((strong, i) => {
        const entry = getLexiconEntry(strong);
        const grammar = describeMorph(word.m[i] ?? '');
        return (
          <View key={strong + i} style={styles.section}>
            <View style={styles.lemmaRow}>
              <ThemedText type="caption" themeColor="textSecondary">
                GRUNDFORM
              </ThemedText>
              <ThemedText type="greek">{entry?.lemma ?? word.l}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {entry?.tr ? `${entry.tr} · ` : ''}
                {entry?.gloss ?? word.gl}
                {entry?.n ? ` · ${entry.n}× in Markus` : ''}
              </ThemedText>
            </View>

            <View style={[styles.grammar, { borderColor: theme.border }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                GRAMMATIK
              </ThemedText>
              {grammar.rows.map((row) => (
                <View key={row.label} style={styles.grammarRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.grammarLabel}>
                    {row.label}
                  </ThemedText>
                  <View style={styles.grammarValue}>
                    <ThemedText type="smallBold">{row.value}</ThemedText>
                    {row.explain ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {row.explain}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            {entry?.def ? (
              <View>
                <Pressable onPress={() => setShowLexicon((s) => !s)} accessibilityRole="button">
                  <ThemedText type="link">
                    {showLexicon ? 'Lexikon ausblenden' : 'Lexikon-Eintrag zeigen (englisch, Abbott-Smith)'}
                  </ThemedText>
                </Pressable>
                {showLexicon ? (
                  <ThemedText type="small" style={styles.lexicon}>
                    {entry.def}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <ExplainWordPanel chapter={chapter} verse={verse} index={index} onOpenAccount={onOpenAccount} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bigGreek: {
    fontSize: 32,
    lineHeight: 42,
  },
  italic: {
    fontStyle: 'italic',
  },
  card: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  lemmaRow: {
    gap: Spacing.half,
  },
  grammar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  grammarRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  grammarLabel: {
    width: 120,
  },
  grammarValue: {
    flex: 1,
    gap: Spacing.half,
  },
  lexicon: {
    marginTop: Spacing.two,
  },
});
