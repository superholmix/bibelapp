import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

/**
 * Käufe über App Store und Google Play, verwaltet von RevenueCat.
 * Die App fragt den Status nur zur schnellen Anzeige ab; maßgeblich ist der Abo-Status in der
 * Datenbank, den der RevenueCat-Webhook schreibt (supabase/functions/revenuecat).
 */
export const ENTITLEMENT_ID = 'abo';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export const purchasesAvailable = !!apiKey;

let configured = false;

/** Verknüpft RevenueCat mit dem Konto (Supabase-ID), damit der Webhook die Person findet. */
export async function linkPurchases(userId: string | null) {
  if (!apiKey) return;
  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
    configured = true;
    return;
  }
  if (userId) await Purchases.logIn(userId);
  else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
}

export function hasEntitlement(info: CustomerInfo | null) {
  return !!info?.entitlements.active[ENTITLEMENT_ID];
}

export async function getCustomerInfo() {
  return configured ? Purchases.getCustomerInfo() : null;
}

export function onCustomerInfo(listener: (info: CustomerInfo) => void) {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Kauft ein Paket. Gibt null zurück, wenn die Person den Kauf abbricht. */
export async function buyPackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err) {
    if ((err as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return null;
    throw err;
  }
}

export async function restorePurchases() {
  return configured ? Purchases.restorePurchases() : null;
}

export type { CustomerInfo, PurchasesPackage };
