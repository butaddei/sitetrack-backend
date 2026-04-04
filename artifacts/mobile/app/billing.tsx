import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth, type PlanType } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { apiFetch, ApiError } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface PlanInfo {
  plan: PlanType;
  planStatus: string;
  stripeEnabled: boolean;
  hasSubscription: boolean;
}

interface PricingPlan {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  description: string;
  color: string;
  features: string[];
  limit: { projects: number | null; employees: number | null };
  badge?: string;
}

const PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    color: "#64748b",
    features: [
      "Up to 3 projects",
      "Up to 3 employees",
      "Time tracking & photo uploads",
      "Basic reports",
    ],
    limit: { projects: 3, employees: 3 },
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/ month",
    description: "For growing painting businesses",
    color: "#f97316",
    badge: "Most Popular",
    features: [
      "Up to 15 projects",
      "Up to 15 employees",
      "Advanced financial reports",
      "Full expense tracking",
      "Priority support",
      "Everything in Free",
    ],
    limit: { projects: 15, employees: 15 },
  },
  {
    id: "business",
    name: "Business",
    price: "$79",
    period: "/ month",
    description: "For large-scale operations",
    color: "#7c3aed",
    features: [
      "Unlimited projects",
      "Unlimited employees",
      "Custom branding",
      "Advanced analytics",
      "Dedicated support",
      "Everything in Pro",
    ],
    limit: { projects: null, employees: null },
  },
];

const PLAN_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  trialing: "Trial",
  past_due: "Past Due",
  canceled: "Canceled",
};

