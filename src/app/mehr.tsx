import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSheet } from '@/components/account-sheet';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { COMPARE_TRANSLATIONS, type CompareId } from '@/data/mark';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth';
import { useEntitlement } from '@/state/entitlement';
import { useSettings, type GlossLanguage } from '@/state/settings';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="caption" themeColor="textSecondary">
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText type="default">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const SOURCES = [
  {
    name: 'STEP Bible',
    url: 'https://www.STEPBible.org',
    text: 'Griechischer Text (TAGNT, Nestle-Aland-Wortbestand), Wortbedeutungen, Lexikon (TBESG) und Grammatik (TEGMC). Daten von STEPBible.org auf Grundlage der Arbeit von Tyndale House Cambridge, Lizenz CC BY 4.0.',
  },
  {
    name: 'Vergleichsübersetzungen',
    url: 'https://github.com/scrollmapper/bible_databases',
    text: 'Elberfelder 1905, King James Version und Reina-Valera 1909 (gemeinfrei) sowie Berean Standard Bible (CC0), bezogen über scrollmapper/bible_databases.',
  },
];

export default function MoreScreen() {
  const theme = useTheme();
  const { settings, update } = useSettings();
  const auth = useAuth();
  const ent = useEntitlement();
  const router = useRouter();
  const params = useLocalSearchParams<{ konto?: string }>();
  const [accountOpen, setAccountOpen] = useState(false);

  // Aus anderen Blättern heraus: „Konto und Abo“ direkt öffnen
  useEffect(() => {
    if (params.konto) {
      setAccountOpen(true);
      router.setParams({ konto: undefined });
    }
  }, [params.konto, router]);

  const accountHint = !auth.available
    ? 'Im Testlauf noch nicht eingerichtet. Notizen bleiben auf diesem Gerät.'
    : auth.user
      ? `${auth.user.email ?? 'Angemeldet'} · Notizen werden synchronisiert`
      : 'Notizen sichern und auf allen Geräten nutzen';
  const aboHint =
    ent.source === 'server' || ent.source === 'store'
      ? ent.manual
        ? 'Testzugang freigeschaltet'
        : 'Aktiv'
      : ent.source === 'simulated'
        ? 'Simuliert: Auslegungen frei, Live-Fragen brauchen ein echtes Abo'
        : 'Auslegungen, Wort-Erklärungen und Fragen an den Text';
  const compareOptions: (CompareId | null)[] = [null, 'elb1905', 'bsb', 'kjv', 'rv1909'];
  const switchColors = {
    trackColor: { false: theme.backgroundSelected, true: theme.accent },
    thumbColor: theme.backgroundElement,
    activeThumbColor: theme.backgroundElement,
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Mehr
          </ThemedText>

          <Section title="Lesen">
            <View style={styles.rowStack}>
              <ThemedText type="default">Vergleichsübersetzung</ThemedText>
              <View style={styles.chips}>
                {compareOptions.map((id) => {
                  const active = settings.compare === id;
                  return (
                    <Pressable
                      key={id ?? 'none'}
                      onPress={() => update({ compare: id })}
                      style={[
                        styles.chip,
                        { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : 'transparent' },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}>
                      <ThemedText type="small" themeColor={active ? 'accent' : 'text'}>
                        {id ? COMPARE_TRANSLATIONS[id].label : 'Keine'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Row label="Beim Öffnen Urtext zeigen" hint="Startet jedes Kapitel in der Interlinear-Ansicht.">
              <Switch value={settings.interlinear} onValueChange={(v) => update({ interlinear: v })} {...switchColors} />
            </Row>
          </Section>

          <Section title="Urtext-Ansicht">
            <Row label="Umschrift" hint="Lateinische Buchstaben unter dem griechischen Wort.">
              <Switch value={settings.showTranslit} onValueChange={(v) => update({ showTranslit: v })} {...switchColors} />
            </Row>
            <Row label="Grammatik-Kurzform" hint="Zum Beispiel „Aorist“ oder „Genitiv“.">
              <Switch value={settings.showGrammar} onValueChange={(v) => update({ showGrammar: v })} {...switchColors} />
            </Row>
            <View style={styles.rowStack}>
              <ThemedText type="default">Sprache der Wortbedeutungen</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Deutsch stammt aus der KI-Studienübersetzung; wo sie noch fehlt, erscheint Englisch.
              </ThemedText>
              <Segmented<GlossLanguage>
                value={settings.glossLanguage}
                onChange={(v) => update({ glossLanguage: v })}
                options={[
                  { value: 'de', label: 'Deutsch' },
                  { value: 'en', label: 'Englisch' },
                  { value: 'es', label: 'Spanisch' },
                ]}
              />
            </View>
          </Section>

          <Section title="Konto und Abo">
            <Pressable onPress={() => setAccountOpen(true)} accessibilityRole="button">
              <Row label={auth.user ? 'Konto' : 'Anmelden'} hint={accountHint}>
                <ThemedText type="link">›</ThemedText>
              </Row>
            </Pressable>
            <Pressable onPress={() => setAccountOpen(true)} accessibilityRole="button">
              <Row label="Abo" hint={aboHint}>
                <ThemedText type="link">›</ThemedText>
              </Row>
            </Pressable>
            <Row label="Abo simulieren" hint="Nur im Testlauf: schaltet die Auslegungen auf diesem Gerät frei.">
              <Switch value={settings.simulateSubscription} onValueChange={(v) => update({ simulateSubscription: v })} {...switchColors} />
            </Row>
          </Section>

          <Section title="Quellen und Lizenzen">
            {SOURCES.map((s) => (
              <Pressable key={s.name} onPress={() => Linking.openURL(s.url)} style={styles.rowStack} accessibilityRole="link">
                <ThemedText type="smallBold" themeColor="accent">
                  {s.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.text}
                </ThemedText>
              </Pressable>
            ))}
          </Section>
        </ScrollView>
      </SafeAreaView>
      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
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
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  title: {
    marginBottom: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowStack: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
});
