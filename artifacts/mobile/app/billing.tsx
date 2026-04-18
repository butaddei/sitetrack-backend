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

// ─── Included features list ───────────────────────────────────────────────────
const INCLUDED_FEATURES = [
  "Unlimited active projects",
  "Unlimited team members",
  "Time tracking & clock in/out",
  "Photo uploads per project",
  "Expense tracking",
  "Subcontractor invoice generation",
  "Advanced financial reports",
  "Company branding & customisation",
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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

      {/* ─── Body ───────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Free Early Access card ── */}
        <View style={[styles.accessCard, { backgroundColor: colors.card, borderColor: colors.primary + "50" }]}>

          {/* Icon + heading */}
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "16" }]}>
            <Feather name="gift" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Free Early Access
          </Text>
          <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
            All features are currently available at no charge. Enjoy full access to everything SiteTrack has to offer while we're in early access.
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Feature list */}
          <Text style={[styles.featuresLabel, { color: colors.mutedForeground }]}>
            EVERYTHING INCLUDED
          </Text>

          <View style={styles.featureList}>
            {INCLUDED_FEATURES.map((feat) => (
              <View key={feat} style={styles.featureRow}>
                <View style={[styles.featureCheck, { backgroundColor: "#16a34a18" }]}>
                  <Feather name="check" size={12} color="#16a34a" />
                </View>
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Footer note ── */}
        <View style={[styles.footerNote, { borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>
            SiteTrack is currently free for all users. We'll notify you before any changes to pricing or access.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

  content: { padding: 16, gap: 12 },

  accessCard: {
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 4,
  },

  divider: { height: 1, width: "100%", marginVertical: 22 },

  featuresLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginBottom: 14,
  },

  featureList: { gap: 11, width: "100%" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 14, fontWeight: "500", flex: 1 },

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