export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { projects, employees } = useData();

  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanType | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const currentPlan = (user?.plan ?? "free") as PlanType;

  const fetchPlan = useCallback(async () => {
    try {
      const data = await apiFetch<PlanInfo>("/stripe/plan");
      setPlanInfo(data);
      updateUser({ plan: data.plan });
    } catch {
      setPlanInfo({
        plan: currentPlan,
        planStatus: user?.planStatus ?? "active",
        stripeEnabled: false,
        hasSubscription: false,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPlan, user?.planStatus]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  async function handleUpgrade(plan: PlanType) {
    if (plan === "free") return;

    if (!planInfo?.stripeEnabled) {
      Alert.alert(
        "Billing Not Configured",
        "Stripe billing is not set up yet. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the server environment to enable payments.",
        [{ text: "OK" }]
      );
      return;
    }

    setUpgrading(plan);
    try {
      const { url } = await apiFetch<{ url: string }>("/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (url) await Linking.openURL(url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to start checkout. Please try again.";
      Alert.alert("Checkout Error", message);
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageSubscription() {
    if (!planInfo?.stripeEnabled) {
      Alert.alert(
        "Billing Not Configured",
        "Stripe billing is not set up yet.",
        [{ text: "OK" }]
      );
      return;
    }

    setManagingPortal(true);
    try {
      const { url } = await apiFetch<{ url: string }>("/stripe/portal", {
        method: "POST",
      });
      if (url) await Linking.openURL(url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to open billing portal.";
      Alert.alert("Portal Error", message);
    } finally {
      setManagingPortal(false);
    }
  }

  const activePlan = PLANS.find((p) => p.id === currentPlan) ?? PLANS[0]!;
  const projectCount = projects.length;
  const employeeCount = employees.length;
  const planStatusLabel = PLAN_STATUS_LABEL[planInfo?.planStatus ?? "active"] ?? "Active";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.accent, colors.accent + "e0"]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Plans & Billing</Text>
          </View>
          {planInfo?.hasSubscription ? (
            <TouchableOpacity
              onPress={handleManageSubscription}
              hitSlop={8}
              style={styles.manageBtn}
              disabled={managingPortal}
            >
              {managingPortal ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.manageBtnText}>Manage</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.manageBtn} />
          )}
        </View>

        <View style={styles.currentPlanRow}>
          <View style={[styles.currentPlanBadge, { backgroundColor: activePlan.color + "28", borderColor: activePlan.color + "45" }]}>
            <View style={[styles.currentPlanDot, { backgroundColor: activePlan.color }]} />
            <Text style={styles.currentPlanText}>
              {activePlan.name} plan
            </Text>
            {planInfo?.planStatus && planInfo.planStatus !== "active" ? (
              <View style={[styles.statusTag, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Text style={styles.statusTagText}>{planStatusLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPlan(); }}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Usage card */}
            <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CURRENT USAGE</Text>
              <View style={styles.usageRow}>
                <UsageStat
                  label="Projects"
                  current={projectCount}
                  max={activePlan.limit.projects}
                  color={colors.primary}
                  colors={colors}
                />
                <View style={[styles.usageDivider, { backgroundColor: colors.border }]} />
                <UsageStat
                  label="Employees"
                  current={employeeCount}
                  max={activePlan.limit.employees}
                  color={colors.accent}
                  colors={colors}
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 4 }]}>
              CHOOSE YOUR PLAN
            </Text>

            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isUpgrade = !isCurrent && plan.id !== "free";
              const isDowngrade = plan.id === "free" && currentPlan !== "free";
              const busy = upgrading === plan.id;

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrent ? plan.color : colors.border,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  {plan.badge ? (
                    <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                      <Text style={styles.popularBadgeText}>{plan.badge}</Text>
                    </View>
                  ) : null}

                  {isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: plan.color }]}>
                      <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
                    </View>
                  ) : null}

                  <View style={styles.planTop}>
                    <View style={styles.planTopLeft}>
                      <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                      <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>{plan.description}</Text>
                    </View>
                    <View style={styles.priceWrap}>
                      <Text style={[styles.priceAmount, { color: plan.color }]}>{plan.price}</Text>
                      <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>{plan.period}</Text>
                    </View>
                  </View>

                  <View style={[styles.featureDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.featureList}>
                    {plan.features.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <View style={[styles.featureCheck, { backgroundColor: plan.color + "18" }]}>
                          <Feather name="check" size={11} color={plan.color} />
                        </View>
                        <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {isUpgrade ? (
                    <TouchableOpacity
                      style={[styles.upgradeBtn, { backgroundColor: plan.color }]}
                      onPress={() => handleUpgrade(plan.id)}
                      disabled={!!upgrading}
                      activeOpacity={0.85}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="zap" size={15} color="#fff" />
                          <Text style={styles.upgradeBtnText}>Upgrade to {plan.name}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : isDowngrade ? (
                    <View style={[styles.managePlanBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Text style={[styles.managePlanBtnText, { color: colors.mutedForeground }]}>
                        Manage subscription to downgrade
                      </Text>
                    </View>
                  ) : isCurrent ? (
                    <View style={[styles.activeBtn, { backgroundColor: plan.color + "15" }]}>
                      <Feather name="check-circle" size={15} color={plan.color} />
                      <Text style={[styles.activeBtnText, { color: plan.color }]}>Your current plan</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={[styles.noteCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="shield" size={14} color={colors.mutedForeground} />
              <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
                Payments are processed securely via Stripe. Cancel anytime — no long-term contracts required.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function UsageStat({
  label, current, max, color, colors,
}: {
  label: string;
  current: number;
  max: number | null;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  const pct = max ? Math.min(current / max, 1) : 0;
  const atLimit = max !== null && current >= max;

  return (
    <View style={styles.usageStat}>
      <View style={styles.usageStatHeader}>
        <Text style={[styles.usageLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.usageCount, { color: atLimit ? "#dc2626" : colors.foreground }]}>
          {current}{max !== null ? ` / ${max}` : " / ∞"}
        </Text>
      </View>
      {max !== null ? (
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(pct * 100)}%` as `${number}%`,
                backgroundColor: atLimit ? "#dc2626" : color,
              },
            ]}
          />
        </View>
      ) : (
        <Text style={[styles.unlimitedText, { color }]}>Unlimited</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  manageBtn: { width: 70, alignItems: "flex-end" },
  manageBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  currentPlanRow: { alignItems: "flex-start" },
  currentPlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  currentPlanDot: { width: 8, height: 8, borderRadius: 4 },
  currentPlanText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  statusTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  content: { padding: 16, gap: 12 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  usageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  usageRow: { flexDirection: "row" },
  usageDivider: { width: 1, marginHorizontal: 16 },
  usageStat: { flex: 1, gap: 8 },
  usageStatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  usageLabel: { fontSize: 13, fontWeight: "500" },
  usageCount: { fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 100, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 100 },
  unlimitedText: { fontSize: 12, fontWeight: "600" },
  planCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderBottomRightRadius: 12,
  },
  popularBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  currentBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
  },
  currentBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  planTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 },
  planTopLeft: { flex: 1 },
  planName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  planDesc: { fontSize: 12, marginTop: 3 },
  priceWrap: { alignItems: "flex-end" },
  priceAmount: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  pricePeriod: { fontSize: 12, marginTop: 2, textAlign: "right" },
  featureDivider: { height: 1 },
  featureList: { gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 13, fontWeight: "500", flex: 1 },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  upgradeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  managePlanBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  managePlanBtnText: { fontSize: 12, fontWeight: "500" },
  activeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
  },
  activeBtnText: { fontSize: 14, fontWeight: "700" },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  noteText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
