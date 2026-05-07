import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
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

import { useColors } from "@/hooks/useColors";
import { useSubscription, PLAN_LABELS, PLAN_LIMITS, type PlanTier } from "@/lib/revenuecat";

const PRIVACY_URL = "https://sitetrack.online/privacy";
const TERMS_URL = "https://sitetrack.online/terms";

const PLAN_ICON: Record<PlanTier, string> = {
  free: "slash",
  basic: "star",
  pro: "zap",
  business: "briefcase",
};

const PLAN_COLOR: Record<PlanTier, string> = {
  free: "#94a3b8",
  basic: "#3b82f6",
  pro: "#f97316",
  business: "#8b5cf6",
};

export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentPlan, isSubscribed, isLoading, restore, isRestoring, refetchCustomerInfo } = useSubscription();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const planColor = PLAN_COLOR[currentPlan];
  const planLabel = PLAN_LABELS[currentPlan];
  const planLimits = PLAN_LIMITS[currentPlan];

  async function handleRestore() {
    try {
      await restore();
      await refetchCustomerInfo();
      Alert.alert("Purchases Restored", "Your subscription status has been updated.");
    } catch {
      Alert.alert("Restore Failed", "No purchases found for this account.");
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
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* ── Current plan card ── */}
            <View style={[styles.currentCard, { backgroundColor: colors.card, borderColor: planColor + "60" }]}>
              <View style={[styles.planIconWrap, { backgroundColor: planColor + "18" }]}>
                <Feather name={PLAN_ICON[currentPlan] as any} size={28} color={planColor} />
              </View>

              <Text style={[styles.currentPlanLabel, { color: colors.mutedForeground }]}>CURRENT PLAN</Text>
              <Text style={[styles.currentPlanName, { color: planColor }]}>{planLabel}</Text>

              {isSubscribed ? (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.limitsRow}>
                    <View style={styles.limitItem}>
                      <Feather name="users" size={14} color={planColor} />
                      <Text style={[styles.limitText, { color: colors.foreground }]}>{planLimits.employees}</Text>
                    </View>
                    <View style={[styles.limitDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.limitItem}>
                      <Feather name="briefcase" size={14} color={planColor} />
                      <Text style={[styles.limitText, { color: colors.foreground }]}>{planLimits.projects}</Text>
                    </View>
                  </View>
                  <Text style={[styles.manageTip, { color: colors.mutedForeground }]}>
                    To cancel or change your plan, go to{"\n"}iPhone Settings → Apple ID → Subscriptions.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.noSubText, { color: colors.mutedForeground }]}>
                    You don't have an active subscription.{"\n"}Subscribe to unlock full access.
                  </Text>
                  <TouchableOpacity
                    style={[styles.upgradeBtn]}
                    onPress={() => router.push("/paywall")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.upgradeBtnInner}
                    >
                      <Feather name="zap" size={16} color="#fff" />
                      <Text style={styles.upgradeBtnText}>View Plans</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* ── Restore Purchases ── */}
            <TouchableOpacity
              style={[styles.restoreBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleRestore}
              disabled={isRestoring}
              activeOpacity={0.8}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.restoreBtnText, { color: colors.mutedForeground }]}>Restore Purchases</Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Apple compliance ── */}
            <View style={[styles.disclaimer, { borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Payment will be charged to your Apple ID account. Manage or cancel anytime in Apple ID Settings.
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

  content: { padding: 16, gap: 12 },

  currentCard: {
    borderRadius: 18,
    padding: 24,
    borderWidth: 1.5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  planIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  currentPlanLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  currentPlanName: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },

  divider: { height: 1, width: "100%", marginVertical: 18 },

  limitsRow: { flexDirection: "row", width: "100%", marginBottom: 16 },
  limitItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  limitDivider: { width: 1 },
  limitText: { fontSize: 13, fontWeight: "600" },

  manageTip: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 },

  noSubText: { fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 8, marginBottom: 18 },

  upgradeBtn: { borderRadius: 12, overflow: "hidden", width: "100%" },
  upgradeBtnInner: { paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  upgradeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  restoreBtnText: { fontSize: 14, fontWeight: "600" },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 17 },

  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  legalLink: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  legalSep: { fontSize: 13 },
});
