import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge } from "@/components/StatusBadge";
import { Employee, Expense, Project, TimeLog, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

/* ─────────────────────────────────────────────────────────────
   TYPES & HELPERS
───────────────────────────────────────────────────────────── */

type ReportTab = "overview" | "projects" | "employees";

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtH(h: number) {
  return `${h.toFixed(1)}h`;
}
function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

/* ─────────────────────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────────────────────── */

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { projects, employees, timeLogs, expenses } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [tab, setTab] = useState<ReportTab>("overview");
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  // Pickers
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  const staff = employees.filter((e) => e.role === "employee");

  const activeFilterCount = [
    filterProjectId !== "all",
    filterEmployeeId !== "all",
    !!filterFrom,
    !!filterTo,
  ].filter(Boolean).length;

  // ── Filtered time logs ──
  const filteredLogs = useMemo<TimeLog[]>(() => {
    return timeLogs.filter((l) => {
      if (!l.totalMinutes) return false;
      if (filterProjectId !== "all" && l.projectId !== filterProjectId) return false;
      if (filterEmployeeId !== "all" && l.employeeId !== filterEmployeeId) return false;
      if (filterFrom && l.date < filterFrom) return false;
      if (filterTo && l.date > filterTo) return false;
      return true;
    });
  }, [timeLogs, filterProjectId, filterEmployeeId, filterFrom, filterTo]);

  // ── Filtered expenses ──
  const filteredExpenses = useMemo<Expense[]>(() => {
    return expenses.filter((e) => {
      if (filterProjectId !== "all" && e.projectId !== filterProjectId) return false;
      if (filterFrom && e.date < filterFrom) return false;
      if (filterTo && e.date > filterTo) return false;
      return true;
    });
  }, [expenses, filterProjectId, filterFrom, filterTo]);

  // ── Scoped projects ──
  const scopedProjects = useMemo<Project[]>(() => {
    if (filterProjectId !== "all") return projects.filter((p) => p.id === filterProjectId);
    if (filterEmployeeId !== "all") return projects.filter((p) => p.assignedEmployeeIds.includes(filterEmployeeId));
    return projects;
  }, [projects, filterProjectId, filterEmployeeId]);

  // ── Overview totals ──
  const overviewTotals = useMemo(() => {
    const laborCost = filteredLogs.reduce((s, l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      return s + (l.totalMinutes! / 60) * (emp?.hourlyRate ?? 0);
    }, 0);
    const expensesTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalHours = filteredLogs.reduce((s, l) => s + l.totalMinutes! / 60, 0);
    const revenue = scopedProjects
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + p.totalValue, 0);
    const contractValue = scopedProjects.reduce((s, p) => s + p.totalValue, 0);
    return { laborCost, expensesTotal, totalHours, revenue, contractValue, totalCost: laborCost + expensesTotal };
  }, [filteredLogs, filteredExpenses, scopedProjects, employees]);

  // ── Project-level rows ──
  const projectRows = useMemo(() => {
    return scopedProjects.map((proj) => {
      const logs = filteredLogs.filter((l) => l.projectId === proj.id);
      const expList = filteredExpenses.filter((e) => e.projectId === proj.id);
      const hours = logs.reduce((s, l) => s + l.totalMinutes! / 60, 0);
      const laborCost = logs.reduce((s, l) => {
        const emp = employees.find((e) => e.id === l.employeeId);
        return s + (l.totalMinutes! / 60) * (emp?.hourlyRate ?? 0);
      }, 0);
      const expTotal = expList.reduce((s, e) => s + e.amount, 0);
      const totalCost = laborCost + expTotal;
      const remaining = proj.totalValue - totalCost;
      const duration = proj.startDate && proj.expectedEndDate ? daysBetween(proj.startDate, proj.expectedEndDate) : null;
      const actualDuration = proj.startDate && proj.status === "completed" ? daysBetween(proj.startDate, proj.expectedEndDate) : null;

      // Per-employee breakdown
      const empBreakdown = staff.map((emp) => {
        const eLogs = logs.filter((l) => l.employeeId === emp.id);
        const eHours = eLogs.reduce((s, l) => s + l.totalMinutes! / 60, 0);
        const eCost = eHours * emp.hourlyRate;
        return { emp, hours: eHours, cost: eCost };
      }).filter((x) => x.hours > 0);

      // Expense by category
      const byCat: Record<string, number> = {};
      expList.forEach((e) => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });

      return { proj, logs, hours, laborCost, expTotal, totalCost, remaining, duration, actualDuration, empBreakdown, byCat };
    });
  }, [scopedProjects, filteredLogs, filteredExpenses, employees, staff]);

  // ── Employee-level rows ──
  const employeeRows = useMemo(() => {
    const empList = filterEmployeeId !== "all" ? staff.filter((e) => e.id === filterEmployeeId) : staff;
    return empList.map((emp) => {
      const logs = filteredLogs.filter((l) => l.employeeId === emp.id);
      const hours = logs.reduce((s, l) => s + l.totalMinutes! / 60, 0);
      const laborCost = hours * emp.hourlyRate;

      // Per-project breakdown
      const projBreakdown = scopedProjects.map((p) => {
        const pLogs = logs.filter((l) => l.projectId === p.id);
        const pHours = pLogs.reduce((s, l) => s + l.totalMinutes! / 60, 0);
        const pCost = pHours * emp.hourlyRate;
        return { proj: p, hours: pHours, cost: pCost, sessions: pLogs.length };
      }).filter((x) => x.hours > 0);

      const sessions = logs.length;
      const avgSession = sessions > 0 ? hours / sessions : 0;
      return { emp, hours, laborCost, sessions, avgSession, projBreakdown };
    }).filter((r) => r.hours > 0 || filterEmployeeId !== "all");
  }, [staff, filteredLogs, scopedProjects, filterEmployeeId]);

  const hasFilters = activeFilterCount > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: hasFilters ? colors.primary : "rgba(255,255,255,0.15)" }]}
          onPress={() => setShowFilters(true)}
        >
          <Feather name="sliders" size={14} color="#fff" />
          <Text style={styles.filterBtnText}>
            {hasFilters ? `Filters (${activeFilterCount})` : "Filter"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Active filter pills ── */}
      {hasFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.pillScroll, { backgroundColor: colors.accent }]}
          contentContainerStyle={styles.pillRow}
        >
          {filterProjectId !== "all" ? (
            <FilterPill
              label={projects.find((p) => p.id === filterProjectId)?.name ?? "Project"}
              onRemove={() => setFilterProjectId("all")}
            />
          ) : null}
          {filterEmployeeId !== "all" ? (
            <FilterPill
              label={employees.find((e) => e.id === filterEmployeeId)?.name ?? "Employee"}
              onRemove={() => setFilterEmployeeId("all")}
            />
          ) : null}
          {filterFrom ? (
            <FilterPill label={`From ${filterFrom}`} onRemove={() => setFilterFrom("")} />
          ) : null}
          {filterTo ? (
            <FilterPill label={`To ${filterTo}`} onRemove={() => setFilterTo("")} />
          ) : null}
          <TouchableOpacity
            style={styles.clearAllPill}
            onPress={() => { setFilterProjectId("all"); setFilterEmployeeId("all"); setFilterFrom(""); setFilterTo(""); }}
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* ── Overview banner ── */}
      <View style={[styles.overviewBanner, { backgroundColor: colors.accent }]}>
        <OverviewCell label="Contract" value={fmt(overviewTotals.contractValue)} color="#fff" />
        <OverviewCell label="Labor" value={fmt(overviewTotals.laborCost)} color="#f87171" />
        <OverviewCell label="Expenses" value={fmt(overviewTotals.expensesTotal)} color="#fbbf24" />
        <OverviewCell label="Total Hours" value={fmtH(overviewTotals.totalHours)} color={colors.primary} />
        <OverviewCell
          label="Remaining"
          value={fmt(overviewTotals.contractValue - overviewTotals.totalCost)}
          color={overviewTotals.contractValue - overviewTotals.totalCost >= 0 ? "#4ade80" : "#f87171"}
        />
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: "overview", label: "Overview", icon: "pie-chart" },
          { key: "projects", label: "Projects", icon: "briefcase" },
          { key: "employees", label: "Employees", icon: "users" },
        ] as { key: ReportTab; label: string; icon: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, { borderBottomColor: tab === t.key ? colors.primary : "transparent", borderBottomWidth: 2 }]}
            onPress={() => setTab(t.key)}
          >
            <Feather name={t.icon as any} size={13} color={tab === t.key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>
        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {tab === "overview" ? (
          <>
            <OverviewSummaryCard
              totals={overviewTotals}
              projectCount={scopedProjects.length}
              employeeCount={filterEmployeeId === "all" ? staff.length : 1}
            />

            {/* Breakdown by project */}
            <SectionHeader title="By Project" icon="briefcase" />
            {projectRows.length === 0 ? (
              <EmptyNote text="No project data matches the current filters." />
            ) : (
              projectRows.map(({ proj, hours, laborCost, expTotal, totalCost, remaining }) => (
                <View key={proj.id} style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.miniCardHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.miniCardTitle, { color: colors.foreground }]} numberOfLines={1}>{proj.name}</Text>
                    </View>
                    <StatusBadge status={proj.status} size="sm" />
                  </View>
                  <View style={styles.miniStats}>
                    <MiniStat label="Hours" value={fmtH(hours)} color={colors.primary} />
                    <MiniStat label="Labor" value={fmt(laborCost)} color={colors.destructive} />
                    <MiniStat label="Expenses" value={fmt(expTotal)} color={colors.warning} />
                    <MiniStat
                      label="Balance"
                      value={fmt(remaining)}
                      color={remaining >= 0 ? colors.success : colors.destructive}
                    />
                  </View>
                </View>
              ))
            )}

            {/* Breakdown by employee */}
            <SectionHeader title="By Employee" icon="users" />
            {employeeRows.length === 0 ? (
              <EmptyNote text="No employee data matches the current filters." />
            ) : (
              employeeRows.map(({ emp, hours, laborCost, sessions }) => (
                <View key={emp.id} style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.miniCardHead}>
                    <View style={[styles.empAvatarSm, { backgroundColor: colors.accent }]}>
                      <Text style={styles.empInitialsSm}>
                        {emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.miniCardTitle, { color: colors.foreground }]}>{emp.name}</Text>
                      <Text style={[styles.miniCardSub, { color: colors.mutedForeground }]}>{emp.position}</Text>
                    </View>
                  </View>
                  <View style={styles.miniStats}>
                    <MiniStat label="Hours" value={fmtH(hours)} color={colors.primary} />
                    <MiniStat label="Sessions" value={sessions.toString()} color={colors.warning} />
                    <MiniStat label="Rate" value={`$${emp.hourlyRate}/h`} color={colors.mutedForeground} />
                    <MiniStat label="Labor Cost" value={fmt(laborCost)} color={colors.destructive} />
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {/* ════════════════ PROJECTS TAB ════════════════ */}
        {tab === "projects" ? (
          projectRows.length === 0 ? (
            <EmptyNote text="No project data matches the current filters." />
          ) : (
            projectRows.map(({ proj, hours, laborCost, expTotal, totalCost, remaining, duration, empBreakdown, byCat }) => (
              <View key={proj.id} style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Card header */}
                <View style={styles.reportCardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>{proj.name}</Text>
                    <Text style={[styles.reportCardSub, { color: colors.mutedForeground }]} numberOfLines={1}>{proj.address}</Text>
                  </View>
                  <StatusBadge status={proj.status} />
                </View>

                {/* Financial rows */}
                <View style={[styles.segment, { borderTopColor: colors.border }]}>
                  <SegmentTitle label="Financials" />
                  <FinRow label="Contract Value" value={fmt(proj.totalValue)} color={colors.foreground} />
                  <FinRow label="Labor Cost" value={fmt(laborCost)} color={colors.destructive} />
                  <FinRow label="Other Expenses" value={fmt(expTotal)} color={colors.warning} />
                  <FinRow label="Total Spend" value={fmt(totalCost)} color={colors.foreground} bold />
                  <Divider />
                  <FinRow
                    label="Remaining Balance"
                    value={fmt(remaining)}
                    color={remaining >= 0 ? colors.success : colors.destructive}
                    bold
                  />
                  {proj.totalValue > 0 ? (
                    <ProgressBar
                      used={totalCost}
                      total={proj.totalValue}
                      color={remaining >= 0 ? colors.success : colors.destructive}
                    />
                  ) : null}
                </View>

                {/* Hours */}
                <View style={[styles.segment, { borderTopColor: colors.border }]}>
                  <SegmentTitle label="Labor Hours" />
                  <FinRow label="Total Hours Logged" value={fmtH(hours)} color={colors.foreground} />
                  {duration !== null ? (
                    <FinRow label="Planned Duration" value={`${duration} days`} color={colors.mutedForeground} />
                  ) : null}
                  {proj.startDate ? (
                    <FinRow label="Start Date" value={new Date(proj.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} color={colors.mutedForeground} />
                  ) : null}
                  {proj.expectedEndDate ? (
                    <FinRow label="Target End" value={new Date(proj.expectedEndDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} color={colors.mutedForeground} />
                  ) : null}
                </View>

                {/* Per-employee breakdown */}
                {empBreakdown.length > 0 ? (
                  <View style={[styles.segment, { borderTopColor: colors.border }]}>
                    <SegmentTitle label="Employee Hours" />
                    {empBreakdown.map(({ emp, hours: eh, cost: ec }) => (
                      <View key={emp.id} style={styles.empBreakRow}>
                        <View style={[styles.empAvatarXs, { backgroundColor: colors.accent }]}>
                          <Text style={styles.empInitialsXs}>
                            {emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </Text>
                        </View>
                        <Text style={[styles.empBreakName, { color: colors.foreground }]}>{emp.name}</Text>
                        <View style={styles.empBreakNums}>
                          <Text style={[styles.empBreakHours, { color: colors.primary }]}>{fmtH(eh)}</Text>
                          <Text style={[styles.empBreakCost, { color: colors.destructive }]}>{fmt(ec)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Expenses by category */}
                {Object.keys(byCat).length > 0 ? (
                  <View style={[styles.segment, { borderTopColor: colors.border }]}>
                    <SegmentTitle label="Expenses by Category" />
                    {Object.entries(byCat).map(([cat, amt]) => (
                      <FinRow key={cat} label={cat} value={fmt(amt)} color={colors.mutedForeground} />
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )
        ) : null}

        {/* ════════════════ EMPLOYEES TAB ════════════════ */}
        {tab === "employees" ? (
          employeeRows.length === 0 ? (
            <EmptyNote text="No employee data matches the current filters." />
          ) : (
            employeeRows.map(({ emp, hours, laborCost, sessions, avgSession, projBreakdown }) => (
              <View key={emp.id} style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Header */}
                <View style={styles.empReportHead}>
                  <View style={[styles.empAvatarLg, { backgroundColor: colors.accent }]}>
                    <Text style={styles.empInitialsLg}>
                      {emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>{emp.name}</Text>
                    <Text style={[styles.reportCardSub, { color: colors.mutedForeground }]}>{emp.position}</Text>
                  </View>
                  <View style={[styles.rateTag, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.rateTagText, { color: colors.primary }]}>${emp.hourlyRate}/hr</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={[styles.segment, { borderTopColor: colors.border }]}>
                  <SegmentTitle label="Hours & Labor" />
                  <FinRow label="Total Hours Worked" value={fmtH(hours)} color={colors.foreground} bold />
                  <FinRow label="Total Labor Cost" value={fmt(laborCost)} color={colors.destructive} bold />
                  <Divider />
                  <FinRow label="Sessions Logged" value={sessions.toString()} color={colors.mutedForeground} />
                  <FinRow label="Avg Session Length" value={fmtH(avgSession)} color={colors.mutedForeground} />
                  <FinRow label="Hourly Rate" value={`$${emp.hourlyRate}/hr`} color={colors.mutedForeground} />
                </View>

                {/* Per-project breakdown */}
                {projBreakdown.length > 0 ? (
                  <View style={[styles.segment, { borderTopColor: colors.border }]}>
                    <SegmentTitle label="Hours per Project" />
                    {projBreakdown.map(({ proj, hours: ph, cost: pc, sessions: ps }) => (
                      <View key={proj.id} style={styles.projBreakRow}>
                        <View style={[styles.projStatusDot, { backgroundColor: proj.status === "in_progress" ? colors.primary : proj.status === "completed" ? colors.success : colors.warning }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.projBreakName, { color: colors.foreground }]} numberOfLines={1}>{proj.name}</Text>
                          <Text style={[styles.projBreakSess, { color: colors.mutedForeground }]}>{ps} session{ps !== 1 ? "s" : ""}</Text>
                        </View>
                        <View style={styles.projBreakNums}>
                          <Text style={[styles.projBreakHours, { color: colors.primary }]}>{fmtH(ph)}</Text>
                          <Text style={[styles.projBreakCost, { color: colors.destructive }]}>{fmt(pc)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )
        ) : null}
      </ScrollView>

      {/* ── Filters Modal ── */}
      {showFilters ? (
        <FiltersModal
          projects={projects}
          employees={staff}
          filterProjectId={filterProjectId}
          filterEmployeeId={filterEmployeeId}
          filterFrom={filterFrom}
          filterTo={filterTo}
          onChangeProject={setFilterProjectId}
          onChangeEmployee={setFilterEmployeeId}
          onChangeFrom={setFilterFrom}
          onChangeTo={setFilterTo}
          onClose={() => setShowFilters(false)}
          onReset={() => {
            setFilterProjectId("all");
            setFilterEmployeeId("all");
            setFilterFrom("");
            setFilterTo("");
            setShowFilters(false);
          }}
        />
      ) : null}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   FILTERS MODAL
───────────────────────────────────────────────────────────── */

function FiltersModal({
  projects, employees,
  filterProjectId, filterEmployeeId, filterFrom, filterTo,
  onChangeProject, onChangeEmployee, onChangeFrom, onChangeTo,
  onClose, onReset,
}: {
  projects: Project[];
  employees: Employee[];
  filterProjectId: string;
  filterEmployeeId: string;
  filterFrom: string;
  filterTo: string;
  onChangeProject: (v: string) => void;
  onChangeEmployee: (v: string) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [localProject, setLocalProject] = useState(filterProjectId);
  const [localEmployee, setLocalEmployee] = useState(filterEmployeeId);
  const [localFrom, setLocalFrom] = useState(filterFrom);
  const [localTo, setLocalTo] = useState(filterTo);

  const handleApply = () => {
    onChangeProject(localProject);
    onChangeEmployee(localEmployee);
    onChangeFrom(localFrom);
    onChangeTo(localTo);
    onClose();
  };

  const handleReset = () => {
    setLocalProject("all");
    setLocalEmployee("all");
    setLocalFrom("");
    setLocalTo("");
    onReset();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Filter Reports</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {/* Project filter */}
          <FilterSection title="Project" icon="briefcase">
            <TouchableOpacity
              style={[styles.pickerRow, { borderColor: localProject === "all" ? colors.primary : colors.border, backgroundColor: localProject === "all" ? colors.primary + "10" : colors.card }]}
              onPress={() => setLocalProject("all")}
            >
              <View style={[styles.pickerCheck, { backgroundColor: localProject === "all" ? colors.primary : "transparent", borderColor: localProject === "all" ? colors.primary : colors.border }]}>
                {localProject === "all" ? <Feather name="check" size={11} color="#fff" /> : null}
              </View>
              <Text style={[styles.pickerLabel, { color: colors.foreground }]}>All Projects</Text>
            </TouchableOpacity>
            {projects.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.pickerRow, { borderColor: localProject === p.id ? colors.primary : colors.border, backgroundColor: localProject === p.id ? colors.primary + "10" : colors.card }]}
                onPress={() => setLocalProject(p.id)}
              >
                <View style={[styles.pickerCheck, { backgroundColor: localProject === p.id ? colors.primary : "transparent", borderColor: localProject === p.id ? colors.primary : colors.border }]}>
                  {localProject === p.id ? <Feather name="check" size={11} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.pickerSub, { color: colors.mutedForeground }]} numberOfLines={1}>{p.address}</Text>
                </View>
                <StatusBadge status={p.status} size="sm" />
              </TouchableOpacity>
            ))}
          </FilterSection>

          {/* Employee filter */}
          <FilterSection title="Employee" icon="user">
            <TouchableOpacity
              style={[styles.pickerRow, { borderColor: localEmployee === "all" ? colors.primary : colors.border, backgroundColor: localEmployee === "all" ? colors.primary + "10" : colors.card }]}
              onPress={() => setLocalEmployee("all")}
            >
              <View style={[styles.pickerCheck, { backgroundColor: localEmployee === "all" ? colors.primary : "transparent", borderColor: localEmployee === "all" ? colors.primary : colors.border }]}>
                {localEmployee === "all" ? <Feather name="check" size={11} color="#fff" /> : null}
              </View>
              <Text style={[styles.pickerLabel, { color: colors.foreground }]}>All Employees</Text>
            </TouchableOpacity>
            {employees.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.pickerRow, { borderColor: localEmployee === e.id ? colors.primary : colors.border, backgroundColor: localEmployee === e.id ? colors.primary + "10" : colors.card }]}
                onPress={() => setLocalEmployee(e.id)}
              >
                <View style={[styles.pickerCheck, { backgroundColor: localEmployee === e.id ? colors.primary : "transparent", borderColor: localEmployee === e.id ? colors.primary : colors.border }]}>
                  {localEmployee === e.id ? <Feather name="check" size={11} color="#fff" /> : null}
                </View>
                <View style={[styles.empAvatarXs, { backgroundColor: "#0f172a" }]}>
                  <Text style={styles.empInitialsXs}>
                    {e.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{e.name}</Text>
                  <Text style={[styles.pickerSub, { color: colors.mutedForeground }]}>{e.position} · ${e.hourlyRate}/hr</Text>
                </View>
              </TouchableOpacity>
            ))}
          </FilterSection>

          {/* Date range filter */}
          <FilterSection title="Date Range" icon="calendar">
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>From</Text>
                <TextInput
                  style={[styles.dateInput, { borderColor: localFrom ? colors.primary : colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                  value={localFrom}
                  onChangeText={setLocalFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={[styles.dateSep, { backgroundColor: colors.border }]} />
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>To</Text>
                <TextInput
                  style={[styles.dateInput, { borderColor: localTo ? colors.primary : colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                  value={localTo}
                  onChangeText={setLocalTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
            <View style={styles.quickDates}>
              {[
                { label: "Last 7 days", days: 7 },
                { label: "Last 30 days", days: 30 },
                { label: "Last 90 days", days: 90 },
              ].map(({ label, days }) => {
                const to = new Date();
                const from = new Date(to.getTime() - days * 86400000);
                const f = from.toISOString().split("T")[0];
                const t = to.toISOString().split("T")[0];
                const isActive = localFrom === f && localTo === t;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.quickDateBtn, { backgroundColor: isActive ? colors.primary : colors.muted }]}
                    onPress={() => { setLocalFrom(f); setLocalTo(t); }}
                  >
                    <Text style={[styles.quickDateText, { color: isActive ? "#fff" : colors.mutedForeground }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   SMALL SHARED COMPONENTS
───────────────────────────────────────────────────────────── */

function OverviewSummaryCard({ totals, projectCount, employeeCount }: {
  totals: { contractValue: number; laborCost: number; expensesTotal: number; totalHours: number; totalCost: number; contractValue: number };
  projectCount: number;
  employeeCount: number;
}) {
  const colors = useColors();
  const remaining = totals.contractValue - totals.totalCost;
  return (
    <View style={[styles.overviewSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.overviewSummaryGrid}>
        <OverviewBigCell label="Contract Value" value={fmt(totals.contractValue)} icon="dollar-sign" color={colors.foreground} />
        <OverviewBigCell label="Total Labor" value={fmt(totals.laborCost)} icon="clock" color={colors.destructive} />
        <OverviewBigCell label="Expenses" value={fmt(totals.expensesTotal)} icon="shopping-cart" color={colors.warning} />
        <OverviewBigCell label="Hours Logged" value={fmtH(totals.totalHours)} icon="activity" color={colors.primary} />
      </View>
      <View style={[styles.overviewBalanceRow, { backgroundColor: remaining >= 0 ? colors.success + "12" : colors.destructive + "12", borderColor: remaining >= 0 ? colors.success + "30" : colors.destructive + "30" }]}>
        <Feather name="trending-up" size={14} color={remaining >= 0 ? colors.success : colors.destructive} />
        <Text style={[styles.overviewBalanceLabel, { color: colors.mutedForeground }]}>Total Remaining Balance</Text>
        <Text style={[styles.overviewBalanceValue, { color: remaining >= 0 ? colors.success : colors.destructive }]}>{fmt(remaining)}</Text>
      </View>
      <View style={styles.overviewCountRow}>
        <View style={[styles.overviewCountCell, { borderColor: colors.border }]}>
          <Text style={[styles.overviewCountValue, { color: colors.foreground }]}>{projectCount}</Text>
          <Text style={[styles.overviewCountLabel, { color: colors.mutedForeground }]}>Projects</Text>
        </View>
        <View style={[styles.overviewCountCell, { borderColor: colors.border }]}>
          <Text style={[styles.overviewCountValue, { color: colors.foreground }]}>{employeeCount}</Text>
          <Text style={[styles.overviewCountLabel, { color: colors.mutedForeground }]}>Employees</Text>
        </View>
        <View style={[styles.overviewCountCell, { borderColor: "transparent" }]}>
          <Text style={[styles.overviewCountValue, { color: colors.foreground }]}>
            {totals.contractValue > 0 ? `${(((totals.contractValue - totals.totalCost) / totals.contractValue) * 100).toFixed(1)}%` : "—"}
          </Text>
          <Text style={[styles.overviewCountLabel, { color: colors.mutedForeground }]}>Margin</Text>
        </View>
      </View>
    </View>
  );
}

function OverviewBigCell({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.overviewBigCell}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.overviewBigValue, { color }]}>{value}</Text>
      <Text style={[styles.overviewBigLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function OverviewCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.overviewCell}>
      <Text style={[styles.overviewCellValue, { color }]}>{value}</Text>
      <Text style={styles.overviewCellLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon as any} size={13} color={colors.primary} />
      <Text style={[styles.sectionHeaderText, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );
}

function SegmentTitle({ label }: { label: string }) {
  const colors = useColors();
  return <Text style={[styles.segmentTitle, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>;
}

function FinRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.finRow}>
      <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.finValue, { color, fontWeight: bold ? "800" : "500" }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = Math.min(Math.max(used / total, 0), 1);
  const colors = useColors();
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{(pct * 100).toFixed(0)}% spent</Text>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.miniStatCell}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <TouchableOpacity style={styles.pill} onPress={onRemove}>
      <Text style={styles.pillText}>{label}</Text>
      <Feather name="x" size={11} color="rgba(255,255,255,0.85)" />
    </TouchableOpacity>
  );
}

function EmptyNote({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.emptyNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name="inbox" size={24} color={colors.mutedForeground} />
      <Text style={[styles.emptyNoteText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

function FilterSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.filterSection}>
      <View style={styles.filterSectionHead}>
        <Feather name={icon as any} size={14} color={colors.primary} />
        <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={styles.filterSectionBody}>{children}</View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  filterBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Filter pills row
  pillScroll: { maxHeight: 44 },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(249,115,22,0.8)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  clearAllPill: { paddingHorizontal: 10, paddingVertical: 4 },
  clearAllText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },

  // Overview banner
  overviewBanner: { flexDirection: "row", paddingHorizontal: 10, paddingBottom: 14 },
  overviewCell: { flex: 1, alignItems: "center", gap: 2 },
  overviewCellValue: { fontSize: 13, fontWeight: "800" },
  overviewCellLabel: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: "500", textAlign: "center" },

  // Tab bar
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  // Content
  content: { padding: 14, gap: 12 },

  // Overview summary card
  overviewSummaryCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  overviewSummaryGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 16 },
  overviewBigCell: { width: "45%", gap: 4 },
  overviewBigValue: { fontSize: 20, fontWeight: "800" },
  overviewBigLabel: { fontSize: 11, fontWeight: "500" },
  overviewBalanceRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1 },
  overviewBalanceLabel: { flex: 1, fontSize: 13 },
  overviewBalanceValue: { fontSize: 16, fontWeight: "800" },
  overviewCountRow: { flexDirection: "row" },
  overviewCountCell: { flex: 1, alignItems: "center", paddingVertical: 12, borderRightWidth: 1 },
  overviewCountValue: { fontSize: 18, fontWeight: "800" },
  overviewCountLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4, paddingHorizontal: 2 },
  sectionHeaderText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  // Mini cards (overview)
  miniCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  miniCardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniCardTitle: { fontSize: 13, fontWeight: "700" },
  miniCardSub: { fontSize: 11, marginTop: 1 },
  miniStats: { flexDirection: "row" },
  miniStatCell: { flex: 1, alignItems: "center", gap: 2 },
  miniStatValue: { fontSize: 13, fontWeight: "800" },
  miniStatLabel: { fontSize: 10, fontWeight: "500" },

  // Report cards (projects / employees)
  reportCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reportCardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  reportCardTitle: { fontSize: 15, fontWeight: "700" },
  reportCardSub: { fontSize: 12, marginTop: 2 },

  // Segments
  segment: { padding: 14, gap: 8, borderTopWidth: 1 },
  segmentTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, marginBottom: 4 },

  // Financial rows
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  finLabel: { fontSize: 13 },
  finValue: { fontSize: 13 },
  divider: { height: 1, marginVertical: 2 },

  // Progress bar
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%" },
  progressLabel: { fontSize: 11, width: 70, textAlign: "right" },

  // Employee breakdown rows
  empBreakRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  empBreakName: { flex: 1, fontSize: 13, fontWeight: "600" },
  empBreakNums: { alignItems: "flex-end", gap: 1 },
  empBreakHours: { fontSize: 13, fontWeight: "700" },
  empBreakCost: { fontSize: 11 },

  // Project breakdown rows
  projBreakRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  projStatusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  projBreakName: { fontSize: 13, fontWeight: "600" },
  projBreakSess: { fontSize: 11, marginTop: 1 },
  projBreakNums: { alignItems: "flex-end", gap: 1 },
  projBreakHours: { fontSize: 13, fontWeight: "700" },
  projBreakCost: { fontSize: 11 },

  // Employee report header
  empReportHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  rateTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  rateTagText: { fontSize: 12, fontWeight: "700" },

  // Avatars
  empAvatarSm: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  empInitialsSm: { color: "#fff", fontWeight: "700", fontSize: 11 },
  empAvatarXs: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  empInitialsXs: { color: "#fff", fontWeight: "700", fontSize: 9 },
  empAvatarLg: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  empInitialsLg: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Empty state
  emptyNote: { borderRadius: 14, borderWidth: 1, padding: 28, alignItems: "center", gap: 10 },
  emptyNoteText: { fontSize: 13, textAlign: "center" },

  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  resetText: { fontSize: 14, fontWeight: "700" },
  modalContent: { padding: 16, gap: 18, paddingBottom: 40 },

  // Filter sections
  filterSection: { gap: 10 },
  filterSectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterSectionTitle: { fontSize: 15, fontWeight: "700" },
  filterSectionBody: { gap: 8 },

  // Picker rows
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  pickerCheck: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  pickerLabel: { fontSize: 14, fontWeight: "600" },
  pickerSub: { fontSize: 11, marginTop: 1 },

  // Date range
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateField: { flex: 1, gap: 5 },
  dateLabel: { fontSize: 12, fontWeight: "600" },
  dateInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dateSep: { width: 1, height: 40, marginTop: 18 },
  quickDates: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickDateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
  quickDateText: { fontSize: 12, fontWeight: "600" },

  // Apply button
  applyBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
