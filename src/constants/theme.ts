/**
 * Farben, Schriften und Abstände der App.
 * Klare, kühle Grundtöne, ein leuchtendes Petrol als Akzent, Pink für Hauptwörter.
 * Schrift: Inter (mit vollem polytonischem Griechisch), in der App mitgeliefert.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F1A1C',
    textSecondary: '#5A6B6E',
    background: '#F5F8F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3EDEE',
    border: '#DAE4E5',
    accent: '#00838B',
    accentSoft: '#DDF2F2',
    verb: '#3B5BDB',
    noun: '#D6336C',
    function: '#8A9799',
    danger: '#C2255C',
    onAccent: '#FFFFFF',
  },
  dark: {
    text: '#E8F0F1',
    textSecondary: '#93A6A9',
    background: '#0D1314',
    backgroundElement: '#162022',
    backgroundSelected: '#1F2D30',
    border: '#273538',
    accent: '#2ED3CE',
    accentSoft: '#0F3536',
    verb: '#91A7FF',
    noun: '#F783AC',
    function: '#7D8D90',
    danger: '#F783AC',
    onAccent: '#04201F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Inter in den geladenen Schnitten (siehe src/app/_layout.tsx). */
export const Fonts = {
  regular: 'Inter_400Regular',
  italic: 'Inter_400Regular_Italic',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

/** Schriftgrößen für den Bibeltext, einstellbar unter „Mehr“. */
export const TextScales = [
  { label: 'Klein', factor: 0.9 },
  { label: 'Normal', factor: 1 },
  { label: 'Groß', factor: 1.15 },
  { label: 'Sehr groß', factor: 1.3 },
  { label: 'Riesig', factor: 1.5 },
] as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
