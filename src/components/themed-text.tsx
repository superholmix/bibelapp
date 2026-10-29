import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'heading' | 'small' | 'smallBold' | 'caption' | 'scripture' | 'greek' | 'link';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = theme[themeColor ?? (type === 'link' ? 'accent' : 'text')];

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 600,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    letterSpacing: 0.3,
  },
  scripture: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    lineHeight: 32,
  },
  greek: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    lineHeight: 28,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
});
