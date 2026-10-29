import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { formatRef, verseKey } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth';
import { useNotes } from '@/state/notes';

type Props = {
  target: { chapter: number; verse: number } | null;
  onClose: () => void;
};

export function NoteSheet({ target, onClose }: Props) {
  const theme = useTheme();
  const { getNote, saveNote, deleteNote } = useNotes();
  const { user } = useAuth();
  const key = target ? verseKey(target.chapter, target.verse) : '';
  const existing = target ? getNote(key) : undefined;
  const [text, setText] = useState(existing?.text ?? '');

  useEffect(() => {
    setText(existing?.text ?? '');
    // Nur beim Öffnen für einen anderen Vers neu befüllen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!target) return null;

  const close = () => {
    saveNote(target.chapter, target.verse, key, text);
    onClose();
  };

  return (
    <Sheet visible onClose={close} title={`Notiz zu ${formatRef(target.chapter, target.verse)}`}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Was fällt dir an diesem Vers auf?"
        placeholderTextColor={theme.textSecondary}
        multiline
        autoFocus
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: Fonts.serif },
        ]}
      />
      <View style={styles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {user ? 'Wird beim Schließen gespeichert und mit deinem Konto synchronisiert.' : 'Wird beim Schließen auf diesem Gerät gespeichert.'}
        </ThemedText>
        {existing ? (
          <Pressable
            onPress={() => {
              deleteNote(key);
              setText('');
              onClose();
            }}
            accessibilityRole="button">
            <ThemedText type="link" style={{ color: theme.textSecondary }}>
              Löschen
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    fontSize: 17,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  hint: {
    flex: 1,
  },
});
