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

// ─── Plan definitions ─────────────────────────────────────────────────────────
interface PlanDef {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: { text: string; included: boolean }[];
  cta: string;
  highlighted: boolean;
}

const PLANS: PlanDef[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Perfect for getting started",
    highlighted: false,
    cta: "Current Plan",
    features: [
      { text: "Up to 3 active projects", included: true },
      { text: "Up to 3 team members", included: true },
      { text: "Time tracking & clock in/out", included: true },
      { text: "Photo uploads per project", included: true },
      { text: "Expense tracking", included: true },
      { text: "Subcontractor invoices", included: true },
      { text: "Advanced financial reports", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    period: "/ month",
    tagline: "For growing teams",
    highlighted: true,
    cta: "Upgrade to Pro",
    features: [
      { text: "Up to 15 active projects", included: true },
      { text: "Up to 15 team members", included: true },
      { text: "Time tracking & clock in/out", included: true },
      { text: "Photo uploads per project", included: true },
      { text: "Expense tracking", included: true },
      { text: "Subcontractor invoices", included: true },
      { text: "Advanced financial reports", included: true },
      { text: "Priority email support", included: true },
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "$149",
    period: "/ month",
    tagline: "Unlimited scale",
    highlighted: false,
    cta: "Upgrade to Business",
    features: [
      { text: "Unlimited active projects", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Time tracking & clock in/out", included: true },
      { text: "Photo uploads per project", included: true },
      { text: "Expense tracking", included: true },
      { text: "Subcontractor invoices", included: true },
      { text: "Advanced financial reports", included: true },
      { text: "Priority phone support", included: true },
    ],
  },
];

// ─── Plan badge colours ───────────────────────────────────────────────────────
const PLAN_STATUS_COLOR: Record<string, string> = {
  active: "#16a34a",
  trialing: "#0ea5e9",
  past_due: "#f59e0b",
  canceled: "#ef4444",
  inactive: "#94a3b8",
};

function planStatusLabel(status: string) {
  return (
    {
      active: "Active",
      trialing: "Trial",
      past_due: "Past Due",
      canceled: "Canceled",
      inactive: "Inactive",
    }[status] ?? status
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

  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanKey | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);

  const fetchPlanInfo = useCallback(async () => {
    try {
      const data = await apiFetch<PlanInfo>("/api/stripe/plan");
      setPlanInfo(data);
    } catch {
      // fallback to user plan from auth context
      setPlanInfo({
        plan: (user?.plan ?? "free") as PlanKey,
        planStatus: user?.planStatus ?? "active",
        stripeEnabled: false,
        hasSubscription: false,
      });
    } finally {
      setLoadingPlan(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlanInfo();
  }, [fetchPlanInfo]);

  const currentPlan = planInfo?.plan ?? (user?.plan as PlanKey) ?? "free";
  const currentStatus = planInfo?.planStatus ?? user?.planStatus ?? "active";
  const stripeEnabled = planInfo?.stripeEnabled ?? false;
  const hasSubscription = planInfo?.hasSubscription ?? false;

  const currentPlanDef = PLANS.find((p) => p.key === currentPlan) ?? PLANS[0]!;

  async function handleUpgrade(plan: PlanKey) {
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
    setUpgrading(plan);
    try {
      const data = await apiFetch<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open checkout";
      Alert.alert("Error", msg);
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageSubscription() {
    if (!isAdmin) return;
    setManagingPortal(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/stripe/portal", { method: "POST" });
      if (data.url) {
        await Linking.openURL(data.url);
      }
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
            <Text style={styles.currentPlanText}>
              {currentPlanDef.name} Plan
            </Text>
            <Text style={styles.currentPlanStatus}>
              · {planStatusLabel(currentStatus)}
            </Text>
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
            {/* Early access note */}
            {!stripeEnabled && (
              <View style={[styles.earlyAccessCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                <Feather name="gift" size={16} color={colors.primary} />
                <Text style={[styles.earlyAccessText, { color: colors.primary }]}>
                  <Text style={{ fontWeight: "700" }}>Free Early Access — </Text>
                  all features included at no charge while we're in early access. Billing activates soon.
                </Text>
              </View>
            )}

            {/* ── Plan cards ── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CHOOSE YOUR PLAN</Text>

            {PLANS.map((plan) => {
              const isCurrent = plan.key === currentPlan;
              const isHighlighted = plan.highlighted;
              const isDowngrade = (
                (currentPlan === "business" && plan.key !== "business") ||
                (currentPlan === "pro" && plan.key === "free")
              );
              const canUpgrade = plan.key !== "free" && !isCurrent && !isDowngrade && isAdmin;

              return (
                <View
                  key={plan.key}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrent
                        ? colors.primary
                        : isHighlighted
                        ? colors.primary + "40"
                        : colors.border,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  {/* Most popular badge */}
                  {isHighlighted && (
                    <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="star" size={10} color="#fff" />
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}

                  {/* Plan header */}
                  <View style={styles.planHeader}>
                    <View style={styles.planNameRow}>
                      <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}>
                          <Feather name="check" size={10} color={colors.primary} />
                          <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>{plan.tagline}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceAmount, { color: colors.foreground }]}>{plan.price}</Text>
                      <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>{plan.period}</Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={[styles.planDivider, { backgroundColor: colors.border }]} />

                  {/* Features */}
                  <View style={styles.featureList}>
                    {plan.features.map((feat) => (
                      <View key={feat.text} style={styles.featureRow}>
                        <View style={[
                          styles.featureCheck,
                          { backgroundColor: feat.included ? "#16a34a18" : colors.muted },
                        ]}>
                          <Feather
                            name={feat.included ? "check" : "x"}
                            size={11}
                            color={feat.included ? "#16a34a" : colors.mutedForeground}
                          />
                        </View>
                        <Text style={[
                          styles.featureText,
                          { color: feat.included ? colors.foreground : colors.mutedForeground },
                        ]}>
                          {feat.text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA button */}
                  {isCurrent ? (
                    hasSubscription && isAdmin ? (
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
                            <Text style={[styles.manageBtnText, { color: colors.mutedForeground }]}>
                              Manage Subscription
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.currentPlanBtn, { backgroundColor: colors.muted }]}>
                        <Feather name="check-circle" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.currentPlanBtnText, { color: colors.mutedForeground }]}>
                          Your Current Plan
                        </Text>
                      </View>
                    )
                  ) : canUpgrade ? (
                    <TouchableOpacity
                      style={[
                        styles.upgradeBtn,
                        {
                          backgroundColor: isHighlighted ? colors.primary : "transparent",
                          borderColor: colors.primary,
                          borderWidth: isHighlighted ? 0 : 1.5,
                          opacity: !stripeEnabled ? 0.65 : 1,
                        },
                      ]}
                      onPress={() => handleUpgrade(plan.key)}
                      disabled={upgrading === plan.key}
                      activeOpacity={0.8}
                    >
                      {upgrading === plan.key ? (
                        <ActivityIndicator
                          size="small"
                          color={isHighlighted ? "#fff" : colors.primary}
                        />
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.upgradeBtnText,
                              { color: isHighlighted ? "#fff" : colors.primary },
                            ]}
                          >
                            {stripeEnabled ? plan.cta : "Coming Soon"}
                          </Text>
                          {!stripeEnabled && (
                            <Feather
                              name="clock"
                              size={13}
                              color={isHighlighted ? "#ffffffaa" : colors.primary + "aa"}
                            />
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  ) : isDowngrade ? null : (
                    <View style={[styles.currentPlanBtn, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.currentPlanBtnText, { color: colors.mutedForeground }]}>
                        Contact Admin to Upgrade
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* ── Fine print ── */}
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    gap: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 14,
  },
  popularBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
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
