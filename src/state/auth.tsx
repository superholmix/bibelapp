import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { callFunction, cloud } from '@/lib/cloud';

type AuthContextValue = {
  /** Ist überhaupt ein Backend eingerichtet? */
  available: boolean;
  /** Sitzung wird noch vom Gerät geladen */
  loading: boolean;
  session: Session | null;
  user: User | null;
  /** Schickt einen Code (6 bis 10 Ziffern) per E-Mail. Legt das Konto beim ersten Mal an. */
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function germanAuthError(message: string) {
  if (/rate limit|security purposes/i.test(message)) return 'Bitte warte kurz, bevor du einen neuen Code anforderst.';
  if (/expired|invalid/i.test(message)) return 'Der Code stimmt nicht oder ist abgelaufen.';
  if (/email/i.test(message)) return 'Bitte prüfe die E-Mail-Adresse.';
  return 'Das hat nicht geklappt. Bitte versuche es noch einmal.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!cloud);

  useEffect(() => {
    if (!cloud) return;
    cloud.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = cloud.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      available: !!cloud,
      loading,
      session,
      user: session?.user ?? null,
      sendCode: async (email) => {
        if (!cloud) return;
        const { error } = await cloud.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
        if (error) throw new Error(germanAuthError(error.message));
      },
      verifyCode: async (email, code) => {
        if (!cloud) return;
        const { error } = await cloud.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (error) throw new Error(germanAuthError(error.message));
      },
      signOut: async () => {
        await cloud?.auth.signOut();
      },
      deleteAccount: async () => {
        await callFunction('konto-loeschen', {});
        // Die Sitzung ist serverseitig schon ungültig; lokal aufräumen
        await cloud?.auth.signOut({ scope: 'local' });
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth braucht einen AuthProvider');
  return ctx;
}
