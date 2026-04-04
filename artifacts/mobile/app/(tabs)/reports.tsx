import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { projects, employees, timeLogs, expenses, getProjectLaborCost, getProjectExpenses, getEmployeeTotalHours } = useData();

  const [activeTab, setActiveTab] = useState<"projects" | "employees">("projects");

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const totalRevenue = projects.filter((p) => p.status === "completed").reduce((s, p) => s + p.totalValue, 0);
  const totalLaborCost = projects.reduce((s, p) => s + getProjectLaborCost(p.id), 0);
  const totalExpenses = projects.reduce((s, p) => s + getProjectExpenses(p.id), 0);
  const totalProfit = totalRevenue - totalLaborCost - totalExpenses;

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <View style={[styles.overviewCard, { backgroundColor: colors.accent }]}>
        <Text style={styles.overviewTitle}>Business Overview</Text>
        <View style={styles.overviewRow}>
          <OverviewItem label="Revenue" value={fmt(totalRevenue)} valueColor="#22c55e" />
          <OverviewItem label="Labor Cost" value={fmt(totalLaborCost)} valueColor="#ef4444" />
          <OverviewItem label="Other Costs" value={fmt(totalExpenses)} valueColor="#eab308" />
          <OverviewItem
            label="Est. Profit"
            value={fmt(totalProfit)}
            valueColor={totalProfit >= 0 ? "#22c55e" : "#ef4444"}
          />
        </View>
      </View>

      <View style={styles.tabs}>
        {(["projects", "employees"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tab,
              {
                borderBottomColor: activeTab === t ? colors.primary : "transparent",
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(t)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === t ? colors.primary : colors.mutedForeground },
              ]}
            >
              {t === "projects" ? "Projects" : "Employees"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "projects"
          ? projects.map((proj) => {
              const labor = getProjectLaborCost(proj.id);
              const expAmt = getProjectExpenses(proj.id);
              const profit = proj.totalValue - labor - expAmt;
              const margin =
                proj.totalValue > 0 ? ((profit / proj.totalValue) * 100).toFixed(1) : "0";
              const logs = timeLogs.filter((l) => l.projectId === proj.id && l.totalMinutes);
              const hours = logs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);

              return (
                <View
                  key={proj.id}
                  style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                      {proj.name}
                    </Text>
                    <StatusBadge status={proj.status} />
                  </View>
                  <View style={styles.financialGrid}>
                    <FinRow label="Contract Value" value={fmt(proj.totalValue)} color={colors.foreground} />
                    <FinRow label="Labor Cost" value={fmt(labor)} color={colors.destructive} />
                    <FinRow label="Other Expenses" value={fmt(expAmt)} color={colors.warning} />
                    <FinRow label="Total Hours" value={`${hours.toFixed(1)}h`} color={colors.foreground} />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <FinRow
                      label="Est. Profit"
                      value={fmt(profit)}
                      color={profit >= 0 ? colors.success : colors.destructive}
                      bold
                    />
                    <FinRow
                      label="Margin"
                      value={`${margin}%`}
                      color={parseFloat(margin) >= 30 ? colors.success : colors.warning}
                    />
                  </View>
                </View>
              );
            })
          : activeEmployees.map((emp) => {
              const hours = getEmployeeTotalHours(emp.id);
              const cost = hours * emp.hourlyRate;
              const projCount = projects.filter((p) => p.assignedEmployeeIds.includes(emp.id)).length;
              const logs = timeLogs.filter((l) => l.employeeId === emp.id && l.totalMinutes);
              const avgHrs = logs.length > 0 ? hours / logs.length : 0;

              const initials = emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

              return (
                <View
                  key={emp.id}
                  style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.empHeader}>
                    <View style={[styles.empAvatar, { backgroundColor: colors.accent }]}>
                      <Text style={styles.empInitials}>{initials}</Text>
                    </View>
                    <View>
                      <Text style={[styles.cardName, { color: colors.foreground }]}>{emp.name}</Text>
                      <Text style={[styles.empPosition, { color: colors.mutedForeground }]}>
                        {emp.position}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.financialGrid}>
                    <FinRow label="Hourly Rate" value={`$${emp.hourlyRate}/h`} color={colors.foreground} />
                    <FinRow label="Total Hours" value={`${hours.toFixed(1)}h`} color={colors.foreground} />
                    <FinRow label="Sessions" value={logs.length.toString()} color={colors.foreground} />
                    <FinRow label="Avg Session" value={`${avgHrs.toFixed(1)}h`} color={colors.foreground} />
                    <FinRow label="Projects Assigned" value={projCount.toString()} color={colors.foreground} />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <FinRow label="Total Labor Cost" value={fmt(cost)} color={colors.primary} bold />
                  </View>
                </View>
              );
            })}
      </ScrollView>
    </View>
  );
}

function OverviewItem({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <View style={styles.overviewItem}>
      <Text style={[styles.overviewValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

function FinRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.finRow}>
      <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.finValue, { color, fontWeight: bold ? "700" : "500" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  overviewCard: { paddingHorizontal: 20, paddingBottom: 20 },
  overviewTitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  overviewRow: { flexDirection: "row" },
  overviewItem: { flex: 1, alignItems: "center", gap: 2 },
  overviewValue: { fontSize: 18, fontWeight: "800" },
  overviewLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "500" },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 15, fontWeight: "600" },
  content: { padding: 16, gap: 12 },
  reportCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  financialGrid: { gap: 6 },
  finRow: { flexDirection: "row", justifyContent: "space-between" },
  finLabel: { fontSize: 13 },
  finValue: { fontSize: 13 },
  divider: { height: 1, marginVertical: 4 },
  empHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  empAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  empInitials: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empPosition: { fontSize: 12, marginTop: 2 },
});
