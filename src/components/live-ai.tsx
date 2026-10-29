import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { askQuestion, cachedWordExplanation, explainWord } from '@/lib/ai';
import { CloudError } from '@/lib/cloud';
import { useAuth } from '@/state/auth';
import { useEntitlement } from '@/state/entitlement';

type Gate = {
  /** Schließt das Blatt und öffnet Konto und Abo unter „Mehr“ */
  onOpenAccount: () => void;
};

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'answer'; text: string; note?: string } | { kind: 'error'; error: CloudError };

function toCloudError(err: unknown) {
  return err instanceof CloudError ? err : new CloudError('network', 'Keine Verbindung zum Backend. Bist du online?');
}

/** Zeigt, warum Live-Funktionen gerade nicht gehen, oder null, wenn sie gehen. */
function useGate() {
  const auth = useAuth();
  const ent = useEntitlement();
  if (!auth.available) return { reason: 'Live-Fragen brauchen das Backend. Es ist in diesem Testlauf noch nicht eingerichtet.', action: null };
  if (!auth.user) return { reason: 'Für Live-Fragen brauchst du ein Konto.', action: 'Anmelden' };
  if (!ent.active || ent.source === 'simulated') {
    // Der Testschalter schaltet nur Inhalte auf dem Gerät frei; das Backend prüft das echte Abo
    return { reason: 'Live-Fragen gehören zum Abo.', action: 'Abo ansehen' };
  }
  return null;
}

function GateBox({ reason, action, onOpenAccount }: { reason: string; action: string | null } & Gate) {
  const theme = useTheme();
  return (
    <View style={[styles.locked, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {reason}
      </ThemedText>
      {action ? (
        <Pressable onPress={onOpenAccount} accessibilityRole="button">
          <ThemedText type="link">{action}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function AnswerBox({ status, onOpenAccount }: { status: Status } & Gate) {
  const theme = useTheme();
  if (status.kind === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText type="small" themeColor="textSecondary">
          Die KI liest den Urtext …
        </ThemedText>
      </View>
    );
  }
  if (status.kind === 'error') {
    const toAccount = status.error.code === 'abo' || status.error.code === 'auth';
    return (
      <View style={styles.answer}>
        <ThemedText type="small" themeColor="textSecondary">
          {status.error.message}
        </ThemedText>
        {toAccount ? (
          <Pressable onPress={onOpenAccount} accessibilityRole="button">
            <ThemedText type="link">Konto und Abo</ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (status.kind === 'answer') {
    return (
      <View style={[styles.answer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <ThemedText type="default">{status.text}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          KI-Antwort, kann Fehler enthalten.{status.note ? ` ${status.note}` : ''}
        </ThemedText>
      </View>
    );
  }
  return null;
}

/** Wort-Blatt: „Was ändert diese Form am Sinn?“ */
export function ExplainWordPanel({ chapter, verse, index, onOpenAccount }: { chapter: number; verse: number; index: number } & Gate) {
  const theme = useTheme();
  const gate = useGate();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    let alive = true;
    setStatus({ kind: 'idle' });
    cachedWordExplanation(chapter, verse, index).then((hit) => {
      if (alive && hit) setStatus({ kind: 'answer', text: hit.answer });
    });
    return () => {
      alive = false;
    };
  }, [chapter, verse, index]);

  const run = async () => {
    setStatus({ kind: 'loading' });
    try {
      const result = await explainWord(chapter, verse, index);
      setStatus({ kind: 'answer', text: result.answer });
    } catch (err) {
      setStatus({ kind: 'error', error: toCloudError(err) });
    }
  };

  return (
    <View style={styles.block}>
      <ThemedText type="caption" themeColor="textSecondary">
        KI-ERKLÄRUNG
      </ThemedText>
      {status.kind === 'answer' ? null : gate ? (
        <GateBox {...gate} onOpenAccount={onOpenAccount} />
      ) : status.kind === 'idle' ? (
        <Pressable onPress={run} style={[styles.button, { backgroundColor: theme.accent }]} accessibilityRole="button">
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            Was ändert diese Form am Sinn?
          </ThemedText>
        </Pressable>
      ) : null}
      <AnswerBox status={status} onOpenAccount={onOpenAccount} />
    </View>
  );
}

/** Vers-Blatt: eigene Frage an den Text */
export function AskTextPanel({ chapter, verse, onOpenAccount }: { chapter: number; verse: number } & Gate) {
  const theme = useTheme();
  const gate = useGate();
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    setQuestion('');
    setStatus({ kind: 'idle' });
  }, [chapter, verse]);

  const run = async () => {
    const q = question.trim();
    if (!q) return;
    setStatus({ kind: 'loading' });
    try {
      const result = await askQuestion(chapter, verse, q);
      const note = result.remaining <= 20 ? `Noch ${result.remaining} Fragen in diesem Monat.` : undefined;
      setStatus({ kind: 'answer', text: result.answer, note });
    } catch (err) {
      setStatus({ kind: 'error', error: toCloudError(err) });
    }
  };

  return (
    <View style={styles.block}>
      <ThemedText type="caption" themeColor="textSecondary">
        FRAGE AN DEN TEXT
      </ThemedText>
      {gate ? (
        <GateBox {...gate} onOpenAccount={onOpenAccount} />
      ) : (
        <View style={styles.askRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Zum Beispiel: Warum steht hier „sofort“?"
            placeholderTextColor={theme.textSecondary}
            maxLength={500}
            multiline
            onSubmitEditing={run}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: Fonts.regular }]}
          />
          <Pressable
            onPress={run}
            disabled={!question.trim() || status.kind === 'loading'}
            style={[styles.button, { backgroundColor: theme.accent, opacity: question.trim() && status.kind !== 'loading' ? 1 : 0.5 }]}
            accessibilityRole="button">
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              Fragen
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" themeColor="textSecondary">
            Deine Frage geht zur Beantwortung an die KI von Anthropic, ohne Name und E-Mail.
          </ThemedText>
        </View>
      )}
      <AnswerBox status={status} onOpenAccount={onOpenAccount} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  locked: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  button: {
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  answer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  askRow: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    minHeight: 64,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
