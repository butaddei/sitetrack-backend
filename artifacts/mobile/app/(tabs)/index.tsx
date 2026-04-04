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
  const activeProjects = projects.filter((p) => p.status === "in_progress");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive);
  const onSiteLogs = timeLogs.filter((l) => !l.clockOut);

  // ── Project list for dashboard (sorted: in_progress first, then pending, completed last) ──
  const sortedProjects = [...projects].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top header bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greetText, { color: colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[styles.nameText, { color: colors.foreground }]}>
            {user?.name?.split(" ")[0]}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/profile-settings")}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* ── PROFIT HERO ── */}
        <LinearGradient
          colors={
            profitPositive
              ? [colors.success, colors.success + "CC"]
              : [colors.destructive, colors.destructive + "CC"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profitHero}
        >
          {/* Decorative orb */}
          <View style={styles.heroOrb} />

          <View style={styles.profitTopRow}>
            <View style={styles.profitLabelRow}>
              <Feather name="trending-up" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.profitLabel}>Net Profit</Text>
            </View>
            <View style={styles.marginBadge}>
              <Text style={styles.marginBadgeText}>{margin.toFixed(1)}% margin</Text>
            </View>
          </View>

          <Text style={styles.profitAmount}>
            {profit < 0 ? "-" : ""}{fmt(Math.abs(profit))}
          </Text>
          <Text style={styles.profitSub}>across all {projects.length} project{projects.length !== 1 ? "s" : ""}</Text>
        </LinearGradient>

        {/* ── Revenue & Cost ── */}
        <View style={styles.metricsRow}>
          <MetricCard
            icon="arrow-up-circle"
            label="Total Revenue"
            value={fmt(totalRevenue)}
            iconColor={colors.primary}
            iconBg={colors.primary + "15"}
            colors={colors}
          />
          <MetricCard
            icon="arrow-down-circle"
            label="Total Cost"
            value={fmt(totalCost)}
            iconColor={colors.warning}
            iconBg={colors.warning + "18"}
            colors={colors}
          />
        </View>

        {/* ── Status counts ── */}
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StatPill icon="briefcase" value={activeProjects.length} label="Active" color={colors.primary} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatPill icon="check-circle" value={completedProjects.length} label="Done" color={colors.success} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatPill icon="users" value={activeEmployees.length} label="Team" color={colors.foreground} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatPill
            icon="radio"
            value={onSiteLogs.length}
            label="On Site"
            color={onSiteLogs.length > 0 ? colors.success : colors.mutedForeground}
            colors={colors}
            pulse={onSiteLogs.length > 0}
          />
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/projects")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.qaBtnText}>Create Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qaBtn, styles.qaBtnOutline, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push("/(tabs)/employees")}
            activeOpacity={0.85}
          >
            <Feather name="user-plus" size={16} color={colors.foreground} />
            <Text style={[styles.qaBtnText, { color: colors.foreground }]}>Add Employee</Text>
          </TouchableOpacity>
        </View>

        {/* ── Projects list ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Projects</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/projects")} activeOpacity={0.7}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>

          {sortedProjects.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="folder" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No projects yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap "Create Project" to get started
              </Text>
            </View>
          ) : (
            <View style={[styles.projectsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {sortedProjects.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  labor={getProjectLaborCost(p.id)}
                  expense={getProjectExpenses(p.id)}
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

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
  colors: any;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  value,
  label,
  color,
  colors,
  pulse,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
  colors: any;
  pulse?: boolean;
}) {
  return (
    <View style={styles.statPill}>
      <View style={styles.statIconRow}>
        {pulse && value > 0 && <View style={[styles.pulseDot, { backgroundColor: color }]} />}
        <Feather name={icon as any} size={13} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Project row ──────────────────────────────────────────────────────────────
function ProjectRow({
  project,
  labor,
  expense,
  isLast,
  onPress,
  colors,
}: {
  project: Project;
  labor: number;
  expense: number;
  isLast: boolean;
  onPress: () => void;
  colors: any;
}) {
  const totalCost = labor + expense;
  const profit = (project.totalValue ?? 0) - totalCost;
  const profitPositive = profit >= 0;

  return (
    <TouchableOpacity
      style={[styles.projRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.projRowLeft}>
        <Text style={[styles.projRowName, { color: colors.foreground }]} numberOfLines={1}>
          {project.name}
        </Text>
        {project.address ? (
          <Text style={[styles.projRowAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
            {project.address}
          </Text>
        ) : null}
      </View>
      <View style={styles.projRowRight}>
        <StatusBadge status={project.status} />
        <Text
          style={[
            styles.projRowProfit,
            { color: profitPositive ? colors.success : colors.destructive },
          ]}
        >
          {profit < 0 ? "-" : "+"}{fmt(Math.abs(profit))}
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

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greetText: { fontSize: 13, fontWeight: "500" },
  nameText: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 1 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  body: { paddingHorizontal: 16, gap: 14 },

  // Profit hero
  profitHero: {
    borderRadius: 24,
    padding: 24,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  heroOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -60,
  },
  profitTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profitLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profitLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  marginBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  marginBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  profitAmount: {
    fontSize: 52,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -2,
    marginTop: 4,
  },
  profitSub: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },

  // Metrics row
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  metricLabel: { fontSize: 12, fontWeight: "500" },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statPill: { flex: 1, alignItems: "center", gap: 3 },
  statIconRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  statDivider: { width: 1, height: 36 },

  // Quick actions
  quickActions: { flexDirection: "row", gap: 10 },
  qaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  qaBtnOutline: { borderWidth: 1.5, shadowOpacity: 0 },
  qaBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Section
  section: { gap: 10 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  // Empty state
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptySub: { fontSize: 13, textAlign: "center" },

  // Projects list
  projectsList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  projRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  projRowLeft: { flex: 1, gap: 3 },
  projRowName: { fontSize: 15, fontWeight: "700" },
  projRowAddr: { fontSize: 12 },
  projRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  projRowProfit: { fontSize: 14, fontWeight: "800", minWidth: 56, textAlign: "right" },
});
