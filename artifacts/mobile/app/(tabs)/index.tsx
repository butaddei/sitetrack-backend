import { Feather } from "@expo/vector-icons";
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

import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Project, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

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

  const activeProjects = projects.filter((p) => p.status === "in_progress");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const pendingProjects = projects.filter((p) => p.status === "pending");
  const activeLogs = timeLogs.filter((l) => !l.clockOut);
  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive);

  const totalRevenue = projects.reduce((s, p) => s + (p.totalValue ?? 0), 0);
  const totalLaborCost = projects.reduce((s, p) => s + getProjectLaborCost(p.id), 0);
  const totalExpenses = projects.reduce((s, p) => s + getProjectExpenses(p.id), 0);
  const totalCost = totalLaborCost + totalExpenses;
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
  };

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: botPad + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.username}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/profile-settings" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── P&L Hero Card ── */}
      <View style={styles.heroWrap}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>
              All Projects · P&L Overview
            </Text>
            <View
              style={[
                styles.marginPill,
                { backgroundColor: margin >= 0 ? colors.success + "18" : colors.destructive + "18" },
              ]}
            >
              <Text
                style={[
                  styles.marginPillText,
                  { color: margin >= 0 ? colors.success : colors.destructive },
                ]}
              >
                {margin.toFixed(1)}% margin
              </Text>
            </View>
          </View>

          <View style={styles.heroRow}>
            {/* Revenue */}
            <View style={styles.heroMetric}>
              <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="trending-up" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.heroValue, { color: colors.foreground }]}>
                {fmt(totalRevenue)}
              </Text>
              <Text style={[styles.heroCaption, { color: colors.mutedForeground }]}>
                Total Value
              </Text>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

            {/* Cost */}
            <View style={styles.heroMetric}>
              <View style={[styles.heroIconCircle, { backgroundColor: colors.warning + "18" }]}>
                <Feather name="layers" size={16} color={colors.warning} />
              </View>
              <Text style={[styles.heroValue, { color: colors.foreground }]}>
                {fmt(totalCost)}
              </Text>
              <Text style={[styles.heroCaption, { color: colors.mutedForeground }]}>
                Total Cost
              </Text>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

            {/* Profit */}
            <View style={styles.heroMetric}>
              <View
                style={[
                  styles.heroIconCircle,
                  {
                    backgroundColor:
                      profit >= 0 ? colors.success + "18" : colors.destructive + "18",
                  },
                ]}
              >
                <Feather
                  name={profit >= 0 ? "dollar-sign" : "alert-triangle"}
                  size={16}
                  color={profit >= 0 ? colors.success : colors.destructive}
                />
              </View>
              <Text
                style={[
                  styles.heroValue,
                  { color: profit >= 0 ? colors.success : colors.destructive },
                ]}
              >
                {profit < 0 ? "-" : ""}
                {fmt(Math.abs(profit))}
              </Text>
              <Text style={[styles.heroCaption, { color: colors.mutedForeground }]}>
                Profit
              </Text>
            </View>
          </View>

          {/* Cost breakdown bar */}
          {totalRevenue > 0 && (
            <View style={styles.costBreakdown}>
              <View style={[styles.breakdownBar, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.breakdownFillLabor,
                    {
                      width: `${Math.min(100, (totalLaborCost / totalRevenue) * 100)}%` as any,
                      backgroundColor: colors.warning,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.breakdownFillExpense,
                    {
                      width: `${Math.min(100 - (totalLaborCost / totalRevenue) * 100, (totalExpenses / totalRevenue) * 100)}%` as any,
                      backgroundColor: colors.destructive + "88",
                    },
                  ]}
                />
              </View>
              <View style={styles.breakdownLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                    Labor {fmt(totalLaborCost)}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.destructive + "88" }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                    Expenses {fmt(totalExpenses)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Status Chips Row ── */}
      <View style={styles.chipsRow}>
        <StatusChip
          icon="briefcase"
          label="Active"
          value={activeProjects.length}
          color={colors.primary}
          bg={colors.primary + "12"}
        />
        <StatusChip
          icon="check-circle"
          label="Done"
          value={completedProjects.length}
          color={colors.success}
          bg={colors.success + "12"}
        />
        <StatusChip
          icon="users"
          label="Team"
          value={activeEmployees.length}
          color={colors.accent}
          bg={colors.accent + "18"}
        />
        <StatusChip
          icon="radio"
          label="On Site"
          value={activeLogs.length}
          color={colors.success}
          bg={colors.success + "12"}
          pulse={activeLogs.length > 0}
        />
      </View>

      {/* ── Active Projects ── */}
      <View style={styles.section}>
        <SectionHeader
          title="Active Projects"
          actionLabel={projects.length > 0 ? "View All" : undefined}
          onAction={() => router.push("/(tabs)/projects")}
        />
        {activeProjects.length === 0 ? (
          <EmptyState
            icon="folder"
            title="No active projects"
            subtitle={
              pendingProjects.length > 0
                ? `${pendingProjects.length} project${pendingProjects.length > 1 ? "s" : ""} pending`
                : "Create your first project to get started"
            }
            actionLabel="New Project"
            onAction={() => router.push("/(tabs)/projects")}
          />
        ) : (
          activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              labor={getProjectLaborCost(p.id)}
              expense={getProjectExpenses(p.id)}
              onPress={() =>
                router.push({ pathname: "/project/[id]", params: { id: p.id } })
              }
            />
          ))
        )}
      </View>

      {/* ── Recent Activity ── */}
      <View style={styles.section}>
        <SectionHeader title="Recent Activity" />
        {timeLogs.length === 0 ? (
          <EmptyState icon="clock" title="No activity yet" subtitle="Time logs will appear here once employees clock in" />
        ) : (
          timeLogs
            .slice(-5)
            .reverse()
            .map((log) => <ActivityRow key={log.id} log={log} />)
        )}
      </View>
    </ScrollView>
  );
}

