import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";

// ─── Apple-only SDK key ───────────────────────────────────────────────────────
// Use the iOS key on all real devices (Apple sandbox in dev, production in prod).
// On Expo web preview the key still initialises but purchases are unavailable.
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
const TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "";

function getRevenueCatApiKey(): string {
  if (Platform.OS === "web") {
    // Expo web preview — no real IAP; initialise with test key to avoid crashes
    return TEST_API_KEY || IOS_API_KEY;
  }
  // iOS (simulator dev, TestFlight, App Store) — always use real Apple SDK key
  if (!IOS_API_KEY) throw new Error("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is not set.");
  return IOS_API_KEY;
}

// ─── Entitlement identifiers ──────────────────────────────────────────────────
export const ENTITLEMENTS = {
  basic: "basic",
  pro: "pro",
  business: "business",
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

// ─── Package → plan tier (matched by RevenueCat package identifier) ───────────
export function packageToPlan(pkg: PurchasesPackage): PlanTier {
  const id = pkg.identifier.toLowerCase();
  if (id.includes("business")) return "business";
  if (id.includes("pro")) return "pro";
  return "basic";
}

// ─── Initialize RevenueCat (call once at app root, before any hook) ───────────
export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  if (__DEV__) console.log("[RevenueCat] Configured. Platform:", Platform.OS);
}

// ─── Internal hook ────────────────────────────────────────────────────────────
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

  const active = customerInfoQuery.data?.entitlements.active ?? {};

  const currentPlan: PlanTier =
    active[ENTITLEMENTS.business] ? "business"
    : active[ENTITLEMENTS.pro] ? "pro"
    : active[ENTITLEMENTS.basic] ? "basic"
    : "free";

  const isSubscribed = currentPlan !== "free";

  return {
    customerInfo: customerInfoQuery.data,
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
