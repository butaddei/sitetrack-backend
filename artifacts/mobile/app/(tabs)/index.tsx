import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
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
  const {
    projects,
    employees,
    timeLogs,
    getProjectLaborCost,
    getProjectExpenses,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isAdmin = user?.role === "admin";
  const activeProjects = projects.filter((p) => p.status === "in_progress");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const pendingProjects = projects.filter((p) => p.status === "pending");
  const activeLogs = timeLogs.filter((l) => !l.clockOut);

  // Portfolio-wide financials
  const allLaborCost = projects.reduce((s, p) => s + getProjectLaborCost(p.id), 0);
  const allExpenses = projects.reduce((s, p) => s + getProjectExpenses(p.id), 0);
  const allCosts = allLaborCost + allExpenses;
  const totalPipeline = projects.reduce((s, p) => s + p.totalValue, 0);
  const totalProfit = totalPipeline - allCosts;
  const overallMargin = totalPipeline > 0 ? (totalProfit / totalPipeline) * 100 : 0;

  const completedRevenue = completedProjects.reduce((s, p) => s + p.totalValue, 0);

  const fmt = (n: number) =>
    n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  const greeting =
    new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  // Projects with financials for the portfolio table
  const projectsWithFinancials = projects.map((p) => {
    const labor = getProjectLaborCost(p.id);
    const exp = getProjectExpenses(p.id);
    const totalCost = labor + exp;
    const profit = p.totalValue - totalCost;
    const margin = p.totalValue > 0 ? (profit / p.totalValue) * 100 : 0;
    return { project: p, labor, exp, totalCost, profit, margin };
  });

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.username}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </View>
      </View>

      {/* ── Top metric cards ── */}
      <View style={[styles.metricsGrid, { marginTop: -16 }]}>
        <View style={styles.row}>
          <MetricCard label="Active Jobs" value={activeProjects.length.toString()} color={colors.primary} />
          <MetricCard
            label="Employees"
            value={employees.filter((e) => e.isActive && e.role === "employee").length.toString()}
            color={colors.success}
          />
        </View>
        <View style={styles.row}>
          <MetricCard
            label="Completed"
            value={completedProjects.length.toString()}
            subtitle={`${pendingProjects.length} pending`}
            color={colors.success}
          />
          <MetricCard
            label="Revenue"
            value={fmt(completedRevenue)}
            subtitle="completed jobs"
            color={colors.warning}
          />
        </View>
        <View style={styles.row}>
          <MetricCard label="Labor Cost" value={fmt(allLaborCost)} color={colors.destructive} />
          <MetricCard
            label="On Site Now"
            value={activeLogs.length.toString()}
            subtitle="active sessions"
            color={colors.primary}
          />
        </View>
      </View>

      {/* ── Portfolio Financial Overview (admin only) ── */}
      {isAdmin ? (
        <View style={styles.section}>
          <SectionHeader title="Financial Overview" />

          {/* Big summary card */}
          <View style={[styles.portfolioCard, { backgroundColor: colors.accent }]}>
            <Text style={styles.portfolioCardTitle}>Portfolio Summary</Text>

            <View style={styles.portfolioRow}>
              <PortfolioStat label="Total Pipeline" value={fmt(totalPipeline)} sub="all projects" />
              <View style={[styles.portDivider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <PortfolioStat label="Total Costs" value={fmt(allCosts)} sub="labor + expenses" valueColor="#f87171" />
            </View>

            <View style={[styles.portSeparator, { backgroundColor: "rgba(255,255,255,0.12)" }]} />

            <View style={styles.portfolioRow}>
              <PortfolioStat
                label="Est. Profit"
                value={(totalProfit >= 0 ? "+" : "") + fmt(totalProfit)}
                sub="across all jobs"
                valueColor={totalProfit >= 0 ? "#4ade80" : "#f87171"}
              />
              <View style={[styles.portDivider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <PortfolioStat
                label="Avg Margin"
                value={overallMargin.toFixed(1) + "%"}
                sub="overall"
                valueColor={overallMargin >= 30 ? "#4ade80" : overallMargin >= 15 ? "#fbbf24" : "#f87171"}
              />
            </View>

            {/* Cost breakdown mini bars */}
            <View style={[styles.portSeparator, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
            <View style={styles.portBreakdown}>
              <View style={styles.portBreakdownRow}>
                <View style={[styles.portBarDot, { backgroundColor: "#f87171" }]} />
                <Text style={styles.portBreakdownLabel}>Labor</Text>
                <Text style={styles.portBreakdownValue}>{fmt(allLaborCost)}</Text>
                <View style={styles.portBarTrack}>
                  <View
                    style={[
                      styles.portBarFill,
                      {
                        width: `${allCosts > 0 ? (allLaborCost / allCosts) * 100 : 0}%` as any,
                        backgroundColor: "#f87171",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.portBreakdownPct}>
                  {allCosts > 0 ? ((allLaborCost / allCosts) * 100).toFixed(0) : 0}%
                </Text>
              </View>
              <View style={styles.portBreakdownRow}>
                <View style={[styles.portBarDot, { backgroundColor: "#fbbf24" }]} />
                <Text style={styles.portBreakdownLabel}>Expenses</Text>
                <Text style={styles.portBreakdownValue}>{fmt(allExpenses)}</Text>
                <View style={styles.portBarTrack}>
                  <View
                    style={[
                      styles.portBarFill,
                      {
                        width: `${allCosts > 0 ? (allExpenses / allCosts) * 100 : 0}%` as any,
                        backgroundColor: "#fbbf24",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.portBreakdownPct}>
                  {allCosts > 0 ? ((allExpenses / allCosts) * 100).toFixed(0) : 0}%
                </Text>
              </View>
            </View>
          </View>

          {/* Per-project financial table */}
          {projectsWithFinancials.length > 0 ? (
            <View style={[styles.projTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.projTableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.projTableHeaderText, { color: colors.mutedForeground, flex: 2 }]}>Project</Text>
                <Text style={[styles.projTableHeaderText, { color: colors.mutedForeground }]}>Value</Text>
                <Text style={[styles.projTableHeaderText, { color: colors.mutedForeground }]}>Cost</Text>
                <Text style={[styles.projTableHeaderText, { color: colors.mutedForeground }]}>Profit</Text>
              </View>
              {projectsWithFinancials.map(({ project, totalCost, profit, margin }, idx) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projTableRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: idx < projectsWithFinancials.length - 1 ? 1 : 0,
                      backgroundColor: "transparent",
                    },
                  ]}
                  onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })}
                >
                  <View style={[styles.projTableCell, { flex: 2, gap: 3 }]}>
                    <Text style={[styles.projTableName, { color: colors.foreground }]} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <StatusBadge status={project.status} size="sm" />
                  </View>
                  <Text style={[styles.projTableAmt, { color: colors.foreground }]}>
                    {fmt(project.totalValue)}
                  </Text>
                  <Text style={[styles.projTableAmt, { color: colors.warning }]}>
                    {fmt(totalCost)}
                  </Text>
                  <View style={styles.projTableProfitCell}>
                    <Text
                      style={[
                        styles.projTableAmt,
                        { color: profit >= 0 ? colors.success : colors.destructive, fontWeight: "700" },
                      ]}
                    >
                      {profit >= 0 ? "+" : ""}{fmt(profit)}
                    </Text>
                    <Text
                      style={[
                        styles.projTableMargin,
                        {
                          color:
                            margin >= 30 ? colors.success : margin >= 15 ? colors.warning : colors.destructive,
                        },
                      ]}
                    >
                      {margin.toFixed(0)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <EmptyState icon="bar-chart-2" title="No projects yet" subtitle="Create a project to see financials" />
          )}
        </View>
      ) : null}

      {/* ── Active Projects ── */}
      <View style={styles.section}>
        <SectionHeader
          title="Active Projects"
          actionLabel="View All"
          onAction={() => router.push("/(tabs)/projects")}
        />
        {activeProjects.length === 0 ? (
          <EmptyState icon="folder" title="No active projects" />
        ) : (
          activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              labor={getProjectLaborCost(p.id)}
              expense={getProjectExpenses(p.id)}
              onPress={() => router.push({ pathname: "/project/[id]", params: { id: p.id } })}
            />
          ))
        )}
      </View>

      {/* ── Recent Activity ── */}
      <View style={styles.section}>
        <SectionHeader title="Recent Activity" />
        {timeLogs.length === 0 ? (
          <EmptyState icon="clock" title="No time logs yet" />
        ) : (
          timeLogs
            .slice(-6)
            .reverse()
            .map((log) => <ActivityRow key={log.id} log={log} />)
        )}
      </View>
    </ScrollView>
  );
}

/* ── Portfolio stat cell ── */
function PortfolioStat({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.portStat}>
      <Text style={styles.portStatLabel}>{label}</Text>
      <Text style={[styles.portStatValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={styles.portStatSub}>{sub}</Text>
    </View>
  );
}

/* ── Active project card ── */
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
  const totalCost = labor + expense;
  const profit = project.totalValue - totalCost;
  const remaining = Math.max(0, project.totalValue - totalCost);
  const progress = project.totalValue > 0 ? Math.min(1, totalCost / project.totalValue) : 0;
  const margin = project.totalValue > 0 ? (profit / project.totalValue) * 100 : 0;

  return (
    <TouchableOpacity
      style={[styles.projCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Title row */}
      <View style={styles.projTop}>
        <View style={styles.projInfo}>
          <Text style={[styles.projName, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={[styles.projAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
            {project.address}
          </Text>
        </View>
        <StatusBadge status={project.status} />
      </View>

      {/* Financial mini-grid */}
      <View style={[styles.projFinGrid, { borderColor: colors.border }]}>
        <ProjFinCell label="Value" value={`$${project.totalValue.toLocaleString()}`} color={colors.foreground} />
        <View style={[styles.projFinDivider, { backgroundColor: colors.border }]} />
        <ProjFinCell label="Costs" value={`$${totalCost.toFixed(0)}`} color={colors.warning} />
        <View style={[styles.projFinDivider, { backgroundColor: colors.border }]} />
        <ProjFinCell
          label="Profit"
          value={`${profit >= 0 ? "+" : ""}$${profit.toFixed(0)}`}
          color={profit >= 0 ? colors.success : colors.destructive}
        />
        <View style={[styles.projFinDivider, { backgroundColor: colors.border }]} />
        <ProjFinCell
          label="Margin"
          value={`${margin.toFixed(0)}%`}
          color={margin >= 30 ? colors.success : margin >= 15 ? colors.warning : colors.destructive}
        />
      </View>

      {/* Budget progress bar */}
      <View>
        <View style={[styles.progBar, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.progFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primary }]}
          />
        </View>
        <View style={styles.projProgLabels}>
          <Text style={[styles.projProgText, { color: colors.mutedForeground }]}>
            ${totalCost.toFixed(0)} spent
          </Text>
          <Text style={[styles.projProgText, { color: colors.mutedForeground }]}>
            ${remaining.toFixed(0)} remaining
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ProjFinCell({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.projFinCell}>
      <Text style={[styles.projFinLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.projFinValue, { color }]}>{value}</Text>
    </View>
  );
}

/* ── Activity row ── */
function ActivityRow({ log }: { log: any }) {
  const colors = useColors();
  const { employees, projects } = useData();
  const emp = employees.find((e) => e.id === log.employeeId);
  const proj = projects.find((p) => p.id === log.projectId);
  const hours = log.totalMinutes ? (log.totalMinutes / 60).toFixed(1) : null;

  return (
    <View style={[styles.actRow, { borderColor: colors.border }]}>
      <View
        style={[
          styles.actDot,
          { backgroundColor: log.clockOut ? colors.success : colors.primary },
        ]}
      />
      <View style={styles.actInfo}>
        <Text style={[styles.actName, { color: colors.foreground }]}>{emp?.name ?? "Unknown"}</Text>
        <Text style={[styles.actProj, { color: colors.mutedForeground }]} numberOfLines={1}>
          {proj?.name ?? "Unknown project"}
        </Text>
      </View>
      <Text style={[styles.actTime, { color: log.clockOut ? colors.mutedForeground : colors.primary }]}>
        {hours ? `${hours}h` : "Active"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 16,
  },
  greeting: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500" },
  username: { color: "#fff", fontSize: 26, fontWeight: "800" },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  metricsGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10 },
  section: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },

  // Portfolio card
  portfolioCard: { borderRadius: 16, padding: 20, gap: 0 },
  portfolioCardTitle: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 },
  portfolioRow: { flexDirection: "row" },
  portDivider: { width: 1, marginHorizontal: 0 },
  portSeparator: { height: 1, marginVertical: 14 },
  portStat: { flex: 1, alignItems: "center", gap: 3 },
  portStatLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  portStatValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  portStatSub: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
  portBreakdown: { gap: 8 },
  portBreakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  portBarDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  portBreakdownLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, width: 56 },
  portBreakdownValue: { color: "#fff", fontSize: 12, fontWeight: "600", width: 48 },
  portBarTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  portBarFill: { height: "100%", borderRadius: 2 },
  portBreakdownPct: { color: "rgba(255,255,255,0.5)", fontSize: 11, width: 28, textAlign: "right" },

  // Project financials table
  projTable: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  projTableHeader: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  projTableHeaderText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, flex: 1, textAlign: "right" },
  projTableRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  projTableCell: { flexDirection: "column" },
  projTableName: { fontSize: 13, fontWeight: "600" },
  projTableAmt: { flex: 1, fontSize: 12, fontWeight: "600", textAlign: "right" },
  projTableProfitCell: { flex: 1, alignItems: "flex-end" },
  projTableMargin: { fontSize: 10, fontWeight: "600" },

  // Active project card
  projCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  projTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  projInfo: { flex: 1, marginRight: 8 },
  projName: { fontSize: 15, fontWeight: "700" },
  projAddress: { fontSize: 12, marginTop: 2 },
  projFinGrid: { flexDirection: "row", borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  projFinCell: { flex: 1, alignItems: "center", gap: 2 },
  projFinDivider: { width: 1, marginVertical: 4 },
  projFinLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  projFinValue: { fontSize: 13, fontWeight: "800" },
  progBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  projProgLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  projProgText: { fontSize: 10 },

  // Activity
  actRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  actInfo: { flex: 1 },
  actName: { fontSize: 14, fontWeight: "600" },
  actProj: { fontSize: 12, marginTop: 1 },
  actTime: { fontSize: 13, fontWeight: "600" },
});
