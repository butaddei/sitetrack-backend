import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function TimesheetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { timeLogs, employees, projects } = useData();
  const [filterEmp, setFilterEmp] = useState<string>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeEmployees = employees.filter((e) => e.role === "employee");

  const logs =
    user?.role === "admin"
      ? filterEmp === "all"
        ? timeLogs
        : timeLogs.filter((l) => l.employeeId === filterEmp)
      : timeLogs.filter((l) => l.employeeId === user?.id);

  const completedLogs = logs.filter((l) => l.clockOut);
  const totalHours = completedLogs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Timesheets</Text>
      </View>

      <View style={[styles.summaryRow, { backgroundColor: colors.accent, paddingBottom: 20 }]}>
        <SummaryBox label="Total Logs" value={completedLogs.length.toString()} />
        <SummaryBox label="Total Hours" value={totalHours.toFixed(1) + "h"} />
        <SummaryBox
          label="Active Now"
          value={logs.filter((l) => !l.clockOut).length.toString()}
          highlight
        />
      </View>

      {user?.role === "admin" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 48, backgroundColor: colors.background }}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: filterEmp === "all" ? colors.primary : colors.muted },
            ]}
            onPress={() => setFilterEmp("all")}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterEmp === "all" ? "#fff" : colors.mutedForeground },
              ]}
            >
              All Employees
            </Text>
          </TouchableOpacity>
          {activeEmployees.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              style={[
                styles.filterChip,
                { backgroundColor: filterEmp === emp.id ? colors.primary : colors.muted },
              ]}
              onPress={() => setFilterEmp(emp.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterEmp === emp.id ? "#fff" : colors.mutedForeground },
                ]}
              >
                {emp.name.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={sortedLogs}
        keyExtractor={(l) => l.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 24 },
          sortedLogs.length === 0 && styles.emptyFlex,
        ]}
        ListEmptyComponent={
          <EmptyState icon="clock" title="No time logs yet" subtitle="Time logs will appear here once employees start working" />
        }
        renderItem={({ item }) => {
          const emp = employees.find((e) => e.id === item.employeeId);
          const proj = projects.find((p) => p.id === item.projectId);
          const hours = item.totalMinutes ? (item.totalMinutes / 60).toFixed(2) : null;
          const cost = hours && emp ? (parseFloat(hours) * emp.hourlyRate).toFixed(2) : null;
          const isActive = !item.clockOut;

          return (
            <View
              style={[
                styles.logCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderLeftColor: isActive ? colors.primary : colors.border,
                  borderLeftWidth: isActive ? 3 : 1,
                },
              ]}
            >
              <View style={styles.logTop}>
                <View style={styles.logInfo}>
                  <Text style={[styles.logEmployee, { color: colors.foreground }]}>
                    {emp?.name ?? "Unknown"}
                  </Text>
                  <Text style={[styles.logProject, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {proj?.name ?? "Unknown Project"}
                  </Text>
                </View>
                <View style={styles.logRight}>
                  <Text style={[styles.logDate, { color: colors.mutedForeground }]}>
                    {formatDate(item.clockIn)}
                  </Text>
                  {isActive ? (
                    <View style={[styles.activePill, { backgroundColor: colors.primary + "20" }]}>
                      <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.activeText, { color: colors.primary }]}>Live</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.logTimes}>
                <View style={styles.timeBlock}>
                  <Feather name="log-in" size={12} color={colors.success} />
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>In: </Text>
                  <Text style={[styles.timeValue, { color: colors.foreground }]}>
                    {formatTime(item.clockIn)}
                  </Text>
                </View>
                {item.clockOut ? (
                  <View style={styles.timeBlock}>
                    <Feather name="log-out" size={12} color={colors.destructive} />
                    <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Out: </Text>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>
                      {formatTime(item.clockOut)}
                    </Text>
                  </View>
                ) : null}
                {hours ? (
                  <View style={styles.timeBlock}>
                    <Feather name="clock" size={12} color={colors.warning} />
                    <Text style={[styles.timeValue, { color: colors.foreground, fontWeight: "700" }]}>
                      {hours}h
                    </Text>
                    {cost ? (
                      <Text style={[styles.costText, { color: colors.success }]}> · ${cost}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {item.notes ? (
                <Text style={[styles.logNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
                  "{item.notes}"
                </Text>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function SummaryBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.sumBox}>
      <Text style={[styles.sumValue, highlight && styles.sumHighlight]}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 0,
  },
  sumBox: { flex: 1, alignItems: "center", gap: 2 },
  sumValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sumHighlight: { color: "#fbbf24" },
  sumLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "500" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  emptyFlex: { flex: 1 },
  logCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logInfo: { flex: 1 },
  logEmployee: { fontSize: 14, fontWeight: "700" },
  logProject: { fontSize: 12, marginTop: 2 },
  logRight: { alignItems: "flex-end", gap: 4 },
  logDate: { fontSize: 12 },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "600" },
  logTimes: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  timeBlock: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeLabel: { fontSize: 12 },
  timeValue: { fontSize: 12 },
  costText: { fontSize: 12, fontWeight: "600" },
  logNotes: { fontSize: 12, fontStyle: "italic" },
});
