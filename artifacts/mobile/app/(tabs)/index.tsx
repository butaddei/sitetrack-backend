import { Feather } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
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
  const { projects, employees, timeLogs, getProjectLaborCost, getProjectExpenses } = useData();

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeProjects = projects.filter((p) => p.status === "in_progress");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const pendingProjects = projects.filter((p) => p.status === "pending");
  const totalRevenue = projects.filter((p) => p.status === "completed").reduce((s, p) => s + p.totalValue, 0);
  const activeLogs = timeLogs.filter((l) => !l.clockOut);

  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  const totalLaborCost = projects.reduce((s, p) => s + getProjectLaborCost(p.id), 0);
  const totalExpenses = projects.reduce((s, p) => s + getProjectExpenses(p.id), 0);

  const greeting =
    new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: botPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.username}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </Text>
        </View>
      </View>

      <View style={[styles.metricsGrid, { marginTop: -16 }]}>
        <View style={styles.row}>
          <MetricCard
            label="Active Jobs"
            value={activeProjects.length.toString()}
            color={colors.primary}
          />
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
            value={fmt(totalRevenue)}
            subtitle="completed jobs"
            color={colors.warning}
          />
        </View>
        <View style={styles.row}>
          <MetricCard
            label="Labor Cost"
            value={fmt(totalLaborCost)}
            color={colors.destructive}
          />
          <MetricCard
            label="On Site Now"
            value={activeLogs.length.toString()}
            subtitle="active sessions"
            color={colors.primary}
          />
        </View>
      </View>

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

      <View style={styles.section}>
        <SectionHeader title="Recent Activity" />
        {timeLogs.length === 0 ? (
          <EmptyState icon="clock" title="No time logs yet" />
        ) : (
          timeLogs
            .slice(-5)
            .reverse()
            .map((log) => (
              <ActivityRow key={log.id} log={log} />
            ))
        )}
      </View>
    </ScrollView>
  );
}

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
  const profit = project.totalValue - labor - expense;
  const progress = Math.min(1, (labor + expense) / project.totalValue);

  return (
    <TouchableOpacity
      style={[styles.projCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
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
      <View style={[styles.progBar, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progFill,
            { width: `${progress * 100}%` as any, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <View style={styles.projFinancials}>
        <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>
          Value: <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            ${project.totalValue.toLocaleString()}
          </Text>
        </Text>
        <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>
          Profit:{" "}
          <Text style={{ color: profit >= 0 ? colors.success : colors.destructive, fontWeight: "700" }}>
            ${profit.toLocaleString()}
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ActivityRow({ log }: { log: any }) {
  const colors = useColors();
  const { employees, projects } = useData();
  const emp = employees.find((e) => e.id === log.employeeId);
  const proj = projects.find((p) => p.id === log.projectId);
  const hours = log.totalMinutes ? (log.totalMinutes / 60).toFixed(1) : null;

  return (
    <View style={[styles.actRow, { borderColor: colors.border }]}>
      <View style={[styles.actDot, { backgroundColor: log.clockOut ? colors.success : colors.primary }]} />
      <View style={styles.actInfo}>
        <Text style={[styles.actName, { color: colors.foreground }]}>{emp?.name ?? "Unknown"}</Text>
        <Text style={[styles.actProj, { color: colors.mutedForeground }]} numberOfLines={1}>
          {proj?.name ?? "Unknown project"}
        </Text>
      </View>
      <Text style={[styles.actTime, { color: colors.mutedForeground }]}>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  metricsGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10 },
  section: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  projCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  projTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  projInfo: { flex: 1, marginRight: 8 },
  projName: { fontSize: 15, fontWeight: "700" },
  projAddress: { fontSize: 12, marginTop: 2 },
  progBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 2 },
  projFinancials: { flexDirection: "row", justifyContent: "space-between" },
  finLabel: { fontSize: 12 },
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  actInfo: { flex: 1 },
  actName: { fontSize: 14, fontWeight: "600" },
  actProj: { fontSize: 12, marginTop: 1 },
  actTime: { fontSize: 13, fontWeight: "600" },
});
