import AsyncStorage from '@react-native-async-storage/async-storage';

import { callFunction } from '@/lib/cloud';

/** Antwort der Backend-Funktion „frage“ (supabase/functions/frage). */
export type LiveAnswer = { answer: string; truncated: boolean; remaining: number };

export function askQuestion(chapter: number, verse: number, question: string) {
  return callFunction<LiveAnswer>('frage', { kind: 'frage', chapter, verse, question });
}

/** Wort-Erklärungen ändern sich nicht: einmal geholt, bleiben sie auf dem Gerät und kosten nichts mehr. */
export async function explainWord(chapter: number, verse: number, index: number) {
  const key = `ai.wort.v1.${chapter}.${verse}.${index}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return { ...(JSON.parse(cached) as LiveAnswer), cached: true };
  } catch {
    // Kein Zwischenspeicher: einfach neu fragen
  }
  const result = await callFunction<LiveAnswer>('frage', { kind: 'wort', chapter, verse, index });
  if (!result.truncated) AsyncStorage.setItem(key, JSON.stringify(result)).catch(() => {});
  return { ...result, cached: false };
}

export async function cachedWordExplanation(chapter: number, verse: number, index: number) {
  try {
    const cached = await AsyncStorage.getItem(`ai.wort.v1.${chapter}.${verse}.${index}`);
    return cached ? (JSON.parse(cached) as LiveAnswer) : null;
  } catch {
    return null;
  }
}
