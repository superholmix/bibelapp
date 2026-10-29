import { useSettings } from '@/state/settings';

export type Entitlement = {
  /** Darf der Nutzer die Abo-Funktionen nutzen? */
  active: boolean;
  /** Woher die Aussage stammt; im Testlauf nur simuliert */
  source: 'simulated';
};

/**
 * Abo-Status. Im Testlauf über einen Schalter in „Mehr“ simuliert;
 * mit RevenueCat kommt hier der echte Status aus dem Store.
 */
export function useEntitlement(): Entitlement {
  const { settings } = useSettings();
  return { active: settings.simulateSubscription, source: 'simulated' };
}
