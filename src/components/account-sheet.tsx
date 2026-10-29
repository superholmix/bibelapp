import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CloudError } from '@/lib/cloud';
import { buyPackage, getPackages, purchasesAvailable, restorePurchases, type PurchasesPackage } from '@/lib/purchases';
import { useAuth } from '@/state/auth';
import { useEntitlement } from '@/state/entitlement';
import { useNotes } from '@/state/notes';

type Props = { visible: boolean; onClose: () => void };

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function Button({ label, onPress, kind = 'primary', busy, disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean; disabled?: boolean }) {
  const theme = useTheme();
  const bg = kind === 'primary' ? theme.accent : kind === 'danger' ? '#A33A2C' : 'transparent';
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={[styles.button, { backgroundColor: bg, borderColor: kind === 'secondary' ? theme.border : bg, opacity: off ? 0.6 : 1 }]}
      accessibilityRole="button">
      {busy ? <ActivityIndicator color={kind === 'secondary' ? theme.accent : '#FFFFFF'} /> : null}
      <ThemedText type="smallBold" style={kind === 'secondary' ? undefined : styles.buttonTextLight}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }, props.style]}
    />
  );
}

function SignIn() {
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Das hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <View style={styles.block}>
      <ThemedText type="small" themeColor="textSecondary">
        Mit einem Konto werden deine Notizen gesichert und auf allen Geräten gleich. Du meldest dich mit einem Code per E-Mail an, ganz ohne Passwort.
      </ThemedText>
      {step === 'email' ? (
        <>
          <Field
            value={email}
            onChangeText={setEmail}
            placeholder="E-Mail-Adresse"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={() => validEmail && act(async () => (await sendCode(email), setStep('code')))}
          />
          <Button label="Code senden" busy={busy} disabled={!validEmail} onPress={() => act(async () => (await sendCode(email), setStep('code')))} />
        </>
      ) : (
        <>
          <ThemedText type="small">Wir haben dir einen 6-stelligen Code an {email.trim()} geschickt.</ThemedText>
          <Field
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={styles.codeInput}
            onSubmitEditing={() => code.length === 6 && act(() => verifyCode(email, code))}
          />
          <Button label="Anmelden" busy={busy} disabled={code.length !== 6} onPress={() => act(() => verifyCode(email, code))} />
          <View style={styles.linkRow}>
            <Pressable onPress={() => act(() => sendCode(email))} accessibilityRole="button">
              <ThemedText type="link">Code neu senden</ThemedText>
            </Pressable>
            <Pressable onPress={() => (setStep('email'), setCode(''), setError(null))} accessibilityRole="button">
              <ThemedText type="link">Andere E-Mail</ThemedText>
            </Pressable>
          </View>
        </>
      )}
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Subscription() {
  const theme = useTheme();
  const ent = useEntitlement();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const real = ent.active && ent.source !== 'simulated';

  useEffect(() => {
    if (real || !purchasesAvailable) return;
    getPackages()
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [real]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setMessage(null);
    try {
      await fn();
      await ent.refresh();
    } catch (err) {
      console.warn(err);
      setMessage('Das hat nicht geklappt. Bitte versuche es später noch einmal.');
    } finally {
      setBusy(null);
    }
  };

  if (real) {
    return (
      <View style={styles.block}>
        <ThemedText type="default">
          {ent.manual ? 'Testzugang freigeschaltet' : ent.willRenew ? 'Abo aktiv' : 'Abo gekündigt'}
          {ent.expiresAt ? (ent.willRenew ? `, verlängert sich am ${formatDate(ent.expiresAt)}` : `, läuft bis ${formatDate(ent.expiresAt)}`) : ''}
        </ThemedText>
        {!ent.manual ? (
          <ThemedText type="small" themeColor="textSecondary">
            Kündigen oder ändern kannst du das Abo in den Einstellungen deines {Platform.OS === 'android' ? 'Google-Play' : 'App-Store'}-Kontos.
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <ThemedText type="small" themeColor="textSecondary">
        Das Abo schaltet die Auslegungsüberblicke, Wort-Erklärungen und Fragen an den Text frei. Es deckt die Kosten für die KI.
      </ThemedText>
      {!purchasesAvailable ? (
        <ThemedText type="small" themeColor="textSecondary">
          Kaufen geht nur in der fertigen App aus dem App Store oder Google Play. Im Testlauf schalten wir Konten von Hand frei.
        </ThemedText>
      ) : packages === null ? (
        <ActivityIndicator color={theme.accent} />
      ) : packages.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Gerade sind keine Angebote verfügbar.
        </ThemedText>
      ) : (
        packages.map((pkg) => (
          <Button
            key={pkg.identifier}
            label={`${pkg.product.title || 'Abo'} · ${pkg.product.priceString}`}
            busy={busy === pkg.identifier}
            disabled={!!busy}
            onPress={() => run(pkg.identifier, () => buyPackage(pkg))}
          />
        ))
      )}
      {purchasesAvailable ? (
        <Pressable onPress={() => run('restore', restorePurchases)} disabled={!!busy} accessibilityRole="button">
          <ThemedText type="link">Käufe wiederherstellen</ThemedText>
        </Pressable>
      ) : null}
      {message ? (
        <ThemedText type="small" style={styles.error}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

function SignedIn() {
  const theme = useTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const { sync, sorted, notes, clearLocal } = useNotes();
  const [confirm, setConfirm] = useState<'none' | 'signout' | 'delete'>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsynced = Object.values(notes).filter((n) => n.dirty !== false).length;

  const syncLine =
    sync.state === 'syncing'
      ? 'Wird synchronisiert …'
      : sync.state === 'error'
        ? 'Synchronisieren hat nicht geklappt. Bist du online?'
        : sync.lastSyncedAt
          ? `${sorted.length} ${sorted.length === 1 ? 'Notiz' : 'Notizen'} gesichert, ${timeAgo(sync.lastSyncedAt)}`
          : 'Noch nicht synchronisiert';

  const doSignOut = async () => {
    setBusy(true);
    await signOut();
    clearLocal();
    setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      clearLocal();
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Das Konto konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.block}>
        <ThemedText type="caption" themeColor="textSecondary">
          ANGEMELDET ALS
        </ThemedText>
        <ThemedText type="default">{user?.email}</ThemedText>
      </View>

      <View style={[styles.block, styles.divider, { borderColor: theme.border }]}>
        <ThemedText type="caption" themeColor="textSecondary">
          NOTIZEN
        </ThemedText>
        <ThemedText type="small">{syncLine}</ThemedText>
        <Pressable onPress={sync.run} disabled={sync.state === 'syncing'} accessibilityRole="button">
          <ThemedText type="link">Jetzt synchronisieren</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.block, styles.divider, { borderColor: theme.border }]}>
        <ThemedText type="caption" themeColor="textSecondary">
          ABO
        </ThemedText>
        <Subscription />
      </View>

      <View style={[styles.block, styles.divider, { borderColor: theme.border }]}>
        {confirm === 'signout' ? (
          <>
            <ThemedText type="small">
              {unsynced
                ? `${unsynced} ${unsynced === 1 ? 'Änderung ist' : 'Änderungen sind'} noch nicht gesichert und ${unsynced === 1 ? 'geht' : 'gehen'} beim Abmelden verloren.`
                : 'Deine Notizen bleiben im Konto und werden von diesem Gerät entfernt.'}
            </ThemedText>
            <View style={styles.buttonRow}>
              <Button label="Abmelden" busy={busy} onPress={doSignOut} />
              <Button label="Abbrechen" kind="secondary" onPress={() => setConfirm('none')} />
            </View>
          </>
        ) : confirm === 'delete' ? (
          <>
            <ThemedText type="small">
              Das löscht dein Konto mit allen Notizen endgültig. Ein laufendes Abo kündigst du bitte zusätzlich im{' '}
              {Platform.OS === 'android' ? 'Google-Play' : 'App-Store'}-Konto.
            </ThemedText>
            <View style={styles.buttonRow}>
              <Button label="Endgültig löschen" kind="danger" busy={busy} onPress={doDelete} />
              <Button label="Abbrechen" kind="secondary" onPress={() => setConfirm('none')} />
            </View>
          </>
        ) : (
          <View style={styles.linkRow}>
            <Pressable onPress={() => setConfirm('signout')} accessibilityRole="button">
              <ThemedText type="link">Abmelden</ThemedText>
            </Pressable>
            <Pressable onPress={() => setConfirm('delete')} accessibilityRole="button">
              <ThemedText type="small" style={styles.error}>
                Konto löschen
              </ThemedText>
            </Pressable>
          </View>
        )}
        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    </>
  );
}

/** Konto, Synchronisation und Abo. */
export function AccountSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { available, loading, user } = useAuth();
  if (!visible) return null;

  return (
    <Sheet visible onClose={onClose} title={user ? 'Konto' : 'Anmelden'}>
      {!available ? (
        <ThemedText type="small" themeColor="textSecondary">
          Konto und Synchronisation sind in diesem Testlauf noch nicht eingerichtet. Deine Notizen bleiben auf diesem Gerät.
        </ThemedText>
      ) : loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : user ? (
        <SignedIn />
      ) : (
        <SignIn />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  buttonTextLight: {
    color: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  error: {
    color: '#A33A2C',
  },
});
