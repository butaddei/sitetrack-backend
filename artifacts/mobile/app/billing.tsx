import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
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

// ─── Plan definitions ────────────────────────────────────────────────────────
// STRIPE_ENABLED: set to true when Stripe integration is activated
const STRIPE_ENABLED = false;

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: null,
    tagline: "Get started at no cost",
    badge: null,
    color: "#64748b",
    features: [
      { label: "1 active project", included: true },
      { label: "Up to 2 employees", included: true },
      { label: "Time tracking", included: true },
      { label: "Basic reports", included: true },
      { label: "Expense tracking", included: false },
      { label: "Financial P&L overview", included: false },
      { label: "Unlimited projects", included: false },
      { label: "Priority support", included: false },
    ],
    ctaLabel: "Current plan",
    isCurrent: true, // hardcoded until Stripe active
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    period: "month",
    tagline: "For growing painting businesses",
    badge: "Most Popular",
    color: "#f97316",
    features: [
      { label: "Unlimited projects", included: true },
      { label: "Up to 5 employees", included: true },
      { label: "Time tracking", included: true },
      { label: "Expense tracking", included: true },
      { label: "Full financial P&L", included: true },
      { label: "Advanced reports", included: true },
      { label: "Company branding", included: true },
      { label: "Priority support", included: false },
    ],
    ctaLabel: "Upgrade to Pro",
    isCurrent: false,
  },
  {
    id: "business",
    name: "Business",
    price: 79,
    period: "month",
    tagline: "For large teams and contractors",
    badge: null,
    color: "#6366f1",
    features: [
      { label: "Unlimited projects", included: true },
      { label: "Unlimited employees", included: true },
      { label: "Time tracking", included: true },
      { label: "Expense tracking", included: true },
      { label: "Full financial P&L", included: true },
      { label: "Advanced reports & export", included: true },
      { label: "Company branding", included: true },
      { label: "Priority support", included: true },
    ],
    ctaLabel: "Upgrade to Business",
    isCurrent: false,
  },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Current plan — when Stripe is live, derive from user.plan
  const currentPlanId = "free";
  const currentPlan = PLANS.find((p) => p.id === currentPlanId)!;

  function handleUpgrade(planId: string, planName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!STRIPE_ENABLED) {
      setSelectedPlan(planName);
      setShowComingSoon(true);
      return;
    }
    // TODO: when STRIPE_ENABLED=true, initiate Stripe checkout here
    // router.push({ pathname: "/checkout", params: { planId } });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.accent, colors.primary + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <View style={styles.heroCenter}>
          <View style={styles.heroIcon}>
            <Feather name="zap" size={28} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Plans & Billing</Text>
          <Text style={styles.heroSub}>
            Choose the plan that fits your business
          </Text>
        </View>

        {/* Current plan badge */}
        <View style={[styles.currentBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <View style={[styles.currentDot, { backgroundColor: colors.success }]} />
          <Text style={styles.currentBadgeText}>
            Current plan: <Text style={{ fontWeight: "800" }}>{currentPlan.name}</Text>
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
      >
        {/* ── Usage summary ── */}
        <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Free Plan · Usage
          </Text>
          <View style={styles.usageRow}>
            <UsageStat
              icon="folder"
              label="Projects"
              used={1}
              max={1}
              color={colors.primary}
            />
            <View style={[styles.usageDivider, { backgroundColor: colors.border }]} />
            <UsageStat
              icon="users"
              label="Employees"
              used={2}
              max={2}
              color={colors.warning}
            />
          </View>
          <View style={[styles.limitNote, { backgroundColor: colors.warning + "14", borderColor: colors.warning + "30" }]}>
            <Feather name="info" size={13} color={colors.warning} />
            <Text style={[styles.limitNoteText, { color: colors.warning }]}>
              Upgrade to unlock unlimited projects and more employees
            </Text>
          </View>
        </View>

        {/* ── Plan cards ── */}
        <Text style={[styles.plansLabel, { color: colors.mutedForeground }]}>
          Available Plans
        </Text>

        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isHighlighted = plan.badge === "Most Popular";

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={isCurrentPlan}
              isHighlighted={isHighlighted}
              colors={colors}
              onUpgrade={() => handleUpgrade(plan.id, plan.name)}
            />
          );
        })}

        {/* ── Manage billing placeholder ── */}
        {!STRIPE_ENABLED && (
          <TouchableOpacity
            style={[styles.manageBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => {
              setSelectedPlan(null);
              setShowComingSoon(true);
            }}
            activeOpacity={0.8}
          >
            <Feather name="credit-card" size={16} color={colors.mutedForeground} />
            <Text style={[styles.manageBtnText, { color: colors.mutedForeground }]}>
              Manage billing & invoices
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
          Subscriptions renew automatically each month. Cancel anytime.
          Prices shown in USD.
        </Text>
      </ScrollView>

      {/* ── Coming soon modal ── */}
      <Modal
        visible={showComingSoon}
        animationType="fade"
        transparent
        onRequestClose={() => setShowComingSoon(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowComingSoon(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.comingSoonIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="zap" size={32} color={colors.primary} />
            </View>

            <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>
              Coming Soon
            </Text>
            <Text style={[styles.comingSoonBody, { color: colors.mutedForeground }]}>
              {selectedPlan
                ? `${selectedPlan} plan payments are not yet available.`
                : "Billing management is not yet available."}{" "}
              We're integrating Stripe and will notify you as soon as billing goes live.
            </Text>

            <TouchableOpacity
              style={[styles.comingSoonBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowComingSoon(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.comingSoonBtnText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isCurrentPlan,
  isHighlighted,
  colors,
  onUpgrade,
}: {
  plan: (typeof PLANS)[number];
  isCurrentPlan: boolean;
  isHighlighted: boolean;
  colors: any;
  onUpgrade: () => void;
}) {
  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: colors.card,
          borderColor: isHighlighted ? plan.color : colors.border,
          borderWidth: isHighlighted ? 2 : 1,
        },
      ]}
    >
      {/* Popular badge */}
      {plan.badge ? (
        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
          <Feather name="star" size={11} color="#fff" />
          <Text style={styles.popularBadgeText}>{plan.badge}</Text>
        </View>
      ) : null}

      {/* Plan header */}
      <View style={styles.planHeader}>
        <View>
          <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
          <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>
            {plan.tagline}
          </Text>
        </View>
        <View style={styles.planPriceBlock}>
          {plan.price === 0 ? (
            <Text style={[styles.planPrice, { color: colors.foreground }]}>Free</Text>
          ) : (
            <>
              <Text style={[styles.planPriceDollar, { color: plan.color }]}>$</Text>
              <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
              <Text style={[styles.planPricePer, { color: colors.mutedForeground }]}>
                /mo
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.planDivider, { backgroundColor: colors.border }]} />

      {/* Features */}
      <View style={styles.featuresList}>
        {plan.features.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                {
                  backgroundColor: f.included
                    ? plan.color + "18"
                    : colors.muted,
                },
              ]}
            >
              <Feather
                name={f.included ? "check" : "x"}
                size={12}
                color={f.included ? plan.color : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.featureLabel,
                {
                  color: f.included ? colors.foreground : colors.mutedForeground,
                  textDecorationLine: f.included ? "none" : "none",
                },
              ]}
            >
              {f.label}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA button */}
      {isCurrentPlan ? (
        <View style={[styles.currentPlanBtn, { backgroundColor: colors.success + "14", borderColor: colors.success + "30" }]}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.currentPlanBtnText, { color: colors.success }]}>
            Your current plan
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.upgradeBtn,
            {
              backgroundColor: isHighlighted ? plan.color : "transparent",
              borderColor: plan.color,
              borderWidth: isHighlighted ? 0 : 1.5,
            },
          ]}
          onPress={onUpgrade}
          activeOpacity={0.85}
        >
          <Feather
            name="zap"
            size={15}
            color={isHighlighted ? "#fff" : plan.color}
          />
          <Text
            style={[
              styles.upgradeBtnText,
              { color: isHighlighted ? "#fff" : plan.color },
            ]}
          >
            {plan.ctaLabel}
          </Text>
          {!STRIPE_ENABLED && (
            <View style={[styles.comingSoonPill, { backgroundColor: isHighlighted ? "rgba(255,255,255,0.2)" : plan.color + "20" }]}>
              <Text style={[styles.comingSoonPillText, { color: isHighlighted ? "#fff" : plan.color }]}>
                Soon
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Usage stat ───────────────────────────────────────────────────────────────
function UsageStat({
  icon,
  label,
  used,
  max,
  color,
}: {
  icon: string;
  label: string;
  used: number;
  max: number;
  color: string;
}) {
  const colors = useColors();
  const pct = Math.min(1, used / max);
  const atLimit = used >= max;

  return (
    <View style={styles.usageStat}>
      <View style={styles.usageStatHeader}>
        <Feather name={icon as any} size={13} color={color} />
        <Text style={[styles.usageStatLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.usageStatValue, { color: atLimit ? colors.destructive : colors.foreground }]}>
        {used} / {max}
      </Text>
      <View style={[styles.usageBar, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.usageBarFill,
            {
              width: `${pct * 100}%` as any,
              backgroundColor: atLimit ? colors.destructive : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCenter: { alignItems: "center", gap: 8 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.65)", textAlign: "center" },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  currentDot: { width: 8, height: 8, borderRadius: 4 },
  currentBadgeText: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600" },

  // Scroll
  scroll: { padding: 16, gap: 14 },

  // Usage card
  usageCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  usageRow: { flexDirection: "row", alignItems: "center" },
  usageDivider: { width: 1, height: 52, marginHorizontal: 16 },
  usageStat: { flex: 1, gap: 6 },
  usageStatHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  usageStatLabel: { fontSize: 12, fontWeight: "500" },
  usageStatValue: { fontSize: 20, fontWeight: "800" },
  usageBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  usageBarFill: { height: "100%", borderRadius: 3 },
  limitNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  limitNoteText: { fontSize: 12, flex: 1, fontWeight: "500" },

  plansLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginLeft: 2,
  },

  // Plan card
  planCard: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
    position: "relative",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  popularBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingRight: 80,
  },
  planName: { fontSize: 20, fontWeight: "800" },
  planTagline: { fontSize: 12, marginTop: 3 },
  planPriceBlock: { flexDirection: "row", alignItems: "flex-end", gap: 1 },
  planPriceDollar: { fontSize: 18, fontWeight: "700", paddingBottom: 3 },
  planPrice: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  planPricePer: { fontSize: 13, fontWeight: "500", paddingBottom: 5 },
  planDivider: { height: 1 },
  featuresList: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { fontSize: 14, flex: 1 },

  // CTA buttons
  currentPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  currentPlanBtnText: { fontSize: 15, fontWeight: "700" },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: "700" },
  comingSoonPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    marginLeft: 2,
  },
  comingSoonPillText: { fontSize: 10, fontWeight: "800" },

  // Manage billing row
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  manageBtnText: { flex: 1, fontSize: 14, fontWeight: "500" },

  legalNote: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
  },

  // Coming soon modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  comingSoonCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  comingSoonIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  comingSoonTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  comingSoonBody: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  comingSoonBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  comingSoonBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
