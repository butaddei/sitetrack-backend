import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const INCLUDED_FEATURES = [
  { icon: "folder", text: "Unlimited projects" },
  { icon: "users", text: "Unlimited team members" },
  { icon: "clock", text: "Time tracking & clock in/out" },
  { icon: "bar-chart-2", text: "Financial reports & payroll" },
  { icon: "image", text: "Photo uploads per project" },
  { icon: "file-text", text: "Expense tracking" },
  { icon: "bell", text: "Push notifications" },
  { icon: "shield", text: "Role-based access control" },
];

export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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
            <Text style={styles.headerTitle}>Early Access</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.earlyBadge}>
            <Feather name="zap" size={13} color="#f97316" />
            <Text style={styles.earlyBadgeText}>Free Early Access</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.primary + "35" }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="gift" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Everything included, free.
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            During our early access period, all SiteTrack features are completely free to use — no credit card required.
          </Text>
        </View>

        {/* Features list */}
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WHAT'S INCLUDED</Text>
          {INCLUDED_FEATURES.map((item) => (
            <View key={item.text} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={item.icon as any} size={15} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{item.text}</Text>
              <Feather name="check" size={15} color="#16a34a" />
            </View>
          ))}
        </View>

        {/* Coming soon note */}
        <View style={[styles.noteCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Subscription plans are coming soon. Early access users will receive priority pricing when billing launches.
          </Text>
        </View>
      </ScrollView>
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
  badgeRow: { alignItems: "flex-start" },
  earlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(249,115,22,0.2)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  earlyBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  content: { padding: 16, gap: 12 },
  heroCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, textAlign: "center" },
  heroSub: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
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
    marginBottom: 2,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, fontSize: 14, fontWeight: "500" },
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
