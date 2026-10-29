import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChapterPicker } from '@/components/chapter-picker';
import { ExegesisSheet } from '@/components/exegesis-sheet';
import { InterlinearVerse } from '@/components/interlinear-verse';
import { NoteSheet } from '@/components/note-sheet';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { TextSizeControl } from '@/components/text-size-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerseSheet } from '@/components/verse-sheet';
import { WordSheet } from '@/components/word-sheet';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  BOOK,
  COMPARE_TRANSLATIONS,
  getChapter,
  getSectionHeading,
  getStudyVerse,
  getTopicsForChapter,
  studyStatus,
  verseKey,
  type ExegesisTopic,
  type Verse,
  type Word,
} from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useNotes } from '@/state/notes';
import { useSettings } from '@/state/settings';

type Mode = 'read' | 'interlinear';

type Active =
  | { kind: 'none' }
  | { kind: 'chapters' }
  | { kind: 'textsize' }
  | { kind: 'verse'; verse: Verse }
  | { kind: 'word'; verse: Verse; word: Word; index: number }
  | { kind: 'note'; verse: number }
  | { kind: 'topic'; topic: ExegesisTopic };

function mainText(chapter: number, verse: Verse) {
  return getStudyVerse(chapter, verse.v)?.text ?? verse.cmp.elb1905 ?? '';
}

/** Verse zu Absätzen bündeln; TAGNT markiert Absatzenden mit ¶. */
function paragraphs(verses: Verse[]) {
  const out: Verse[][] = [];
  let current: Verse[] = [];
  for (const v of verses) {
    current.push(v);
    if (v.words.some((w) => w.p)) {
      out.push(current);
      current = [];
    }
  }
  if (current.length) out.push(current);
  return out;
}

