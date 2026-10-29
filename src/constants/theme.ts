/**
 * Farben, Schriften und Abstände der App.
 * Ruhige Papiertöne, eine warme Akzentfarbe; Wortarten nur dezent eingefärbt.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1B16',
    textSecondary: '#6B645A',
    background: '#F7F4EE',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EDE6DA',
    border: '#E4DDD1',
    accent: '#8A4B2A',
    accentSoft: '#F1E4DA',
    verb: '#2F5F98',
    noun: '#2E7556',
    function: '#8A8174',
  },
  dark: {
    text: '#EDE8DF',
    textSecondary: '#A39C90',
    background: '#151412',
    backgroundElement: '#1F1D1A',
    backgroundSelected: '#2C2925',
    border: '#34302B',
    accent: '#E0A274',
    accentSoft: '#3A2C22',
    verb: '#8DB4E6',
    noun: '#86C7A6',
    function: '#8E877C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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