// ─── Status chip ────────────────────────────────────────────────────────────

function StatusChip({
  icon,
  label,
  value,
  color,
  bg,
  pulse,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  bg: string;
  pulse?: boolean;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <View style={styles.chipIconRow}>
        {pulse && value > 0 && (
          <View style={[styles.pulseDot, { backgroundColor: color }]} />
        )}
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color: color + "99" }]}>{label}</Text>
    </View>
  );
}

// ─── Project Card ───────────────────────────────────────────────────────────

function ProjectCard({
  project,
  labor,
  expense,
  onPress,
}: {
  project: Project;
  labor: number;
  expense: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const totalValue = project.totalValue ?? 0;
  const totalCost = labor + expense;
  const profit = totalValue - totalCost;
  const progress = totalValue > 0 ? Math.min(1, totalCost / totalValue) : 0;
  const profitPositive = profit >= 0;

  return (
    <TouchableOpacity
      style={[styles.projCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row */}
      <View style={styles.projTop}>
        <View style={styles.projInfo}>
          <Text style={[styles.projName, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          <View style={styles.projAddrRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.projAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
              {project.address}
            </Text>
          </View>
        </View>
        <StatusBadge status={project.status} />
      </View>

      {/* Cost progress bar */}
      <View style={styles.progWrap}>
        <View style={[styles.progBar, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progFill,
              {
                width: `${progress * 100}%` as any,
                backgroundColor: progress > 0.85 ? colors.destructive : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progPct, { color: colors.mutedForeground }]}>
          {(progress * 100).toFixed(0)}% used
        </Text>
      </View>

      {/* Financials */}
      <View style={[styles.financialsRow, { borderTopColor: colors.border }]}>
        <FinItem label="Value" value={`$${totalValue.toLocaleString()}`} color={colors.foreground} />
        <FinItem label="Cost" value={`$${totalCost.toLocaleString()}`} color={colors.warning} />
        <FinItem
          label="Profit"
          value={`${profit < 0 ? "-" : ""}$${Math.abs(profit).toLocaleString()}`}
          color={profitPositive ? colors.success : colors.destructive}
        />
      </View>
    </TouchableOpacity>
  );
}

function FinItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.finItem}>
      <Text style={[styles.finItemLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.finItemValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Activity Row ────────────────────────────────────────────────────────────

function ActivityRow({ log }: { log: any }) {
  const colors = useColors();
  const { employees, projects } = useData();
  const emp = employees.find((e) => e.id === log.employeeId);
  const proj = projects.find((p) => p.id === log.projectId);
  const hours = log.totalMinutes ? (log.totalMinutes / 60).toFixed(1) : null;
  const isActive = !log.clockOut;

  return (
    <View
      style={[
        styles.actRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.actIndicator,
          { backgroundColor: isActive ? colors.primary : colors.success },
        ]}
      />
      <View
        style={[
          styles.actAvatarCircle,
          { backgroundColor: isActive ? colors.primary + "18" : colors.muted },
        ]}
      >
        <Text style={[styles.actAvatarText, { color: isActive ? colors.primary : colors.mutedForeground }]}>
          {emp?.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) ?? "?"}
        </Text>
      </View>
      <View style={styles.actInfo}>
        <Text style={[styles.actName, { color: colors.foreground }]}>{emp?.name ?? "Unknown"}</Text>
        <Text style={[styles.actProj, { color: colors.mutedForeground }]} numberOfLines={1}>
          {proj?.name ?? "Unknown project"}
        </Text>
      </View>
      <View style={styles.actRight}>
        {isActive ? (
          <View style={[styles.liveChip, { backgroundColor: colors.primary + "18" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.liveText, { color: colors.primary }]}>Live</Text>
          </View>
        ) : (
          <Text style={[styles.actTime, { color: colors.foreground }]}>{hours}h</Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: 0 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  greeting: { color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "500" },
  username: { color: "#fff", fontSize: 27, fontWeight: "800" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // P&L Hero card
  heroWrap: { paddingHorizontal: 16, marginTop: -20 },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
  marginPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  marginPillText: { fontSize: 12, fontWeight: "700" },
  heroRow: { flexDirection: "row", alignItems: "flex-start" },
  heroDivider: { width: 1, height: 56, marginHorizontal: 4, alignSelf: "center" },
  heroMetric: { flex: 1, alignItems: "center", gap: 5 },
  heroIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  heroValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  heroCaption: { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.4 },

  // Cost breakdown bar
  costBreakdown: { gap: 8 },
  breakdownBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
  },
  breakdownFillLabor: { height: "100%" },
  breakdownFillExpense: { height: "100%" },
  breakdownLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "500" },

  // Status chips row
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 14,
  },
  chip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 3,
  },
  chipIconRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  chipValue: { fontSize: 20, fontWeight: "800" },
  chipLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 28, gap: 12 },

  // Project card
  projCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  projTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 10,
  },
  projInfo: { flex: 1, marginRight: 10, gap: 4 },
  projAddrRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  projName: { fontSize: 15, fontWeight: "700" },
  projAddress: { fontSize: 12, flex: 1 },
  progWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 4,
  },
  progBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  progPct: { fontSize: 10, fontWeight: "600", textAlign: "right" },
  financialsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  finItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  finItemLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  finItemValue: { fontSize: 14, fontWeight: "800" },

  // Activity row
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  actIndicator: { width: 4, alignSelf: "stretch" },
  actAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actAvatarText: { fontSize: 13, fontWeight: "700" },
  actInfo: { flex: 1, paddingVertical: 12, gap: 2 },
  actName: { fontSize: 14, fontWeight: "700" },
  actProj: { fontSize: 12 },
  actRight: { paddingRight: 14 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 12, fontWeight: "700" },
  actTime: { fontSize: 15, fontWeight: "800" },
});
