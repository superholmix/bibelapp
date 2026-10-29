import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TextScales } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/state/settings';

/** Schriftgröße des Bibeltextes: kleiner, größer, mit Vorschau. */
export function TextSizeControl() {
  const theme = useTheme();
  const { settings, update } = useSettings();
  const index = Math.min(Math.max(settings.textSize, 0), TextScales.length - 1);

  const step = (delta: number) => update({ textSize: Math.min(Math.max(index + delta, 0), TextScales.length - 1) });

  const button = (label: string, delta: number, size: number, a11y: string) => {
    const disabled = index + delta < 0 || index + delta >= TextScales.length;
    return (
      <Pressable
        onPress={() => step(delta)}
        disabled={disabled}
        style={[styles.button, { borderColor: theme.border, backgroundColor: theme.background, opacity: disabled ? 0.4 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={a11y}>
        <ThemedText type="smallBold" style={{ fontSize: size, lineHeight: size + 6 }}>
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {button('A', -1, 14, 'Schrift kleiner')}
        <View style={styles.dots} accessibilityLabel={`Schriftgröße ${TextScales[index].label}`}>
          {TextScales.map((s, i) => (
            <Pressable key={s.label} onPress={() => update({ textSize: i })} hitSlop={6} accessibilityRole="button" accessibilityLabel={s.label}>
              <View style={[styles.dot, { backgroundColor: i <= index ? theme.accent : theme.backgroundSelected }]} />
            </Pressable>
          ))}
        </View>
        {button('A', 1, 22, 'Schrift größer')}
      </View>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
        {TextScales[index].label.toUpperCase()}
      </ThemedText>
      <ThemedText type="scripture">Am Anfang war das Wort. Ἐν ἀρχῇ ἦν ὁ λόγος.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  button: {
    width: 48,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  center: {
    textAlign: 'center',
  },
});
