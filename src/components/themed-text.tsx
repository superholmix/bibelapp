import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, TextScales, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/state/settings';

type TextType = 'default' | 'title' | 'heading' | 'small' | 'smallBold' | 'caption' | 'scripture' | 'greek' | 'link';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
  /** Mit der eingestellten Schriftgröße für den Bibeltext mitwachsen (Standard bei scripture und greek) */
  scale?: boolean;
  /**
   * Innerhalb eines anderen Textes (Versnummer, Fußnotenzeichen): keine eigene Zeilenhöhe.
   * Eine kleinere Zeilenhöhe im Fließtext staucht auf iOS die ganze Zeile und schneidet Buchstaben oben ab.
   */
  inline?: boolean;
};

const SCALED_BY_DEFAULT: TextType[] = ['scripture', 'greek'];

/**
 * Eigene Schriften haben je Schnitt einen eigenen Namen. fontWeight und fontStyle werden deshalb
 * in den passenden Inter-Schnitt übersetzt; sonst zeigen iOS und Android nur den Normalschnitt.
 */
function interFamily(weight: TextStyle['fontWeight'], italic: boolean) {
  if (italic) return Fonts.italic;
  const w = Number(weight ?? 400);
  if (w >= 700) return Fonts.bold;
  if (w >= 600) return Fonts.semibold;
  if (w >= 500) return Fonts.medium;
  return Fonts.regular;
}

export function ThemedText({ style, type = 'default', themeColor, scale, inline, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const color = theme[themeColor ?? (type === 'link' ? 'accent' : 'text')];

  const flat: TextStyle = StyleSheet.flatten([styles[type], style]) ?? {};
  const factor = (scale ?? SCALED_BY_DEFAULT.includes(type)) ? (TextScales[settings.textSize]?.factor ?? 1) : 1;
  const sized: TextStyle =
    factor === 1
      ? {}
      : {
          fontSize: flat.fontSize ? Math.round(flat.fontSize * factor) : undefined,
          lineHeight: flat.lineHeight ? Math.round(flat.lineHeight * factor) : undefined,
        };
  const font: TextStyle = flat.fontFamily
    ? {}
    : { fontFamily: interFamily(flat.fontWeight, flat.fontStyle === 'italic'), fontWeight: 'normal', fontStyle: 'normal' };

  const flow: TextStyle = inline ? { lineHeight: undefined } : {};

  return <Text style={[{ color }, flat, sized, font, flow]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: 700,
    letterSpacing: -0.6,
  },
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 600,
    letterSpacing: -0.2,
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
    letterSpacing: 0.4,
  },
  // Inter braucht etwa das 1,21-Fache der Schriftgröße; mit 1,65 bleibt Luft für Akzente
  scripture: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: 400,
  },
  greek: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: 500,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
});
