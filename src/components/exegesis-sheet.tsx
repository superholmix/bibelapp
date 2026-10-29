import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { formatRef, type ExegesisTopic } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useEntitlement } from '@/state/entitlement';

type Props = {
  topic: ExegesisTopic | null;
  onClose: () => void;
  onOpenAccount: () => void;
};

function rangeLabel(t: ExegesisTopic) {
  return t.from === t.to ? formatRef(t.chapter, t.from) : `${formatRef(t.chapter, t.from)}–${t.to}`;
}

/** Dritte Ebene: Auslegungspositionen zu einer Streitstelle, ohne Urteil der App. */
export function ExegesisSheet({ topic, onClose, onOpenAccount }: Props) {
  const theme = useTheme();
  const { active } = useEntitlement();
  if (!topic) return null;

  return (
    <Sheet
      visible
      onClose={onClose}
      header={
        <View style={styles.headerText}>
          <ThemedText type="caption" themeColor="textSecondary">
            AUSLEGUNGEN · {rangeLabel(topic).toUpperCase()}
          </ThemedText>
          <ThemedText type="heading">{topic.title}</ThemedText>
        </View>
      }>
      {!active ? (
        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Auslegungsüberblicke gehören zum Abo.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mit dem Abo siehst du zu jeder Streitstelle die Positionen der Forschung, ihre Argumente und Literatur.
          </ThemedText>
          <Pressable onPress={onOpenAccount} accessibilityRole="button">
            <ThemedText type="link">Abo ansehen</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.notice, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="small">
              {topic.reviewed
                ? 'Fachlich geprüft.'
                : 'KI-Entwurf, noch nicht fachlich geprüft. Literaturangaben bitte vor dem Zitieren nachschlagen.'}
            </ThemedText>
          </View>

          <View style={styles.block}>
            <ThemedText type="smallBold">{topic.question}</ThemedText>
            <ThemedText type="default">{topic.summary}</ThemedText>
          </View>

          {topic.hinges.length ? (
            <View style={styles.block}>
              <ThemedText type="caption" themeColor="textSecondary">
                WORAN ES HÄNGT
              </ThemedText>
              {topic.hinges.map((h, i) => (
                <ThemedText key={i} type="small">
                  • {h}
                </ThemedText>
              ))}
            </View>
          ) : null}

          <ThemedText type="caption" themeColor="textSecondary">
            POSITIONEN
          </ThemedText>
          {topic.positions.map((p, i) => (
            <View key={i} style={[styles.position, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.positionHead}>
                <ThemedText type="heading" style={styles.positionName}>
                  {p.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="accent">
                  {p.standing}
                </ThemedText>
              </View>
              <ThemedText type="default">{p.claim}</ThemedText>
              {p.arguments.map((a, j) => (
                <ThemedText key={j} type="small">
                  • {a}
                </ThemedText>
              ))}
              <ThemedText type="small" themeColor="textSecondary">
                Am Text: {p.textBasis}
              </ThemedText>
              {p.proponents.length ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Vertreten u. a. von: {p.proponents.join(', ')}
                </ThemedText>
              ) : null}
              {p.literature.length ? (
                <View style={styles.literature}>
                  {p.literature.map((l, j) => (
                    <ThemedText key={j} type="caption" themeColor="textSecondary">
                      {l.author}, {l.title} ({l.year}){l.sure ? '' : ' · unsicher'}
                    </ThemedText>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headerText: {
    gap: Spacing.half,
  },
  card: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  notice: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  block: {
    gap: Spacing.two,
  },
  position: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  positionHead: {
    gap: Spacing.half,
  },
  positionName: {
    flexShrink: 1,
  },
  literature: {
    gap: Spacing.half,
    marginTop: Spacing.one,
  },
});
