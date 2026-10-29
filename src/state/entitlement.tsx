import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { cloud } from '@/lib/cloud';
import { ENTITLEMENT_ID, getCustomerInfo, hasEntitlement, linkPurchases, onCustomerInfo, type CustomerInfo } from '@/lib/purchases';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';

export type Entitlement = {
  /** Darf die Person die Abo-Funktionen nutzen? */
  active: boolean;
  /**
   * Woher die Aussage stammt: Testschalter, Datenbank (vom Webhook oder von Hand gesetzt)
   * oder direkt aus dem Store, solange der Webhook noch nicht durch ist.
   */
  source: 'simulated' | 'server' | 'store' | 'none';
  expiresAt: string | null;
  willRenew: boolean;
  /** Von Hand freigeschaltetes Testkonto */
  manual: boolean;
  refresh: () => Promise<void>;
};

type ServerEntitlement = { active: boolean; source: 'revenuecat' | 'manual'; expires_at: string | null; will_renew: boolean };

const EntitlementContext = createContext<Entitlement | null>(null);

/** Abo-Status aus Testschalter, Datenbank und Store zusammengeführt. */
export function EntitlementProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const { user } = useAuth();
  const [server, setServer] = useState<ServerEntitlement | null>(null);
  const [store, setStore] = useState<CustomerInfo | null>(null);

  const refresh = useCallback(async () => {
    if (!cloud || !user) {
      setServer(null);
      return;
    }
    const { data, error } = await cloud.rpc('my_entitlement');
    if (!error) setServer(((data as ServerEntitlement[] | null) ?? [])[0] ?? null);
    setStore(await getCustomerInfo().catch(() => null));
  }, [user]);

  useEffect(() => {
    linkPurchases(user?.id ?? null)
      .then(refresh)
      .catch((err) => console.warn('RevenueCat', err));
    const offInfo = onCustomerInfo((info) => {
      setStore(info);
      // Der Webhook braucht einen Moment; danach den Datenbank-Stand nachladen
      setTimeout(refresh, 4000);
    });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      offInfo();
      sub.remove();
    };
  }, [user, refresh]);

  const value = useMemo<Entitlement>(() => {
    const base = { expiresAt: server?.expires_at ?? null, willRenew: server?.will_renew ?? false, manual: server?.source === 'manual', refresh };
    if (server?.active) return { ...base, active: true, source: 'server' };
    if (hasEntitlement(store)) {
      const ent = store!.entitlements.active[ENTITLEMENT_ID];
      return { ...base, active: true, source: 'store', expiresAt: ent.expirationDate, willRenew: ent.willRenew };
    }
    if (settings.simulateSubscription) return { ...base, active: true, source: 'simulated' };
    return { ...base, active: false, source: 'none' };
  }, [server, store, settings.simulateSubscription, refresh]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement braucht einen EntitlementProvider');
  return ctx;
}
