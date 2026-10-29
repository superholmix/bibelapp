import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { BOOK } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  current: number;
  onSelect: (chapter: number) => void;
  onClose: () => void;
};

export function ChapterPicker({ visible, current, onSelect, onClose }: Props) {
  const theme = useTheme();
  const chapters = Array.from({ length: BOOK.chapterCount }, (_, i) => i + 1);

  return (
    <Sheet visible={visible} onClose={onClose} title={`${BOOK.name}: Kapitel wählen`}>
      <View style={styles.grid}>
        {chapters.map((c) => {
          const active = c === current;
          return (
            <Pressable
              key={c}
              onPress={() => onSelect(c)}
              style={[
                styles.cell,
                { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : theme.background },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <ThemedText type="heading" themeColor={active ? 'accent' : 'text'}>
                {c}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Im Testlauf ist nur das Markusevangelium enthalten.
      </ThemedText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
