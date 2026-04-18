import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type PlanKey = "free" | "pro" | "business";

interface PlanInfo {
  plan: PlanKey;
  planStatus: string;
  stripeEnabled: boolean;
  hasSubscription: boolean;
}

// ─── Pricing config — edit here to update the paid plan ──────────────────────
const FREE_PLAN = {
  name: "Free Plan",
  price: "$0",
  period: "forever",
  tagline: "Perfect for getting started",
  features: [
    "Up to 3 active projects",
    "Up to 3 team members",
    "Time tracking & clock in/out",
    "Photo uploads per project",
    "Expense tracking",
    "Subcontractor invoices",
  ],
};

const PRO_PLAN = {
  key: "pro" as PlanKey,
  name: "Pro Plan",
  price: "$49",
  period: "/ month",
  tagline: "Everything you need to scale",
  features: [
    "Unlimited active projects",
    "Unlimited team members",
    "Time tracking & clock in/out",
    "Photo uploads per project",
    "Expense tracking",
    "Subcontractor invoices",
    "Advanced financial reports",
    "Priority support",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_STATUS_COLOR: Record<string, string> = {
  active:   "#16a34a",
  trialing: "#0ea5e9",
  past_due: "#f59e0b",
  canceled: "#ef4444",
  inactive: "#94a3b8",
};

function planStatusLabel(status: string) {
  return (
    { active: "Active", trialing: "Trial", past_due: "Past Due", canceled: "Canceled", inactive: "Inactive" }[status] ?? status
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isAdmin = user?.role === "admin";

  const [planInfo, setPlanInfo]       = useState<PlanInfo | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [upgrading, setUpgrading]     = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  const fetchPlanInfo = useCallback(async () => {
    try {
      const data = await apiFetch<PlanInfo>("/api/stripe/plan");
      setPlanInfo(data);
    } catch {
      setPlanInfo({
        plan:            (user?.plan ?? "free") as PlanKey,
        planStatus:      user?.planStatus ?? "active",
        stripeEnabled:   false,
        hasSubscription: false,
      });
    } finally {
      setLoadingPlan(false);
    }
  }, [user]);

  useEffect(() => { fetchPlanInfo(); }, [fetchPlanInfo]);

  const currentPlan    = planInfo?.plan ?? (user?.plan as PlanKey) ?? "free";
  const currentStatus  = planInfo?.planStatus ?? user?.planStatus ?? "active";
  const stripeEnabled  = planInfo?.stripeEnabled ?? false;
  const hasSubscription = planInfo?.hasSubscription ?? false;

  const currentPlanLabel = currentPlan === "free" ? "Free Plan" : currentPlan === "pro" ? "Pro Plan" : "Business Plan";

  async function handleUpgrade() {
    if (!isAdmin) {
      Alert.alert("Admin Required", "Only company admins can manage subscription plans.");
      return;
    }
    if (!stripeEnabled) {
      Alert.alert(
        "Coming Soon",
        "Billing is not yet active. You're on free early access — all features are included at no charge.",
        [{ text: "Got it" }]
      );
      return;
    }
    setUpgrading(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: PRO_PLAN.key }),
      });
      if (data.url) await Linking.openURL(data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open checkout";
      Alert.alert("Error", msg);
    } finally {
      setUpgrading(false);
    }
  }

  async function handleManageSubscription() {
    if (!isAdmin) return;
    setManagingPortal(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/stripe/portal", { method: "POST" });
      if (data.url) await Linking.openURL(data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open billing portal";
      Alert.alert("Error", msg);
    } finally {
      setManagingPortal(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.accent, colors.accent + "d0"]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Subscription</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {/* Current plan pill */}
        <View style={styles.currentPlanRow}>
          <View style={styles.currentPlanPill}>
            <View style={[styles.statusDot, { backgroundColor: PLAN_STATUS_COLOR[currentStatus] ?? "#16a34a" }]} />
            <Text style={styles.currentPlanText}>{currentPlanLabel}</Text>
            <Text style={styles.currentPlanStatus}>· {planStatusLabel(currentStatus)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ─── Body ───────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loadingPlan ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* ── Free early access banner ── */}
            {!stripeEnabled && (
              <View style={[styles.earlyAccessCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                <Feather name="gift" size={16} color={colors.primary} />
                <Text style={[styles.earlyAccessText, { color: colors.primary }]}>
                  <Text style={{ fontWeight: "700" }}>Free Early Access — </Text>
                  all features included at no charge while we're in early access. Billing activates soon.
                </Text>
              </View>
            )}

            {/* ── Free Plan card ── */}
            <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 }]}>

              {/* Plan header */}
              <View style={styles.planHeader}>
                <View style={styles.planNameRow}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>{FREE_PLAN.name}</Text>
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}>
                    <Feather name="check" size={10} color={colors.primary} />
                    <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Current</Text>
                  </View>
                </View>
                <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>{FREE_PLAN.tagline}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceAmount, { color: colors.foreground }]}>{FREE_PLAN.price}</Text>
                  <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>{FREE_PLAN.period}</Text>
                </View>
              </View>

              <View style={[styles.planDivider, { backgroundColor: colors.border }]} />

              {/* Features */}
              <View style={styles.featureList}>
                {FREE_PLAN.features.map((feat) => (
                  <View key={feat} style={styles.featureRow}>
                    <View style={[styles.featureCheck, { backgroundColor: "#16a34a18" }]}>
                      <Feather name="check" size={11} color="#16a34a" />
                    </View>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{feat}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {hasSubscription && isAdmin ? (
                <TouchableOpacity
                  style={[styles.manageBtn, { borderColor: colors.border }]}
                  onPress={handleManageSubscription}
                  disabled={managingPortal}
                  activeOpacity={0.75}
                >
                  {managingPortal ? (
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                  ) : (
                    <>
                      <Feather name="external-link" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.manageBtnText, { color: colors.mutedForeground }]}>Manage Subscription</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.currentPlanBtn, { backgroundColor: colors.muted }]}>
                  <Feather name="check-circle" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.currentPlanBtnText, { color: colors.mutedForeground }]}>Your Current Plan</Text>
                </View>
              )}
            </View>

            {/* ── Pro Plan card (coming soon) ── */}
            <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary + "40", borderWidth: 1 }]}>

              {/* Coming Soon badge */}
              <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "30" }]}>
                <Feather name="clock" size={10} color={colors.primary} />
                <Text style={[styles.comingSoonBadgeText, { color: colors.primary }]}>Coming Soon</Text>
              </View>

              {/* Plan header */}
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.foreground }]}>{PRO_PLAN.name}</Text>
                <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>{PRO_PLAN.tagline}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceAmount, { color: colors.foreground }]}>{PRO_PLAN.price}</Text>
                  <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>{PRO_PLAN.period}</Text>
                </View>
              </View>

              <View style={[styles.planDivider, { backgroundColor: colors.border }]} />

              {/* Features */}
              <View style={styles.featureList}>
                {PRO_PLAN.features.map((feat) => (
                  <View key={feat} style={styles.featureRow}>
                    <View style={[styles.featureCheck, { backgroundColor: colors.primary + "14" }]}>
                      <Feather name="check" size={11} color={colors.primary} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{feat}</Text>
                  </View>
                ))}
              </View>

              {/* CTA — disabled until Stripe is live */}
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: colors.primary, opacity: stripeEnabled ? 1 : 0.55 }]}
                onPress={handleUpgrade}
                disabled={upgrading || !isAdmin}
                activeOpacity={0.8}
              >
                {upgrading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={[styles.upgradeBtnText, { color: "#fff" }]}>
                      {stripeEnabled ? `Upgrade to ${PRO_PLAN.name}` : "Coming Soon"}
                    </Text>
                    {!stripeEnabled && <Feather name="clock" size={13} color="rgba(255,255,255,0.7)" />}
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Footer note ── */}
            <View style={[styles.footerNote, { borderColor: colors.border }]}>
              <Feather name="shield" size={13} color={colors.mutedForeground} />
              <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>
                Payments are processed securely by Stripe. You can cancel or change your plan at any time from the billing portal.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  currentPlanRow: { alignItems: "flex-start" },
  currentPlanPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  currentPlanText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  currentPlanStatus: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500" },

  content: { padding: 16, gap: 12 },

  earlyAccessCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  earlyAccessText: { flex: 1, fontSize: 13, lineHeight: 19 },

  planCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 14,
  },
  comingSoonBadgeText: { fontSize: 11, fontWeight: "700" },

  planHeader: { gap: 4, marginBottom: 16 },
  planNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontSize: 20, fontWeight: "800" },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "700" },
  planTagline: { fontSize: 13 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 6 },
  priceAmount: { fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  pricePeriod: { fontSize: 14, fontWeight: "500" },

  planDivider: { height: 1, marginVertical: 16 },

  featureList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 13, fontWeight: "500", flex: 1 },

  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: "700" },

  currentPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
  },
  currentPlanBtnText: { fontSize: 14, fontWeight: "600" },

  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  manageBtnText: { fontSize: 14, fontWeight: "600" },

  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  footerNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
