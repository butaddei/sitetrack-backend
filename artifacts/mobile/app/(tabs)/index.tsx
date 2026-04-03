import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Project, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, employees, timeLogs, getProjectLaborCost, getProjectExpenses } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isAdmin = user?.role === "admin";
  const activeProjects = projects.filter((p) => p.status === "in_progress");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const pendingProjects = projects.filter((p) => p.status === "pending");
  const activeLogs = timeLogs.filter((l) => !l.clockOut);
  const activeStaff = employees.filter((e) => e.isActive && e.role === "employee");

  const allLaborCost = projects.reduce((s, p) => s + getProjectLaborCost(p.id), 0);
  const allExpenses = projects.reduce((s, p) => s + getProjectExpenses(p.id), 0);
  const allCosts = allLaborCost + allExpenses;
  const totalPipeline = projects.reduce((s, p) => s + p.totalValue, 0);
  const totalProfit = totalPipeline - allCosts;
  const overallMargin = totalPipeline > 0 ? (totalProfit / totalPipeline) * 100 : 0;
  const completedRevenue = completedProjects.reduce((s, p) => s + p.totalValue, 0);

  const fmt = (n: number) =>
    n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toFixed(0)}`;

  const hours = new Date().getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "";

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
      contentContainerStyle={{ paddingBottom: botPad + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.accent, paddingTop: topPad + 12 }]}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
            onPress={() => {}}
          >
            <Text style={styles.avatarText}>
              {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick stat chips */}
        <View style={styles.headerChips}>
          <HeaderChip icon="briefcase" label={`${activeProjects.length} Active`} color="#f97316" />
          <HeaderChip icon="users" label={`${activeLogs.length} On Site`} color="#22c55e" />
          <HeaderChip icon="check-circle" label={`${completedProjects.length} Done`} color="#a855f7" />
          {isAdmin ? (
            <HeaderChip icon="trending-up" label={fmt(totalPipeline)} color="#fbbf24" />
          ) : null}
        </View>
      </View>

      {/* ── Metric cards ── */}
      <View style={styles.metricsSection}>
        <View style={styles.metricsRow}>
          <MetricCard label="Active Jobs" value={activeProjects.length.toString()} icon="briefcase" color={colors.primary} />
          <MetricCard label="On Site" value={activeLogs.length.toString()} icon="radio" color={colors.success} subtitle="right now" />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard label="Staff" value={activeStaff.length.toString()} icon="users" color="#8b5cf6" subtitle={`${pendingProjects.length} pending jobs`} />
          <MetricCard label="Revenue" value={fmt(completedRevenue)} icon="dollar-sign" color={colors.warning} subtitle="completed jobs" />
        </View>
        {isAdmin ? (
          <View style={styles.metricsRow}>
            <MetricCard label="Labor Cost" value={fmt(allLaborCost)} icon="clock" color={colors.destructive} />
            <MetricCard
              label="Est. Margin"
              value={`${overallMargin.toFixed(0)}%`}
              icon="trending-up"
              color={overallMargin >= 30 ? colors.success : overallMargin >= 15 ? colors.warning : colors.destructive}
              subtitle="portfolio avg"
            />
          </View>
        ) : null}
      </View>

      {/* ── Financial overview (admin only) ── */}
      {isAdmin ? (
        <View style={styles.section}>
          <SectionTitle title="Financial Overview" action="Reports" onAction={() => router.push("/(tabs)/reports")} />

          {/* Portfolio card */}
          <View style={[styles.portfolioCard, { backgroundColor: colors.accent }]}>
            <Text style={styles.portCardLabel}>Portfolio Summary</Text>
            <View style={styles.portRow}>
              <PortStat label="Pipeline" value={fmt(totalPipeline)} />
              <View style={styles.portDivider} />
              <PortStat label="Costs" value={fmt(allCosts)} valueColor="#f87171" />
              <View style={styles.portDivider} />
              <PortStat
                label="Profit"
                value={(totalProfit >= 0 ? "+" : "") + fmt(totalProfit)}
                valueColor={totalProfit >= 0 ? "#4ade80" : "#f87171"}
              />
              <View style={styles.portDivider} />
              <PortStat
                label="Margin"
                value={`${overallMargin.toFixed(0)}%`}
                valueColor={overallMargin >= 30 ? "#4ade80" : overallMargin >= 15 ? "#fbbf24" : "#f87171"}
              />
            </View>
            {/* Mini cost breakdown */}
            <View style={styles.portBreakdown}>
              <CostBar label="Labor" value={allLaborCost} total={allCosts} color="#f87171" />
              <CostBar label="Expenses" value={allExpenses} total={allCosts} color="#fbbf24" />
            </View>
          </View>

          {/* Project table */}
          {projectsWithFinancials.length > 0 ? (
            <View style={[styles.projTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.projTableHead, { borderBottomColor: colors.border }]}>
                <Text style={[styles.projTableHeadText, { color: colors.mutedForeground, flex: 2 }]}>Project</Text>
                <Text style={[styles.projTableHeadText, { color: colors.mutedForeground }]}>Value</Text>
                <Text style={[styles.projTableHeadText, { color: colors.mutedForeground }]}>Cost</Text>
                <Text style={[styles.projTableHeadText, { color: colors.mutedForeground }]}>Profit</Text>
              </View>
              {projectsWithFinancials.map(({ project, totalCost, profit, margin }, idx) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projTableRow,
                    { borderBottomColor: colors.border, borderBottomWidth: idx < projectsWithFinancials.length - 1 ? 1 : 0 },
                  ]}
                  onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })}
                >
                  <View style={[styles.projTableCell, { flex: 2 }]}>
                    <Text style={[styles.projTableName, { color: colors.foreground }]} numberOfLines={1}>{project.name}</Text>
                    <StatusBadge status={project.status} size="sm" />
                  </View>
                  <Text style={[styles.projTableAmt, { color: colors.foreground }]}>{fmt(project.totalValue)}</Text>
                  <Text style={[styles.projTableAmt, { color: colors.warning }]}>{fmt(totalCost)}</Text>
                  <View style={styles.projTableProfitCell}>
                    <Text style={[styles.projTableAmt, { color: profit >= 0 ? colors.success : colors.destructive, fontWeight: "700" }]}>
                      {profit >= 0 ? "+" : ""}{fmt(profit)}
                    </Text>
                    <Text style={[styles.projMargin, { color: margin >= 30 ? colors.success : margin >= 15 ? colors.warning : colors.destructive }]}>
                      {margin.toFixed(0)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Active Projects ── */}
      <View style={styles.section}>
        <SectionTitle
          title="Active Projects"
          action="View All"
          onAction={() => router.push("/(tabs)/projects")}
        />
        {activeProjects.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="folder" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active projects</Text>
          </View>
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
        <SectionTitle title="Recent Activity" />
        {timeLogs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No time logs yet</Text>
          </View>
        ) : (
          <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {timeLogs.slice(-6).reverse().map((log, idx, arr) => (
              <ActivityRow
                key={log.id}
                log={log}
                isLast={idx === arr.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ─── Sub-components ─── */

function HeaderChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[styles.headerChip, { backgroundColor: `${color}20` }]}>
      <Feather name={icon as any} size={11} color={color} />
      <Text style={[styles.headerChipText, { color }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionTitleText, { color: colors.foreground }]}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} style={[styles.sectionActionBtn, { backgroundColor: colors.primary + "14" }]}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{action}</Text>
          <Feather name="arrow-right" size={12} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PortStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.portStat}>
      <Text style={styles.portStatLabel}>{label}</Text>
      <Text style={[styles.portStatValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  return (
    <View style={styles.costBarRow}>
      <View style={[styles.costBarDot, { backgroundColor: color }]} />
      <Text style={styles.costBarLabel}>{label}</Text>
      <Text style={styles.costBarValue}>{fmt(value)}</Text>
      <View style={styles.costBarTrack}>
        <View style={[styles.costBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.costBarPct}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

function ProjectCard({ project, labor, expense, onPress }: {
  project: Project; labor: number; expense: number; onPress: () => void;
}) {
  const colors = useColors();
  const totalCost = labor + expense;
  const profit = project.totalValue - totalCost;
  const remaining = Math.max(0, project.totalValue - totalCost);
  const progress = project.totalValue > 0 ? Math.min(1, totalCost / project.totalValue) : 0;
  const margin = project.totalValue > 0 ? (profit / project.totalValue) * 100 : 0;
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <TouchableOpacity
      style={[styles.projCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.projCardTop}>
        <View style={styles.projCardInfo}>
          <Text style={[styles.projCardName, { color: colors.foreground }]} numberOfLines={1}>{project.name}</Text>
          <View style={styles.projCardMeta}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.projCardAddr, { color: colors.mutedForeground }]} numberOfLines={1}>{project.address}</Text>
          </View>
        </View>
        <StatusBadge status={project.status} />
      </View>

      {/* 4-cell financial grid */}
      <View style={[styles.projFinGrid, { borderColor: colors.border }]}>
        <FinCell label="Contract" value={fmt(project.totalValue)} color={colors.foreground} />
        <FinCell label="Spent" value={fmt(totalCost)} color={colors.warning} />
        <FinCell label="Profit" value={(profit >= 0 ? "+" : "") + fmt(profit)} color={profit >= 0 ? colors.success : colors.destructive} />
        <FinCell label="Margin" value={`${margin.toFixed(0)}%`} color={margin >= 30 ? colors.success : margin >= 15 ? colors.warning : colors.destructive} />
      </View>

      {/* Budget bar */}
      <View>
        <View style={[styles.progTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progFill, { width: `${progress * 100}%` as any, backgroundColor: progress > 0.9 ? colors.destructive : colors.primary }]} />
        </View>
        <View style={styles.progLabels}>
          <Text style={[styles.progLabel, { color: colors.mutedForeground }]}>{fmt(totalCost)} spent</Text>
          <Text style={[styles.progLabel, { color: colors.mutedForeground }]}>{fmt(remaining)} remaining</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FinCell({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.finCell}>
      <Text style={[styles.finCellLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.finCellValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActivityRow({ log, isLast }: { log: any; isLast: boolean }) {
  const colors = useColors();
  const { employees, projects } = useData();
  const emp = employees.find((e) => e.id === log.employeeId);
  const proj = projects.find((p) => p.id === log.projectId);
  const hours = log.totalMinutes ? (log.totalMinutes / 60).toFixed(1) : null;
  const isActive = !log.clockOut;

  return (
    <View style={[styles.actRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.actIconWrap, { backgroundColor: isActive ? colors.primary + "18" : colors.muted }]}>
        <Feather name={isActive ? "radio" : "check"} size={13} color={isActive ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={styles.actInfo}>
        <Text style={[styles.actName, { color: colors.foreground }]}>{emp?.name ?? "Unknown"}</Text>
        <Text style={[styles.actProj, { color: colors.mutedForeground }]} numberOfLines={1}>{proj?.name ?? "Unknown project"}</Text>
      </View>
      <View style={styles.actRight}>
        <Text style={[styles.actTime, { color: isActive ? colors.primary : colors.mutedForeground, fontWeight: isActive ? "700" : "500" }]}>
          {hours ? `${hours}h` : "Active"}
        </Text>
        {isActive ? <View style={[styles.actLiveDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "500" },
  username: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  headerChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  headerChipText: { fontSize: 12, fontWeight: "700" },

  // Metrics
  metricsSection: { padding: 16, gap: 10 },
  metricsRow: { flexDirection: "row", gap: 10 },

  // Section layout
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitleText: { fontSize: 17, fontWeight: "800" },
  sectionActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  sectionActionText: { fontSize: 12, fontWeight: "700" },

  // Portfolio card
  portfolioCard: { borderRadius: 18, padding: 20, gap: 14 },
  portCardLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  portRow: { flexDirection: "row" },
  portDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 4 },
  portStat: { flex: 1, alignItems: "center", gap: 3 },
  portStatLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  portStatValue: { color: "#fff", fontSize: 16, fontWeight: "800" },
  portBreakdown: { gap: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)", paddingTop: 12 },
  costBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  costBarDot: { width: 8, height: 8, borderRadius: 4 },
  costBarLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, width: 58 },
  costBarValue: { color: "#fff", fontSize: 12, fontWeight: "600", width: 46 },
  costBarTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  costBarFill: { height: "100%", borderRadius: 2 },
  costBarPct: { color: "rgba(255,255,255,0.45)", fontSize: 11, width: 28, textAlign: "right" },

  // Project table
  projTable: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  projTableHead: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  projTableHeadText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, flex: 1, textAlign: "right" },
  projTableRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  projTableCell: { flexDirection: "column", gap: 3 },
  projTableName: { fontSize: 13, fontWeight: "600" },
  projTableAmt: { flex: 1, fontSize: 12, fontWeight: "600", textAlign: "right" },
  projTableProfitCell: { flex: 1, alignItems: "flex-end", gap: 1 },
  projMargin: { fontSize: 10, fontWeight: "600" },

  // Project card
  projCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  projCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  projCardInfo: { flex: 1, marginRight: 10, gap: 3 },
  projCardName: { fontSize: 15, fontWeight: "700" },
  projCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  projCardAddr: { fontSize: 12, flex: 1 },
  projFinGrid: { flexDirection: "row", borderRadius: 12, borderWidth: 1, paddingVertical: 12 },
  finCell: { flex: 1, alignItems: "center", gap: 3 },
  finCellLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  finCellValue: { fontSize: 13, fontWeight: "800" },
  progTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  progLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  progLabel: { fontSize: 10, fontWeight: "500" },

  // Activity
  activityCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  actRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  actIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actInfo: { flex: 1 },
  actName: { fontSize: 14, fontWeight: "600" },
  actProj: { fontSize: 12, marginTop: 1 },
  actRight: { alignItems: "flex-end", gap: 3 },
  actTime: { fontSize: 13 },
  actLiveDot: { width: 6, height: 6, borderRadius: 3 },

  // Empty
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
});