export default function ReaderScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ chapter?: string; verse?: string }>();
  const { settings, update } = useSettings();
  const { notes } = useNotes();
  const [chapterNo, setChapterNo] = useState(settings.lastChapter);
  const [mode, setMode] = useState<Mode>(settings.interlinear ? 'interlinear' : 'read');
  const [active, setActive] = useState<Active>({ kind: 'none' });
  const router = useRouter();
  // Blatt schließen, dann Konto und Abo unter „Mehr“ öffnen
  const openAccount = () => {
    setActive({ kind: 'none' });
    router.navigate({ pathname: '/mehr', params: { konto: '1' } });
  };
  const [highlight, setHighlight] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  // Gespeichertes Kapitel übernehmen, sobald die Einstellungen geladen sind.
  useEffect(() => setChapterNo(settings.lastChapter), [settings.lastChapter]);

  // Sprung aus der Notizenliste: ?chapter=3&verse=5
  useEffect(() => {
    const c = Number(params.chapter);
    if (c >= 1 && c <= BOOK.chapterCount) {
      update({ lastChapter: c });
      setChapterNo(c);
      setHighlight(Number(params.verse) || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.chapter, params.verse]);

  const chapter = useMemo(() => getChapter(chapterNo), [chapterNo]);
  const paras = useMemo(() => paragraphs(chapter.verses), [chapter]);
  const topics = useMemo(() => getTopicsForChapter(chapterNo), [chapterNo]);

  const goTo = (c: number) => {
    setActive({ kind: 'none' });
    setHighlight(null);
    setChapterNo(c);
    update({ lastChapter: c });
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const compare = settings.compare;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Pressable onPress={() => setActive({ kind: 'chapters' })} accessibilityRole="button" accessibilityLabel="Kapitel wählen">
          <ThemedText type="caption" themeColor="textSecondary">
            DAS EVANGELIUM NACH
          </ThemedText>
          <ThemedText type="title">
            {BOOK.name} {chapterNo}{' '}
            <ThemedText type="heading" themeColor="accent" inline>
              ▾
            </ThemedText>
          </ThemedText>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setActive({ kind: 'textsize' })}
            style={[styles.sizeButton, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            accessibilityRole="button"
            accessibilityLabel="Schriftgröße">
            <ThemedText type="smallBold">Aa</ThemedText>
          </Pressable>
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'read', label: 'Text' },
              { value: 'interlinear', label: 'Urtext' },
            ]}
          />
        </View>
      </View>
      {studyStatus !== 'reviewed' ? (
        <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="small">
            {studyStatus === 'pending'
              ? 'Vorläufiger Haupttext: Elberfelder 1905. Die eigene KI-Studienübersetzung wird als Nächstes erzeugt.'
              : 'Haupttext: KI-Studienübersetzung aus dem Griechischen, Entwurf, noch nicht fachlich geprüft.'}
          </ThemedText>
        </View>
      ) : null}
      {topics.length ? (
        <View style={styles.topics}>
          <ThemedText type="caption" themeColor="textSecondary">
            AUSLEGUNGEN IN DIESEM KAPITEL
          </ThemedText>
          {topics.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setActive({ kind: 'topic', topic: t })}
              style={[styles.topicChip, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              accessibilityRole="button">
              <ThemedText type="caption" themeColor="accent">
                {chapterNo},{t.from === t.to ? t.from : `${t.from}–${t.to}`}
              </ThemedText>
              <ThemedText type="smallBold">{t.title}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
      {mode === 'read' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Tippe auf einen Vers, um den Urtext, Vergleiche und deine Notiz zu sehen.
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Tippe auf ein Wort für Bedeutung und Grammatik.{' '}
          <ThemedText type="small" style={{ color: theme.verb }}>
            Verben
          </ThemedText>
          ,{' '}
          <ThemedText type="small" style={{ color: theme.noun }}>
            Nomen
          </ThemedText>{' '}
          und{' '}
          <ThemedText type="small" style={{ color: theme.function }}>
            kleine Wörter
          </ThemedText>{' '}
          sind farbig unterstrichen.
        </ThemedText>
      )}
    </View>
  );

  const footer = (
    <View style={[styles.footer, { borderColor: theme.border }]}>
      {chapterNo > 1 ? (
        <Pressable onPress={() => goTo(chapterNo - 1)} accessibilityRole="button">
          <ThemedText type="link">‹ Kapitel {chapterNo - 1}</ThemedText>
        </Pressable>
      ) : (
        <View />
      )}
      {chapterNo < BOOK.chapterCount ? (
        <Pressable onPress={() => goTo(chapterNo + 1)} accessibilityRole="button">
          <ThemedText type="link">Kapitel {chapterNo + 1} ›</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  const verseNumber = (v: Verse) => {
    const hasNote = Boolean(notes[verseKey(chapterNo, v.v)]);
    return (
      <ThemedText type="caption" themeColor="accent" style={styles.verseNo} inline scale>
        {v.v}
        {hasNote ? '•' : ''}{' '}
      </ThemedText>
    );
  };

  const renderParagraph = ({ item }: { item: Verse[] }) => {
    const heading = getSectionHeading(chapterNo, item[0].v);
    return (
      <View style={styles.paragraph}>
        {heading ? <ThemedText type="heading">{heading}</ThemedText> : null}
        {renderParagraphBody(item)}
      </View>
    );
  };

  const hasNotes = (v: Verse) => Boolean(getStudyVerse(chapterNo, v.v)?.notes?.length);

  const renderParagraphBody = (item: Verse[]) =>
    compare ? (
      <View style={styles.paragraph}>
        {item.map((v) => (
          <Pressable key={v.v} onPress={() => setActive({ kind: 'verse', verse: v })} style={styles.compareVerse}>
            <ThemedText type="scripture" style={v.v === highlight && { backgroundColor: theme.accentSoft }}>
              {verseNumber(v)}
              {mainText(chapterNo, v)}
              {hasNotes(v) ? (
              <ThemedText type="caption" themeColor="accent" inline scale>
                *
              </ThemedText>
            ) : null}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {COMPARE_TRANSLATIONS[compare].short}: {v.cmp[compare] ?? '–'}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    ) : (
      <ThemedText type="scripture">
        {item.map((v) => (
          <ThemedText
            key={v.v}
            type="scripture"
            onPress={() => setActive({ kind: 'verse', verse: v })}
            style={v.v === highlight && { backgroundColor: theme.accentSoft }}>
            {verseNumber(v)}
            {mainText(chapterNo, v)}
            {hasNotes(v) ? (
              <ThemedText type="caption" themeColor="accent" inline scale>
                *
              </ThemedText>
            ) : null}{' '}
          </ThemedText>
        ))}
      </ThemedText>
    );

  const renderInterlinear = ({ item }: { item: Verse }) => (
    <View style={[styles.ilVerse, { borderColor: theme.border }, item.v === highlight && { backgroundColor: theme.accentSoft }]}>
      <Pressable onPress={() => setActive({ kind: 'verse', verse: item })} style={styles.ilHead} accessibilityRole="button">
        <ThemedText type="smallBold" themeColor="accent">
          {chapterNo},{item.v}
          {notes[verseKey(chapterNo, item.v)] ? ' •' : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.ilMain}>
          {mainText(chapterNo, item)}
        </ThemedText>
      </Pressable>
      <InterlinearVerse
        chapter={chapterNo}
        verse={item}
        settings={settings}
        onWordPress={(word, index) => setActive({ kind: 'word', verse: item, word, index })}
      />
      {compare && item.cmp[compare] ? (
        <ThemedText type="small" themeColor="textSecondary">
          {COMPARE_TRANSLATIONS[compare].short}: {item.cmp[compare]}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {mode === 'read' ? (
          <FlatList
            ref={listRef}
            key="read"
            data={paras}
            keyExtractor={(p) => String(p[0].v)}
            renderItem={renderParagraph}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            contentContainerStyle={styles.content}
          />
        ) : (
          <FlatList
            ref={listRef}
            key="interlinear"
            data={chapter.verses}
            keyExtractor={(v) => String(v.v)}
            renderItem={renderInterlinear}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            contentContainerStyle={styles.content}
            initialNumToRender={6}
            windowSize={7}
          />
        )}
      </SafeAreaView>

      {active.kind === 'textsize' ? (
        <Sheet visible onClose={() => setActive({ kind: 'none' })} title="Schriftgröße">
          <TextSizeControl />
        </Sheet>
      ) : null}
      <ChapterPicker visible={active.kind === 'chapters'} current={chapterNo} onSelect={goTo} onClose={() => setActive({ kind: 'none' })} />
      {active.kind === 'verse' ? (
        <VerseSheet
          chapter={chapterNo}
          verse={active.verse}
          mainText={mainText(chapterNo, active.verse)}
          onClose={() => setActive({ kind: 'none' })}
          onWordPress={(word, index) => setActive({ kind: 'word', verse: active.verse, word, index })}
          onNotePress={() => setActive({ kind: 'note', verse: active.verse.v })}
          onTopicPress={(topic) => setActive({ kind: 'topic', topic })}
          onOpenAccount={openAccount}
        />
      ) : null}
      {active.kind === 'word' ? (
        <WordSheet
          word={active.word}
          index={active.index}
          chapter={chapterNo}
          verse={active.verse.v}
          onClose={() => setActive({ kind: 'none' })}
          onOpenAccount={openAccount}
        />
      ) : null}
      {active.kind === 'note' ? (
        <NoteSheet target={{ chapter: chapterNo, verse: active.verse }} onClose={() => setActive({ kind: 'none' })} />
      ) : null}
      {active.kind === 'topic' ? <ExegesisSheet topic={active.topic} onClose={() => setActive({ kind: 'none' })} onOpenAccount={openAccount} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.four,
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sizeButton: {
    width: 40,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  banner: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  topics: {
    gap: Spacing.two,
  },
  topicChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  paragraph: {
    gap: Spacing.three,
  },
  compareVerse: {
    gap: Spacing.one,
  },
  verseNo: {
    fontSize: 12,
    fontWeight: 600,
  },
  ilVerse: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
  },
  ilHead: {
    gap: Spacing.one,
  },
  ilMain: {
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    marginTop: Spacing.three,
  },
});
