import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { Employee, TimeLog, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

type ViewMode = "summary" | "detail";

export default function TimesheetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    timeLogs,
    employees,
    projects,
    getActiveTimeLog,
    getEmployeeDailyHours,
    getEmployeeWeeklyHours,
    getEmployeeDailyLaborCost,
    getEmployeeWeeklyLaborCost,
    getSessionLaborCost,
    getEmployeeTotalHours,
    isLoading,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive);

  // Global totals for today and this week
  const totalDailyHours = activeEmployees.reduce((s, e) => s + getEmployeeDailyHours(e.id), 0);
  const totalWeeklyHours = activeEmployees.reduce((s, e) => s + getEmployeeWeeklyHours(e.id), 0);
  const totalDailyCost = activeEmployees.reduce((s, e) => s + getEmployeeDailyLaborCost(e.id), 0);
  const totalWeeklyCost = activeEmployees.reduce((s, e) => s + getEmployeeWeeklyLaborCost(e.id), 0);
  const onSiteNow = activeEmployees.filter((e) => !!getActiveTimeLog(e.id)).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTimeShort = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const durationLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Detail view: logs for selected employee grouped by date
  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmpId);
  const detailLogs = selectedEmpId
    ? timeLogs
        .filter((l) => l.employeeId === selectedEmpId)
        .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
    : [];

  const detailSections = detailLogs.reduce<Record<string, TimeLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});

  const detailSectionList = Object.keys(detailSections)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ title: date, data: detailSections[date] }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Timesheets</Text>
        <View style={[styles.onSitePill, { backgroundColor: onSiteNow > 0 ? colors.success + "30" : "rgba(255,255,255,0.12)" }]}>
          <View style={[styles.onSiteDot, { backgroundColor: onSiteNow > 0 ? colors.success : "rgba(255,255,255,0.4)" }]} />
          <Text style={[styles.onSiteText, { color: onSiteNow > 0 ? colors.success : "rgba(255,255,255,0.55)" }]}>
            {onSiteNow} on site
          </Text>
        </View>
      </View>

      {/* Global summary bar */}
      <View style={[styles.globalSummary, { backgroundColor: colors.accent }]}>
        <GlobalStat label="Today Hours" value={totalDailyHours.toFixed(1) + "h"} sub={"$" + totalDailyCost.toFixed(2)} />
        <View style={[styles.gsDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
        <GlobalStat label="Week Hours" value={totalWeeklyHours.toFixed(1) + "h"} sub={"$" + totalWeeklyCost.toFixed(2)} />
        <View style={[styles.gsDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
        <GlobalStat label="Total Staff" value={activeEmployees.length.toString()} sub="employees" />
      </View>

      {/* View toggle */}
      <View style={[styles.viewToggle, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {(["summary", "detail"] as ViewMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.toggleBtn,
              { borderBottomColor: viewMode === m ? colors.primary : "transparent", borderBottomWidth: 2 },
            ]}
            onPress={() => {
              setViewMode(m);
              if (m === "summary") setSelectedEmpId(null);
            }}
          >
            <Text
              style={[
                styles.toggleText,
                { color: viewMode === m ? colors.primary : colors.mutedForeground },
              ]}
            >
              {m === "summary" ? "By Employee" : selectedEmployee ? selectedEmployee.name.split(" ")[0] + "'s Log" : "Session Log"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode === "summary" ? (
        <FlatList
          data={activeEmployees}
          keyExtractor={(e) => e.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 24 },
            activeEmployees.length === 0 && styles.emptyFlex,
          ]}
          ListEmptyComponent={
            <EmptyState icon="users" title="No employees" subtitle="Add employees from the Employees tab" />
          }
          renderItem={({ item }) => (
            <EmployeeSummaryCard
              employee={item}
              isOnSite={!!getActiveTimeLog(item.id)}
              dailyHours={getEmployeeDailyHours(item.id)}
              weeklyHours={getEmployeeWeeklyHours(item.id)}
              dailyCost={getEmployeeDailyLaborCost(item.id)}
              weeklyCost={getEmployeeWeeklyLaborCost(item.id)}
              totalHours={getEmployeeTotalHours(item.id)}
              totalSessions={timeLogs.filter((l) => l.employeeId === item.id && l.totalMinutes).length}
              onViewDetail={() => {
                setSelectedEmpId(item.id);
                setViewMode("detail");
              }}
            />
          )}
        />
      ) : (
        /* Detail view */
        <View style={styles.flex}>
          {/* Employee selector pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 50, backgroundColor: colors.background }}
            contentContainerStyle={styles.empPills}
          >
            <TouchableOpacity
              style={[
                styles.empPill,
                { backgroundColor: selectedEmpId === null ? colors.accent : colors.muted },
              ]}
              onPress={() => setSelectedEmpId(null)}
            >
              <Text style={[styles.empPillText, { color: selectedEmpId === null ? "#fff" : colors.mutedForeground }]}>
                All
              </Text>
            </TouchableOpacity>
            {activeEmployees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.empPill,
                  { backgroundColor: selectedEmpId === emp.id ? colors.primary : colors.muted },
                ]}
                onPress={() => setSelectedEmpId(emp.id)}
              >
                {!!getActiveTimeLog(emp.id) && (
                  <View style={[styles.pillDot, { backgroundColor: colors.success }]} />
                )}
                <Text style={[styles.empPillText, { color: selectedEmpId === emp.id ? "#fff" : colors.mutedForeground }]}>
                  {emp.name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* If specific employee selected, show their mini-summary */}
          {selectedEmployee ? (
            <View style={[styles.empMiniSummary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.empMiniLeft}>
                <View style={[styles.empAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.empInitials}>
                    {selectedEmployee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.empMiniName, { color: colors.foreground }]}>{selectedEmployee.name}</Text>
                  <Text style={[styles.empMiniRate, { color: colors.mutedForeground }]}>
                    ${selectedEmployee.hourlyRate}/hr · {selectedEmployee.position}
                  </Text>
                </View>
              </View>
              <View style={styles.empMiniStats}>
                <MiniStat label="Today" value={getEmployeeDailyHours(selectedEmployee.id).toFixed(1) + "h"} color={colors.primary} />
                <MiniStat label="Week" value={getEmployeeWeeklyHours(selectedEmployee.id).toFixed(1) + "h"} color={colors.foreground} />
              </View>
            </View>
          ) : null}

          {/* Logs */}
          {(selectedEmpId ? detailSectionList : buildAllSections(timeLogs, employees)).length === 0 ? (
            <EmptyState icon="clock" title="No time logs yet" />
          ) : (
            <SectionList
              sections={selectedEmpId ? detailSectionList : buildAllSections(timeLogs, employees)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {formatDate(section.title)}
                  </Text>
                  <DetailSectionMeta
                    logs={section.data}
                    getSessionLaborCost={getSessionLaborCost}
                  />
                </View>
              )}
              renderItem={({ item }) => {
                const emp = employees.find((e) => e.id === item.employeeId);
                const proj = projects.find((p) => p.id === item.projectId);
                const cost = getSessionLaborCost(item);
                const isActive = !item.clockOut;

                return (
                  <View
                    style={[
                      styles.logRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: isActive ? colors.primary + "50" : colors.border,
                        borderLeftColor: isActive ? colors.primary : colors.border,
                        borderLeftWidth: isActive ? 3 : 1,
                      },
                    ]}
                  >
                    <View style={styles.logRowLeft}>
                      <View style={[styles.miniAvatar, { backgroundColor: colors.accent }]}>
                        <Text style={styles.miniAvatarText}>
                          {emp?.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"}
                        </Text>
                      </View>
                      <View style={styles.logRowInfo}>
                        {!selectedEmpId ? (
                          <Text style={[styles.logRowName, { color: colors.foreground }]}>
                            {emp?.name ?? "Unknown"}
                          </Text>
                        ) : null}
                        <Text style={[styles.logRowProject, { color: selectedEmpId ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                          {proj?.name ?? "Unknown Project"}
                        </Text>
                        <View style={styles.logTimes}>
                          <LogTimeChip icon="log-in" time={formatTimeShort(item.clockIn)} color={colors.success} />
                          {item.clockOut ? (
                            <>
                              <Text style={{ color: colors.border, fontSize: 11 }}>→</Text>
                              <LogTimeChip icon="log-out" time={formatTimeShort(item.clockOut)} color={colors.destructive} />
                            </>
                          ) : (
                            <View style={[styles.liveChip, { backgroundColor: colors.primary + "20" }]}>
                              <View style={[styles.liveDot2, { backgroundColor: colors.primary }]} />
                              <Text style={[styles.liveChipText, { color: colors.primary }]}>Live</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.logRowRight}>
                      {item.totalMinutes ? (
                        <>
                          <Text style={[styles.logDuration, { color: colors.foreground }]}>
                            {durationLabel(item.totalMinutes)}
                          </Text>
                          <Text style={[styles.logCost, { color: colors.success }]}>
                            ${cost.toFixed(2)}
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.logActive, { color: colors.primary }]}>Active</Text>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

function buildAllSections(timeLogs: TimeLog[], employees: Employee[]) {
  const empLogs = timeLogs.filter((l) => {
    const emp = employees.find((e) => e.id === l.employeeId);
    return emp?.role === "employee";
  });
  const grouped = empLogs.reduce<Record<string, TimeLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});
  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ title: date, data: grouped[date] }));
}

function GlobalStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.gsStat}>
      <Text style={styles.gsValue}>{value}</Text>
      <Text style={styles.gsLabel}>{label}</Text>
      <Text style={styles.gsSub}>{sub}</Text>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function DetailSectionMeta({
  logs,
  getSessionLaborCost,
}: {
  logs: TimeLog[];
  getSessionLaborCost: (l: TimeLog) => number;
}) {
  const colors = useColors();
  const completed = logs.filter((l) => l.totalMinutes);
  const totalMins = completed.reduce((s, l) => s + (l.totalMinutes ?? 0), 0);
  const totalCost = completed.reduce((s, l) => s + getSessionLaborCost(l), 0);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Text style={[styles.sectionMetaHours, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.sectionMetaCost, { color: colors.success }]}>${totalCost.toFixed(2)}</Text>
    </View>
  );
}

function EmployeeSummaryCard({
  employee,
  isOnSite,
  dailyHours,
  weeklyHours,
  dailyCost,
  weeklyCost,
  totalHours,
  totalSessions,
  onViewDetail,
}: {
  employee: Employee;
  isOnSite: boolean;
  dailyHours: number;
  weeklyHours: number;
  dailyCost: number;
  weeklyCost: number;
  totalHours: number;
  totalSessions: number;
  onViewDetail: () => void;
}) {
  const colors = useColors();
  const initials = employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={[styles.empCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Employee header */}
      <View style={styles.empCardHeader}>
        <View style={[styles.empCardAvatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.empCardInitials}>{initials}</Text>
          {isOnSite ? (
            <View style={[styles.onSiteBadge, { backgroundColor: colors.success, borderColor: colors.card }]} />
          ) : null}
        </View>
        <View style={styles.empCardInfo}>
          <View style={styles.empCardNameRow}>
            <Text style={[styles.empCardName, { color: colors.foreground }]}>{employee.name}</Text>
            {isOnSite ? (
              <View style={[styles.workingNowChip, { backgroundColor: colors.success + "20" }]}>
                <Text style={[styles.workingNowText, { color: colors.success }]}>Working Now</Text>
              </View>
            ) : (
              <View style={[styles.stoppedChip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.stoppedText, { color: colors.mutedForeground }]}>Stopped</Text>
              </View>
            )}
          </View>
          <Text style={[styles.empCardPosition, { color: colors.mutedForeground }]}>
            {employee.position} · ${employee.hourlyRate}/hr
          </Text>
        </View>
      </View>

      {/* Period stats grid */}
      <View style={[styles.periodGrid, { borderColor: colors.border }]}>
        <PeriodCell
          period="Today"
          hours={dailyHours}
          cost={dailyCost}
          highlight={dailyHours > 0}
        />
        <View style={[styles.gridDivider, { backgroundColor: colors.border }]} />
        <PeriodCell period="This Week" hours={weeklyHours} cost={weeklyCost} />
        <View style={[styles.gridDivider, { backgroundColor: colors.border }]} />
        <PeriodCell period="All Time" hours={totalHours} cost={totalHours * employee.hourlyRate} />
      </View>

      {/* Footer */}
      <View style={styles.empCardFooter}>
        <Text style={[styles.sessionCount, { color: colors.mutedForeground }]}>
          {totalSessions} completed session{totalSessions !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity
          style={[styles.detailBtn, { backgroundColor: colors.accent }]}
          onPress={onViewDetail}
        >
          <Text style={styles.detailBtnText}>View Log</Text>
          <Feather name="chevron-right" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PeriodCell({
  period,
  hours,
  cost,
  highlight,
}: {
  period: string;
  hours: number;
  cost: number;
  highlight?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.periodCell}>
      <Text style={[styles.periodLabel, { color: colors.mutedForeground }]}>{period}</Text>
      <Text style={[styles.periodHours, { color: highlight ? colors.primary : colors.foreground }]}>
        {hours.toFixed(1)}h
      </Text>
      <Text style={[styles.periodCost, { color: colors.success }]}>
        ${cost.toFixed(2)}
      </Text>
    </View>
  );
}

function LogTimeChip({ icon, time, color }: { icon: string; time: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.ltChip}>
      <Feather name={icon as any} size={10} color={color} />
      <Text style={[styles.ltTime, { color: colors.mutedForeground }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  onSitePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  onSiteDot: { width: 7, height: 7, borderRadius: 4 },
  onSiteText: { fontSize: 12, fontWeight: "700" },
  globalSummary: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 18 },
  gsStat: { flex: 1, alignItems: "center", gap: 1 },
  gsDivider: { width: 1, marginVertical: 4 },
  gsValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  gsLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  gsSub: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "500" },
  viewToggle: {
    flexDirection: "row",
    borderBottomWidth: 1,
    backgroundColor: "transparent",
  },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  toggleText: { fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  emptyFlex: { flex: 1 },
  // Employee summary cards
  empCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  empCardHeader: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14 },
  empCardAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", position: "relative" },
  empCardInitials: { color: "#fff", fontWeight: "700", fontSize: 16 },
  onSiteBadge: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  empCardInfo: { flex: 1, gap: 3 },
  empCardNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  empCardName: { fontSize: 15, fontWeight: "700" },
  workingNowChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  workingNowText: { fontSize: 11, fontWeight: "700" },
  stoppedChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  stoppedText: { fontSize: 11, fontWeight: "600" },
  empCardPosition: { fontSize: 12 },
  periodGrid: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  periodCell: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 },
  gridDivider: { width: 1, marginVertical: 8 },
  periodLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  periodHours: { fontSize: 18, fontWeight: "800" },
  periodCost: { fontSize: 11, fontWeight: "600" },
  empCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  sessionCount: { fontSize: 12 },
  detailBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  detailBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  // Detail view
  empPills: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  empPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  empPillText: { fontSize: 13, fontWeight: "600" },
  empMiniSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  empMiniLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  empAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  empInitials: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empMiniName: { fontSize: 14, fontWeight: "700" },
  empMiniRate: { fontSize: 12, marginTop: 1 },
  empMiniStats: { flexDirection: "row", gap: 16 },
  miniStat: { alignItems: "center", gap: 1 },
  miniStatValue: { fontSize: 16, fontWeight: "800" },
  miniStatLabel: { fontSize: 10, fontWeight: "500" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700" },
  sectionMetaHours: { fontSize: 13, fontWeight: "700" },
  sectionMetaCost: { fontSize: 12, fontWeight: "600" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  logRowLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  miniAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  miniAvatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  logRowInfo: { flex: 1, gap: 3 },
  logRowName: { fontSize: 13, fontWeight: "700" },
  logRowProject: { fontSize: 12 },
  logTimes: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100 },
  liveDot2: { width: 5, height: 5, borderRadius: 3 },
  liveChipText: { fontSize: 10, fontWeight: "700" },
  logRowRight: { alignItems: "flex-end", gap: 2 },
  logDuration: { fontSize: 14, fontWeight: "700" },
  logCost: { fontSize: 12, fontWeight: "600" },
  logActive: { fontSize: 12, fontWeight: "700" },
  ltChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  ltTime: { fontSize: 11 },
});
