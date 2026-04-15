import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Project, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ─── Status accent colors ─────────────────────────────────────────────────────
const STATUS_ACCENT: Record<string, string> = {
  in_progress: "#f97316",
  completed: "#16a34a",
  pending: "#d97706",
  on_hold: "#94a3b8",
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, employees, timeLogs, getProjectLaborCost, getProjectExpenses, isLoading } =
    useData();

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Financials ──
  const totalRevenue = projects.reduce((s, p) => s + (p.totalValue ?? 0), 0);
  const totalLaborCost = projects.reduce((s, p) => s + getProjectLaborCost(p.id), 0);
  const totalExpenses = projects.reduce((s, p) => s + getProjectExpenses(p.id), 0);
  const totalCost = totalLaborCost + totalExpenses;
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const profitPositive = profit >= 0;

  // ── Counts ──
  const activeProjects = projects.filter((p) => p.status === "in_progress").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive).length;
  const onSite = timeLogs.filter((l) => !l.clockOut).length;

  // ── Sorted projects (in_progress first) ──
  const sortedProjects = [...projects].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, on_hold: 2, completed: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const heroGradient: [string, string] = profitPositive
    ? ["#15803d", "#16a34a"]
    : ["#b91c1c", "#dc2626"];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad + 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greetText, { color: colors.mutedForeground }]}>
            {greeting()}
          </Text>
          <Text style={[styles.nameText, { color: colors.foreground }]}>
            {user?.name?.split(" ")[0]}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/billing")}
            activeOpacity={0.75}
            style={[styles.planChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", flexDirection: "row", alignItems: "center", gap: 4 }]}
          >
            <Feather name="zap" size={11} color={colors.primary} />
            <Text style={[styles.planChipText, { color: colors.primary }]}>
              {user?.plan === "pro" ? "Pro Plan" : user?.plan === "business" ? "Business Plan" : "Free Early Access"}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/profile-settings")}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* ─── Profit Hero ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profitCard}
        >
          {/* decorative circle */}
          <View style={styles.heroOrb} />
          <View style={styles.heroOrbSmall} />

          <View style={styles.profitHeader}>
            <View style={styles.profitLabelRow}>
              <Feather
                name={profitPositive ? "trending-up" : "trending-down"}
                size={14}
                color="rgba(255,255,255,0.75)"
              />
              <Text style={styles.profitLabelText}>Net Profit</Text>
            </View>
            <View style={styles.marginPill}>
              <Text style={styles.marginPillText}>
                {profitPositive ? "+" : ""}{margin.toFixed(1)}% margin
              </Text>
            </View>
          </View>

          <Text style={styles.profitAmount}>
            {profit < 0 ? "-" : ""}{fmt(Math.abs(profit))}
          </Text>

          <View style={styles.profitFooter}>
            <Text style={styles.profitSub}>
              across {projects.length} project{projects.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </LinearGradient>

        {/* ─── Revenue + Cost ──────────────────────────────────────────── */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Total Revenue"
            value={fmt(totalRevenue)}
            icon="arrow-up-circle"
            iconColor={colors.primary}
            iconBg={colors.primary + "16"}
            colors={colors}
          />
          <MetricCard
            label="Total Cost"
            value={fmt(totalCost)}
            icon="arrow-down-circle"
            iconColor={colors.warning}
            iconBg={colors.warning + "18"}
            colors={colors}
          />
        </View>

        {/* ─── Activity strip ──────────────────────────────────────────── */}
        <View style={[styles.activityStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityStat value={activeProjects} label="Active" color={colors.primary} />
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <ActivityStat value={completedProjects} label="Done" color={colors.success} />
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <ActivityStat value={activeEmployees} label="Team" color={colors.foreground} />
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <ActivityStat
            value={onSite}
            label="On Site"
            color={onSite > 0 ? colors.success : colors.mutedForeground}
            pulsing={onSite > 0}
          />
        </View>

        {/* ─── Quick Actions ───────────────────────────────────────────── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/projects")}
            activeOpacity={0.85}
          >
            <View style={styles.actionBtnIcon}>
              <Feather name="plus" size={16} color="#fff" />
            </View>
            <Text style={styles.actionBtnLabel}>Create Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary, {
              backgroundColor: colors.card,
              borderColor: colors.border,
            }]}
            onPress={() => router.push("/(tabs)/employees")}
            activeOpacity={0.85}
          >
            <View style={[styles.actionBtnIcon, { backgroundColor: colors.muted }]}>
              <Feather name="user-plus" size={15} color={colors.foreground} />
            </View>
            <Text style={[styles.actionBtnLabel, { color: colors.foreground }]}>Add Employee</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Projects Section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Projects</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/projects")} activeOpacity={0.7}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>View all →</Text>
            </TouchableOpacity>
          </View>

          {sortedProjects.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="folder" size={26} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No projects yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap "Create Project" above to get started
              </Text>
            </View>
          ) : (
            <View style={[styles.projectsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {sortedProjects.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  profit={(p.totalValue ?? 0) - getProjectLaborCost(p.id) - getProjectExpenses(p.id)}
                  isLast={i === sortedProjects.length - 1}
                  onPress={() => router.push({ pathname: "/project/[id]", params: { id: p.id } })}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  label, value, icon, iconColor, iconBg, colors,
}: {
  label: string; value: string; icon: string;
  iconColor: string; iconBg: string; colors: any;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Activity Stat ────────────────────────────────────────────────────────────
function ActivityStat({
  value, label, color, pulsing,
}: {
  value: number; label: string; color: string; pulsing?: boolean;
}) {
  return (
    <View style={styles.activityStat}>
      {pulsing ? (
        <View style={styles.pulseRow}>
          <View style={[styles.pulseDot, { backgroundColor: color }]} />
          <Text style={[styles.activityValue, { color }]}>{value}</Text>
        </View>
      ) : (
        <Text style={[styles.activityValue, { color }]}>{value}</Text>
      )}
      <Text style={[styles.activityLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Project Row ──────────────────────────────────────────────────────────────
function ProjectRow({
  project, profit, isLast, onPress, colors,
}: {
  project: Project; profit: number; isLast: boolean;
  onPress: () => void; colors: any;
}) {
  const accentColor = STATUS_ACCENT[project.status] ?? colors.mutedForeground;
  const profitPositive = profit >= 0;

  return (
    <TouchableOpacity
      style={[
        styles.projRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.projAccent, { backgroundColor: accentColor }]} />
      <View style={styles.projName}>
        <Text style={[styles.projNameText, { color: colors.foreground }]} numberOfLines={1}>
          {project.name}
        </Text>
      </View>
      <View style={styles.projMeta}>
        <StatusBadge status={project.status} />
        <Text style={[styles.projProfit, { color: profitPositive ? colors.success : colors.destructive }]}>
          {profitPositive ? "+" : "-"}{fmt(Math.abs(profit))}
        </Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  headerLeft: { gap: 1 },
  greetText: { fontSize: 13, fontWeight: "500" },
  nameText: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, marginTop: 1 },
  planChip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1, marginTop: 6 },
  planChipText: { fontSize: 11, fontWeight: "700" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  body: { paddingHorizontal: 16, gap: 14 },

  // Profit hero
  profitCard: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    position: "relative",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  heroOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -70,
    right: -50,
  },
  heroOrbSmall: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: 20,
  },
  profitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profitLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profitLabelText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  marginPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  marginPillText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  profitAmount: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -2.5,
    marginTop: 4,
  },
  profitFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  profitSub: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },

  // Metric cards
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  metricLabel: { fontSize: 12, fontWeight: "500" },

  // Activity strip
  activityStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityStat: { flex: 1, alignItems: "center", gap: 4 },
  pulseRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  pulseDot: { width: 7, height: 7, borderRadius: 4 },
  activityValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  activityLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.65,
  },
  stripDivider: { width: 1, height: 40 },

  // Quick actions
  quickActions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnSecondary: {
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Section
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  // Empty card
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  // Projects card
  projectsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  projRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingRight: 16,
    paddingLeft: 0,
    gap: 13,
  },
  projAccent: {
    width: 4,
    alignSelf: "stretch",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginLeft: 14,
  },
  projName: { flex: 1, minWidth: 0 },
  projNameText: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  projMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  projProfit: { fontSize: 14, fontWeight: "800", minWidth: 54, textAlign: "right" },
});
