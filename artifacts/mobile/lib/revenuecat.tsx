import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";

// ─── Apple-only SDK key ───────────────────────────────────────────────────────
// iOS key (real Apple key) used on device/simulator/TestFlight/App Store.
// Test key used as fallback on Expo web preview only.
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
const TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "";

function getRevenueCatApiKey(): string {
  if (Platform.OS === "web") return TEST_API_KEY || IOS_API_KEY;
  if (!IOS_API_KEY) throw new Error("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is not set.");
  return IOS_API_KEY;
}

// ─── Entitlement (single entitlement unlocks all 3 plans) ────────────────────
// RevenueCat offering: "default"
// All 3 Apple products unlock this same entitlement.
// Plan tier is then determined by the active Apple Product ID.
export const SITETRACK_ENTITLEMENT = "sitetrack Pro";

// ─── Apple Product IDs ────────────────────────────────────────────────────────
export const PRODUCT_IDS = {
  basic: "com.sitetrack.basic.monthly",
  pro: "com.sitetrack.pro.monthly",
  business: "com.sitetrack.business.monthly",
} as const;

// ─── Plan tier ────────────────────────────────────────────────────────────────
export type PlanTier = "free" | "basic" | "pro" | "business";

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "No Subscription",
  basic: "Basic",
  pro: "Pro",
  business: "Business",
};

export const PLAN_LIMITS: Record<PlanTier, { employees: string; projects: string }> = {
  free: { employees: "—", projects: "—" },
  basic: { employees: "Up to 5 employees", projects: "Up to 5 projects" },
  pro: { employees: "Up to 15 employees", projects: "Up to 15 projects" },
  business: { employees: "Unlimited employees", projects: "Unlimited projects" },
};

// ─── Map an Apple Product ID to a plan tier ───────────────────────────────────
function productIdToPlan(productId: string): PlanTier {
  if (productId === PRODUCT_IDS.business) return "business";
  if (productId === PRODUCT_IDS.pro) return "pro";
  if (productId === PRODUCT_IDS.basic) return "basic";
  return "free";
}

// ─── Map a RevenueCat package to a plan tier (used in paywall) ───────────────
// Matches first by Apple Product ID, then by package identifier as fallback.
export function packageToPlan(pkg: PurchasesPackage): PlanTier {
  // Primary: match by actual Apple Product ID
  const plan = productIdToPlan(pkg.product.identifier);
  if (plan !== "free") return plan;
  // Fallback: match by package identifier string
  const id = pkg.identifier.toLowerCase();
  if (id.includes("business")) return "business";
  if (id.includes("pro")) return "pro";
  if (id.includes("basic")) return "basic";
  return "basic";
}

// ─── Initialize RevenueCat (call once at app root, before any hook) ───────────
export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  if (__DEV__) console.log("[RevenueCat] Configured with key ending:", apiKey.slice(-6), "platform:", Platform.OS);
}

// ─── Internal subscription context hook ──────────────────────────────────────
function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60_000,
    retry: 2,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300_000,
    retry: 2,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const customerInfo = customerInfoQuery.data;

  // ── Subscription check ───────────────────────────────────────────────────
  // A user is subscribed if the "sitetrack Pro" entitlement is active.
  // This entitlement is unlocked by any of the 3 Apple products.
  const isSubscribed = !!customerInfo?.entitlements.active[SITETRACK_ENTITLEMENT];

  // ── Plan tier detection ───────────────────────────────────────────────────
  // Detect which plan by the active Apple Product ID (most reliable method).
  // activeSubscriptions is a Set of Apple product identifiers.
  const activeProductIds = Array.from(customerInfo?.activeSubscriptions ?? []);
  let currentPlan: PlanTier = "free";
  for (const productId of activeProductIds) {
    const plan = productIdToPlan(productId);
    if (plan !== "free") {
      currentPlan = plan;
      break;
    }
  }
  // If entitlement is active but product ID detection failed, default to "basic"
  if (isSubscribed && currentPlan === "free") currentPlan = "basic";

  return {
    customerInfo,
    offerings: offeringsQuery.data,
    currentPlan,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: customerInfoQuery.refetch,
  };
}

// ─── Context & Provider ───────────────────────────────────────────────────────
type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
