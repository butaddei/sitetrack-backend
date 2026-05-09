import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import { useColors } from "@/hooks/useColors";
import { useSubscription, packageToPlan, PLAN_LIMITS, type PlanTier } from "@/lib/revenuecat";

const PRIVACY_URL = "https://sitetrack.online/privacy";
const TERMS_URL = "https://sitetrack.online/terms";

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: [],
  basic: [
    "Up to 5 employees",
    "Up to 5 active projects",
    "Time tracking & clock in/out",
    "Expense tracking",
    "Notes & photos",
  ],
  pro: [
    "Up to 15 employees",
    "Up to 15 active projects",
    "Everything in Basic",
    "Subcontractor invoice generation",
    "Advanced financial reports",
    "Payment terms & ABN support",
  ],
  business: [
    "Unlimited employees",
    "Unlimited projects",
    "Everything in Pro",
    "Priority support",
  ],
};

const PLAN_HIGHLIGHT: Record<PlanTier, boolean> = {
  free: false,
  basic: false,
  pro: true,
  business: false,
};

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { availablePackages, isLoading, purchase, restore, isPurchasing, isRestoring, isSubscribed, hasError } = useSubscription();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Sort: basic → pro → business (packages resolved from current OR all offerings)
  const sortedPackages = [...availablePackages].sort((a, b) => {
    const order: PlanTier[] = ["basic", "pro", "business"];
    return order.indexOf(packageToPlan(a)) - order.indexOf(packageToPlan(b));
  });

  const isEmpty = !isLoading && sortedPackages.length === 0;

  function handleRetry() {
    queryClient.invalidateQueries({ queryKey: ["revenuecat"] });
  }

  async function handlePurchase(pkg: PurchasesPackage) {
    if (__DEV__) {
      setSelectedPkg(pkg);
      setShowConfirm(true);
      return;
    }
    await executePurchase(pkg);
  }

  async function executePurchase(pkg: PurchasesPackage) {
    setPurchasingId(pkg.identifier);
    try {
      await purchase(pkg);
      if (router.canGoBack()) router.back();
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert("Purchase Failed", err?.message ?? "Please try again.");
      }
    } finally {
      setPurchasingId(null);
      setShowConfirm(false);
      setSelectedPkg(null);
    }
  }

  async function handleRestore() {
    try {
      await restore();
      Alert.alert("Purchases Restored", "Your subscription has been restored.");
      if (isSubscribed && router.canGoBack()) router.back();
    } catch {
      Alert.alert("Restore Failed", "No purchases found for this account.");
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Confirm modal (DEV only) ── */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm Test Purchase</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {selectedPkg ? `Purchase "${selectedPkg.product.title}" for ${selectedPkg.product.priceString}/month?` : ""}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => { setShowConfirm(false); setSelectedPkg(null); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => selectedPkg && executePurchase(selectedPkg)}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSubtitle}>
          Unlock full access to SiteTrack for your team
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading plans…</Text>
          </View>
        )}

        {/* ── Web / empty state ── */}
        {isEmpty && Platform.OS === "web" && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="smartphone" size={40} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>iOS App Required</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Subscriptions are managed through Apple In-App Purchases and are only available on the iOS app.{"\n\n"}
              Download SiteTrack from the App Store to subscribe.
            </Text>
          </View>
        )}

        {/* ── Native empty / error state ── */}
        {isEmpty && Platform.OS !== "web" && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={40} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Plans Unavailable</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {hasError
                ? "Could not connect to the subscription service. Check your internet connection and try again."
                : "No subscription plans found. Please try again."}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={14} color="#fff" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Plan cards ── */}
        {!isLoading && sortedPackages.map((pkg) => {
          const plan = packageToPlan(pkg);
          const highlight = PLAN_HIGHLIGHT[plan];
          const features = PLAN_FEATURES[plan];
          const limits = PLAN_LIMITS[plan];
          const isThisBusy = purchasingId === pkg.identifier && isPurchasing;

          return (
            <View
              key={pkg.identifier}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: highlight ? colors.primary : colors.border,
                  borderWidth: highlight ? 2 : 1.5,
                },
              ]}
            >
              {highlight && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              {/* Plan name + price */}
              <Text style={[styles.planName, { color: colors.foreground }]}>
                {pkg.product.title || plan.charAt(0).toUpperCase() + plan.slice(1)}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceAmount, { color: highlight ? colors.primary : colors.foreground }]}>
                  {pkg.product.priceString}
                </Text>
                <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>/month</Text>
              </View>

              {/* Limits pill */}
              <View style={[styles.limitsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.limitItem}>
                  <Feather name="users" size={12} color={colors.primary} />
                  <Text style={[styles.limitText, { color: colors.foreground }]}>{limits.employees}</Text>
                </View>
                <View style={[styles.limitDivider, { backgroundColor: colors.border }]} />
                <View style={styles.limitItem}>
                  <Feather name="briefcase" size={12} color={colors.primary} />
                  <Text style={[styles.limitText, { color: colors.foreground }]}>{limits.projects}</Text>
                </View>
              </View>

              {/* Features */}
              <View style={styles.featureList}>
                {features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <View style={[styles.featureCheck, { backgroundColor: "#16a34a18" }]}>
                      <Feather name="check" size={11} color="#16a34a" />
                    </View>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* Subscribe button */}
              <TouchableOpacity
                style={[styles.subscribeBtn, { opacity: isPurchasing ? 0.7 : 1 }]}
                onPress={() => handlePurchase(pkg)}
                disabled={isPurchasing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={highlight ? [colors.primary, colors.accent] : [colors.foreground + "dd", colors.foreground + "aa"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subscribeBtnInner}
                >
                  {isThisBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.subscribeBtnText}>
                      Subscribe — {pkg.product.priceString}/mo
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── Restore Purchases ── */}
        <TouchableOpacity
          style={[styles.restoreBtn, { borderColor: colors.border }]}
          onPress={handleRestore}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <>
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
              <Text style={[styles.restoreBtnText, { color: colors.mutedForeground }]}>Restore Purchases</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Apple compliance disclaimer ── */}
        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
            Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Payment will be charged to your Apple ID account. You can manage or cancel your subscription anytime in Apple ID Settings.
          </Text>
        </View>

        {/* ── Legal links ── */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={[styles.legalSep, { color: colors.mutedForeground }]}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingBottom: 28, paddingHorizontal: 24, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8, textAlign: "center" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 },

  content: { padding: 16, gap: 14 },

  loadingWrap: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14 },

  planCard: {
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  popularBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  popularText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },

  planName: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 3, marginBottom: 14 },
  priceAmount: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  pricePeriod: { fontSize: 14, fontWeight: "500", marginBottom: 4 },

  limitsRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
    marginBottom: 14,
  },
  limitItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  limitDivider: { width: 1, marginHorizontal: 10 },
  limitText: { fontSize: 12, fontWeight: "600", flex: 1 },

  featureList: { gap: 9, marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 13, fontWeight: "500", flex: 1 },

  subscribeBtn: { borderRadius: 12, overflow: "hidden" },
  subscribeBtnInner: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  subscribeBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  restoreBtnText: { fontSize: 14, fontWeight: "600" },

  disclaimer: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  disclaimerText: { fontSize: 11, lineHeight: 17, textAlign: "center" },

  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 },
  legalLink: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  legalSep: { fontSize: 13 },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 32,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { borderRadius: 18, padding: 24, width: "100%", maxWidth: 340 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  modalBody: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "600" },
});
