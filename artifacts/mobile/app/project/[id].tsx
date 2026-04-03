import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Expense, ProjectStatus, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: ProjectStatus[] = ["pending", "in_progress", "completed", "on_hold"];

const EXPENSE_CATEGORIES = [
  { key: "Materials", icon: "package" },
  { key: "Paint", icon: "droplet" },
  { key: "Transport", icon: "truck" },
  { key: "Equipment", icon: "tool" },
  { key: "Other", icon: "more-horizontal" },
] as const;

type ExpenseCategoryKey = typeof EXPENSE_CATEGORIES[number]["key"];

const CATEGORY_COLORS: Record<ExpenseCategoryKey, string> = {
  Materials: "#6366f1",
  Paint: "#f97316",
  Transport: "#06b6d4",
  Equipment: "#8b5cf6",
  Other: "#94a3b8",
};

export default function ProjectDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    projects,
    employees,
    timeLogs,
    expenses,
    updateProject,
    deleteProject,
    addExpense,
    deleteExpense,
    getProjectLaborCost,
    getProjectExpenses,
    getSessionLaborCost,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const project = projects.find((p) => p.id === id);
  const [activeTab, setActiveTab] = useState<"info" | "finances" | "timelog" | "expenses">("info");
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  if (!project) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Project not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = user?.role === "admin";
  const labor = getProjectLaborCost(project.id);
  const otherExp = getProjectExpenses(project.id);
  const totalCost = labor + otherExp;
  const profit = project.totalValue - totalCost;
  const margin = project.totalValue > 0 ? (profit / project.totalValue) * 100 : 0;
  const remaining = project.totalValue - totalCost;

  const projectLogs = timeLogs.filter((l) => l.projectId === project.id);
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const assignedEmployees = employees.filter((e) => project.assignedEmployeeIds.includes(e.id));

  const handleDelete = () => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProject(project.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    await updateProject(project.id, { status });
    setShowStatusPicker(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const adminTabs = ["info", "finances", "timelog", "expenses"] as const;
  const empTabs = ["info", "timelog"] as const;
  const tabs = isAdmin ? adminTabs : empTabs;

  const tabLabels: Record<string, string> = {
    info: "Details",
    finances: "Finances",
    timelog: "Time Log",
    expenses: "Expenses",
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.name}
        </Text>
        {isAdmin ? (
          <TouchableOpacity onPress={handleDelete}>
            <Feather name="trash-2" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      {/* Project status row */}
      <View style={[styles.projectHeader, { backgroundColor: colors.accent }]}>
        <StatusBadge status={project.status} />
        <View style={styles.projectHeaderRight}>
          {isAdmin ? (
            <TouchableOpacity
              style={styles.changeStatus}
              onPress={() => setShowStatusPicker(true)}
            >
              <Text style={styles.changeStatusText}>Change Status</Text>
            </TouchableOpacity>
          ) : null}
          {/* Mini finance summary in header */}
          <View style={styles.headerFinancials}>
            <Text style={styles.headerFinValue}>${project.totalValue.toLocaleString()}</Text>
            <Text style={[styles.headerFinProfit, { color: profit >= 0 ? "#4ade80" : "#f87171" }]}>
              {profit >= 0 ? "+" : ""}${profit.toFixed(0)} profit
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tab,
              {
                borderBottomColor: activeTab === t ? colors.primary : "transparent",
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(t as any)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === t ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tabLabels[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "info" && (
          <InfoTab project={project} assignedEmployees={assignedEmployees} />
        )}
        {activeTab === "finances" && isAdmin && (
          <FinancesTab
            project={project}
            labor={labor}
            otherExp={otherExp}
            totalCost={totalCost}
            profit={profit}
            margin={margin}
            remaining={remaining}
            projectLogs={projectLogs}
            projectExpenses={projectExpenses}
            employees={employees}
            getSessionLaborCost={getSessionLaborCost}
            onAddExpense={() => setShowAddExpense(true)}
          />
        )}
        {activeTab === "timelog" && (
          <TimeLogTab
            logs={projectLogs}
            employees={employees}
            getSessionLaborCost={getSessionLaborCost}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === "expenses" && isAdmin && (
          <ExpensesTab
            expenses={projectExpenses}
            labor={labor}
            onAdd={() => setShowAddExpense(true)}
            onDelete={deleteExpense}
          />
        )}
      </ScrollView>

      {/* Status picker */}
      <Modal visible={showStatusPicker} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Change Status</Text>
            <View style={{ width: 22 }} />
          </View>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusOption,
                {
                  backgroundColor: project.status === s ? colors.primary + "18" : colors.card,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => handleStatusChange(s)}
            >
              <StatusBadge status={s} />
              {project.status === s ? <Feather name="check" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Add expense */}
      {showAddExpense ? (
        <AddExpenseModal
          onClose={() => setShowAddExpense(false)}
          onSave={async (data) => {
            await addExpense({ ...data, projectId: project.id, createdBy: user?.id ?? "" });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowAddExpense(false);
          }}
        />
      ) : null}
    </View>
  );
}

/* ──────────────────────────── INFO TAB ──────────────────────────── */

function InfoTab({ project, assignedEmployees }: any) {
  const colors = useColors();

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) =>
    value ? (
      <View style={styles.infoRow}>
        <Feather name={icon as any} size={14} color={colors.mutedForeground} />
        <View>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
        </View>
      </View>
    ) : null;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Project Info</Text>
        <InfoRow icon="map-pin" label="Address" value={project.address} />
        <InfoRow icon="calendar" label="Start Date" value={new Date(project.startDate).toLocaleDateString()} />
        <InfoRow icon="calendar" label="Expected End" value={project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : ""} />
        <InfoRow icon="dollar-sign" label="Contract Value" value={`$${project.totalValue.toLocaleString()}`} />
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Client</Text>
        <InfoRow icon="user" label="Name" value={project.clientName} />
        <InfoRow icon="phone" label="Phone" value={project.clientPhone} />
        <InfoRow icon="mail" label="Email" value={project.clientEmail} />
      </View>
      {project.paintColors.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paint Colors</Text>
          {project.paintColors.map((c: string, i: number) => (
            <View key={i} style={styles.colorRow}>
              <View style={[styles.colorDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.colorText, { color: colors.foreground }]}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {assignedEmployees.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Assigned Crew</Text>
          {assignedEmployees.map((emp: any) => (
            <View key={emp.id} style={styles.empRow}>
              <View style={[styles.empAvatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.empInitials}>
                  {emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View>
                <Text style={[styles.empName, { color: colors.foreground }]}>{emp.name}</Text>
                <Text style={[styles.empPos, { color: colors.mutedForeground }]}>
                  {emp.position} · ${emp.hourlyRate}/hr
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {project.notes ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.foreground }]}>{project.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ──────────────────────────── FINANCES TAB ──────────────────────────── */

function FinancesTab({
  project, labor, otherExp, totalCost, profit, margin, remaining,
  projectLogs, projectExpenses, employees, getSessionLaborCost, onAddExpense,
}: any) {
  const colors = useColors();
  const isProfit = profit >= 0;
  const marginColor = margin >= 30 ? colors.success : margin >= 15 ? colors.warning : colors.destructive;

  // Per-employee labor breakdown
  const laborByEmployee = employees
    .filter((e: any) => project.assignedEmployeeIds.includes(e.id))
    .map((emp: any) => {
      const empLogs = projectLogs.filter((l: any) => l.employeeId === emp.id && l.totalMinutes);
      const hours = empLogs.reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);
      const cost = empLogs.reduce((s: number, l: any) => s + getSessionLaborCost(l), 0);
      return { emp, hours, cost, sessions: empLogs.length };
    })
    .filter((x: any) => x.hours > 0);

  // Per-category expense breakdown
  const expByCategory: Record<string, number> = {};
  for (const exp of projectExpenses) {
    expByCategory[exp.category] = (expByCategory[exp.category] ?? 0) + exp.amount;
  }

  return (
    <View style={styles.tabContent}>
      {/* ── Main financial summary card ── */}
      <View style={[styles.finCard, { backgroundColor: colors.accent }]}>
        <Text style={styles.finCardTitle}>Financial Summary</Text>

        <View style={styles.finCardRow}>
          <View style={styles.finCardCell}>
            <Text style={styles.finCardLabel}>Contract Value</Text>
            <Text style={styles.finCardValue}>${project.totalValue.toLocaleString()}</Text>
          </View>
          <View style={[styles.finCardDivider]} />
          <View style={styles.finCardCell}>
            <Text style={styles.finCardLabel}>Total Costs</Text>
            <Text style={[styles.finCardValue, { color: "#f87171" }]}>${totalCost.toFixed(0)}</Text>
          </View>
        </View>

        <View style={[styles.finCardSeparator, { backgroundColor: "rgba(255,255,255,0.12)" }]} />

        <View style={styles.finCardRow}>
          <View style={styles.finCardCell}>
            <Text style={styles.finCardLabel}>Est. Profit</Text>
            <Text style={[styles.finCardLargeValue, { color: isProfit ? "#4ade80" : "#f87171" }]}>
              {isProfit ? "+" : ""}${profit.toFixed(0)}
            </Text>
          </View>
          <View style={[styles.finCardDivider]} />
          <View style={styles.finCardCell}>
            <Text style={styles.finCardLabel}>Margin</Text>
            <Text style={[styles.finCardLargeValue, { color: marginColor }]}>
              {margin.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={[styles.finCardSeparator, { backgroundColor: "rgba(255,255,255,0.12)" }]} />

        {/* Remaining balance */}
        <View style={styles.remainingRow}>
          <View style={styles.remainingLeft}>
            <Feather name="trending-up" size={14} color={remaining >= 0 ? "#4ade80" : "#f87171"} />
            <Text style={styles.remainingLabel}>Remaining Balance</Text>
          </View>
          <Text style={[styles.remainingValue, { color: remaining >= 0 ? "#4ade80" : "#f87171" }]}>
            {remaining >= 0 ? "+" : ""}${remaining.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* ── Budget utilization bars ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Budget Utilization</Text>
        <FinBar label="Labor" amount={labor} total={project.totalValue} color={colors.destructive} />
        <FinBar label="Expenses" amount={otherExp} total={project.totalValue} color={colors.warning} />
        <FinBar
          label="Remaining"
          amount={Math.max(0, remaining)}
          total={project.totalValue}
          color={colors.success}
        />
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total spent</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>
            ${totalCost.toFixed(0)} of ${project.totalValue.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ── Labor cost breakdown ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Labor Cost</Text>
          <Text style={[styles.sectionBadge, { backgroundColor: colors.destructive + "20", color: colors.destructive }]}>
            ${labor.toFixed(0)} total
          </Text>
        </View>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
          Automatically calculated from clocked hours
        </Text>
        {laborByEmployee.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            No hours logged yet
          </Text>
        ) : (
          laborByEmployee.map(({ emp, hours, cost, sessions }: any) => (
            <View key={emp.id} style={[styles.laborRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.laborAvatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.laborInitials}>
                  {emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View style={styles.laborInfo}>
                <Text style={[styles.laborName, { color: colors.foreground }]}>{emp.name}</Text>
                <Text style={[styles.laborMeta, { color: colors.mutedForeground }]}>
                  {hours.toFixed(1)}h · {sessions} session{sessions !== 1 ? "s" : ""} · ${emp.hourlyRate}/hr
                </Text>
              </View>
              <Text style={[styles.laborCost, { color: colors.destructive }]}>
                ${cost.toFixed(0)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Expenses breakdown by category ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Other Expenses</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={[styles.sectionBadge, { backgroundColor: colors.warning + "20", color: colors.warning }]}>
              ${otherExp.toFixed(0)} total
            </Text>
            <TouchableOpacity
              style={[styles.addExpSmall, { backgroundColor: colors.primary }]}
              onPress={onAddExpense}
            >
              <Feather name="plus" size={12} color="#fff" />
              <Text style={styles.addExpSmallText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Object.keys(expByCategory).length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            No expenses recorded yet
          </Text>
        ) : (
          EXPENSE_CATEGORIES.filter(({ key }) => expByCategory[key]).map(({ key, icon }) => (
            <View key={key} style={[styles.catRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.catIcon, { backgroundColor: CATEGORY_COLORS[key] + "20" }]}>
                <Feather name={icon as any} size={14} color={CATEGORY_COLORS[key]} />
              </View>
              <Text style={[styles.catLabel2, { color: colors.foreground }]}>{key}</Text>
              <View style={styles.catBarWrap}>
                <View style={[styles.catBarBg, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.catBarFill,
                      {
                        width: `${Math.min(100, (expByCategory[key] / (otherExp || 1)) * 100)}%` as any,
                        backgroundColor: CATEGORY_COLORS[key],
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.catAmount, { color: colors.foreground }]}>
                ${expByCategory[key].toFixed(0)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function FinBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, amount / total) : 0;
  return (
    <View style={styles.finBarWrap}>
      <View style={styles.finBarTop}>
        <Text style={[styles.finBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.finBarAmt, { color: colors.foreground }]}>
          ${amount.toFixed(0)}{" "}
          <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>
            ({(pct * 100).toFixed(0)}%)
          </Text>
        </Text>
      </View>
      <View style={[styles.progBar, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progFill,
            { width: `${Math.max(0, pct * 100)}%` as any, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

/* ──────────────────────────── TIME LOG TAB ──────────────────────────── */

function TimeLogTab({ logs, employees, getSessionLaborCost, isAdmin }: any) {
  const colors = useColors();
  const sorted = [...logs].sort(
    (a: any, b: any) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
  );
  const completedLogs = logs.filter((l: any) => l.totalMinutes);
  const totalHours = completedLogs.reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);
  const totalLaborCost = completedLogs.reduce((s: number, l: any) => s + getSessionLaborCost(l), 0);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <View style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tlSummary}>
          <View style={styles.tlStat}>
            <Text style={[styles.tlStatValue, { color: colors.primary }]}>{totalHours.toFixed(1)}h</Text>
            <Text style={[styles.tlStatLabel, { color: colors.mutedForeground }]}>Total Hours</Text>
          </View>
          <View style={[styles.tlStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.tlStat}>
            <Text style={[styles.tlStatValue, { color: colors.destructive }]}>${totalLaborCost.toFixed(0)}</Text>
            <Text style={[styles.tlStatLabel, { color: colors.mutedForeground }]}>Labor Cost</Text>
          </View>
          <View style={[styles.tlStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.tlStat}>
            <Text style={[styles.tlStatValue, { color: colors.foreground }]}>{sorted.length}</Text>
            <Text style={[styles.tlStatLabel, { color: colors.mutedForeground }]}>Sessions</Text>
          </View>
        </View>
      </View>

      {sorted.length === 0 ? (
        <Text style={[styles.emptyHint, { color: colors.mutedForeground, textAlign: "center", padding: 24 }]}>
          No time logs for this project
        </Text>
      ) : null}

      {sorted.map((log: any) => {
        const emp = employees.find((e: any) => e.id === log.employeeId);
        const hours = log.totalMinutes ? (log.totalMinutes / 60) : null;
        const cost = getSessionLaborCost(log);
        const isActive = !log.clockOut;

        return (
          <View
            key={log.id}
            style={[
              styles.logCard,
              {
                backgroundColor: colors.card,
                borderColor: isActive ? colors.primary + "60" : colors.border,
                borderLeftWidth: isActive ? 3 : 1,
                borderLeftColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={styles.logCardTop}>
              <View style={styles.logEmpRow}>
                <View style={[styles.logAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.logAvatarText}>
                    {emp?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.logName, { color: colors.foreground }]}>
                    {emp?.name ?? "Unknown"}
                  </Text>
                  <Text style={[styles.logDate, { color: colors.mutedForeground }]}>
                    {fmtDate(log.clockIn)}
                  </Text>
                </View>
              </View>
              {isActive ? (
                <View style={[styles.activeChip, { backgroundColor: colors.primary + "20" }]}>
                  <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.activeText, { color: colors.primary }]}>Active</Text>
                </View>
              ) : hours ? (
                <View style={styles.logRight}>
                  <Text style={[styles.logHours, { color: colors.foreground }]}>
                    {hours.toFixed(2)}h
                  </Text>
                  {isAdmin ? (
                    <Text style={[styles.logCost, { color: colors.destructive }]}>
                      ${cost.toFixed(0)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={styles.logTimes}>
              <View style={styles.logTimeChip}>
                <Feather name="log-in" size={11} color={colors.success} />
                <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
                  {fmtTime(log.clockIn)}
                </Text>
              </View>
              {log.clockOut ? (
                <>
                  <Text style={{ color: colors.border }}>→</Text>
                  <View style={styles.logTimeChip}>
                    <Feather name="log-out" size={11} color={colors.destructive} />
                    <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
                      {fmtTime(log.clockOut)}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
            {log.notes ? (
              <Text style={[styles.logNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
                "{log.notes}"
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* ──────────────────────────── EXPENSES TAB ──────────────────────────── */

function ExpensesTab({ expenses, labor, onAdd, onDelete }: any) {
  const colors = useColors();
  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  const expByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    expByCategory[exp.category] = (expByCategory[exp.category] ?? 0) + exp.amount;
  }

  return (
    <View style={styles.tabContent}>
      {/* Totals summary */}
      <View style={[styles.expSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.expSummaryRow}>
          <View style={styles.expSummaryCell}>
            <Text style={[styles.expSummaryLabel, { color: colors.mutedForeground }]}>Labor (auto)</Text>
            <Text style={[styles.expSummaryValue, { color: colors.destructive }]}>${labor.toFixed(0)}</Text>
          </View>
          <View style={[styles.expSummaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.expSummaryCell}>
            <Text style={[styles.expSummaryLabel, { color: colors.mutedForeground }]}>Other Expenses</Text>
            <Text style={[styles.expSummaryValue, { color: colors.warning }]}>${total.toFixed(0)}</Text>
          </View>
          <View style={[styles.expSummaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.expSummaryCell}>
            <Text style={[styles.expSummaryLabel, { color: colors.mutedForeground }]}>Grand Total</Text>
            <Text style={[styles.expSummaryValue, { color: colors.foreground }]}>${(labor + total).toFixed(0)}</Text>
          </View>
        </View>
      </View>

      {/* Category chips */}
      {Object.keys(expByCategory).length > 0 ? (
        <View style={styles.catChipsRow}>
          {EXPENSE_CATEGORIES.filter(({ key }) => expByCategory[key]).map(({ key }) => (
            <View key={key} style={[styles.catSummaryChip, { borderColor: CATEGORY_COLORS[key] + "40", backgroundColor: CATEGORY_COLORS[key] + "15" }]}>
              <Text style={[styles.catSummaryText, { color: CATEGORY_COLORS[key] }]}>
                {key}: ${expByCategory[key].toFixed(0)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Add expense button */}
      <TouchableOpacity
        style={[styles.addExpBtn, { backgroundColor: colors.primary }]}
        onPress={onAdd}
      >
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.addExpBtnText}>Add Expense</Text>
      </TouchableOpacity>

      {expenses.length === 0 ? (
        <Text style={[styles.emptyHint, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 24 }]}>
          No expenses recorded yet
        </Text>
      ) : null}

      {expenses.map((exp: Expense) => {
        const catColor = CATEGORY_COLORS[exp.category as ExpenseCategoryKey] ?? "#94a3b8";
        const catIcon = EXPENSE_CATEGORIES.find((c) => c.key === exp.category)?.icon ?? "more-horizontal";
        return (
          <View key={exp.id} style={[styles.expCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.expCatIcon, { backgroundColor: catColor + "20" }]}>
              <Feather name={catIcon as any} size={16} color={catColor} />
            </View>
            <View style={styles.expInfo}>
              <View style={styles.expInfoTop}>
                <View style={[styles.catTag, { backgroundColor: catColor + "20" }]}>
                  <Text style={{ color: catColor, fontSize: 10, fontWeight: "700" }}>
                    {exp.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.expDate, { color: colors.mutedForeground }]}>
                  {new Date(exp.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.expDesc, { color: colors.foreground }]}>{exp.description}</Text>
              <Text style={[styles.expAmount, { color: colors.warning }]}>${exp.amount.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.expDelete} onPress={() => onDelete(exp.id)}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

/* ──────────────────────────── ADD EXPENSE MODAL ──────────────────────────── */

function AddExpenseModal({ onClose, onSave }: any) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    category: "Materials" as ExpenseCategoryKey,
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.description.trim()) { setError("Description is required"); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError("Valid amount is required"); return; }
    setSaving(true);
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) });
    } finally {
      setSaving(false);
    }
  }

  const selectedColor = CATEGORY_COLORS[form.category];

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Expense</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {/* Category selector */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map(({ key, icon }) => {
              const catColor = CATEGORY_COLORS[key];
              const isSelected = form.category === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.catGridItem,
                    {
                      backgroundColor: isSelected ? catColor : colors.muted,
                      borderColor: isSelected ? catColor : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => set("category", key)}
                >
                  <Feather name={icon as any} size={20} color={isSelected ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.catGridLabel, { color: isSelected ? "#fff" : colors.mutedForeground }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected indicator */}
          <View style={[styles.selectedCatBar, { backgroundColor: selectedColor + "18", borderColor: selectedColor + "40" }]}>
            <Feather name={EXPENSE_CATEGORIES.find((c) => c.key === form.category)!.icon as any} size={14} color={selectedColor} />
            <Text style={[styles.selectedCatText, { color: selectedColor }]}>
              {form.category} selected
            </Text>
          </View>

          <InputField
            label="Description *"
            value={form.description}
            onChangeText={(t: string) => set("description", t)}
            placeholder="e.g. 20 gallons of primer"
          />
          <InputField
            label="Amount ($) *"
            value={form.amount}
            onChangeText={(t: string) => set("amount", t)}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <InputField
            label="Date"
            value={form.date}
            onChangeText={(t: string) => set("date", t)}
            placeholder="YYYY-MM-DD"
          />
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          <PrimaryButton label={saving ? "Adding..." : "Add Expense"} onPress={handleSave} loading={saving} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ──────────────────────────── STYLES ──────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center", marginHorizontal: 10 },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  projectHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  changeStatus: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 100 },
  changeStatusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headerFinancials: { alignItems: "flex-end" },
  headerFinValue: { color: "#fff", fontSize: 15, fontWeight: "800" },
  headerFinProfit: { fontSize: 11, fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "600" },
  content: { padding: 16, gap: 14 },
  tabContent: { gap: 14 },

  // Finances tab
  finCard: { borderRadius: 16, padding: 20, gap: 0 },
  finCardTitle: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  finCardRow: { flexDirection: "row" },
  finCardCell: { flex: 1, alignItems: "center", gap: 4 },
  finCardDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 2 },
  finCardLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "500" },
  finCardValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  finCardLargeValue: { fontSize: 24, fontWeight: "800" },
  finCardSeparator: { height: 1, marginVertical: 14 },
  remainingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  remainingLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  remainingLabel: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "500" },
  remainingValue: { fontSize: 16, fontWeight: "800" },

  // Shared section
  section: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, fontSize: 12, fontWeight: "700" },
  sectionHint: { fontSize: 12, marginTop: -4 },
  emptyHint: { fontSize: 13 },

  // Budget bars
  finBarWrap: { gap: 5 },
  finBarTop: { flexDirection: "row", justifyContent: "space-between" },
  finBarLabel: { fontSize: 13 },
  finBarAmt: { fontSize: 13, fontWeight: "600" },
  progBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, marginTop: 4 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13, fontWeight: "700" },

  // Labor breakdown
  laborRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10, borderBottomWidth: 1 },
  laborAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  laborInitials: { color: "#fff", fontWeight: "700", fontSize: 13 },
  laborInfo: { flex: 1 },
  laborName: { fontSize: 14, fontWeight: "600" },
  laborMeta: { fontSize: 12, marginTop: 1 },
  laborCost: { fontSize: 15, fontWeight: "800" },

  // Category rows (finances)
  catRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 8, borderBottomWidth: 1 },
  catIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catLabel2: { fontSize: 13, fontWeight: "600", width: 80 },
  catBarWrap: { flex: 1 },
  catBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 3 },
  catAmount: { fontSize: 13, fontWeight: "700", width: 60, textAlign: "right" },
  addExpSmall: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  addExpSmallText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Time log tab
  tlSummary: { flexDirection: "row" },
  tlStat: { flex: 1, alignItems: "center", gap: 2 },
  tlStatDivider: { width: 1, marginVertical: 4 },
  tlStatValue: { fontSize: 20, fontWeight: "800" },
  tlStatLabel: { fontSize: 11, fontWeight: "500" },
  logCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  logCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logEmpRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  logAvatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  logName: { fontSize: 14, fontWeight: "700" },
  logDate: { fontSize: 11, marginTop: 1 },
  logRight: { alignItems: "flex-end" },
  logHours: { fontSize: 15, fontWeight: "700" },
  logCost: { fontSize: 12, fontWeight: "600" },
  activeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "700" },
  logTimes: { flexDirection: "row", alignItems: "center", gap: 8 },
  logTimeChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  logTime: { fontSize: 12 },
  logNotes: { fontSize: 12, fontStyle: "italic" },

  // Expenses tab
  expSummaryCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  expSummaryRow: { flexDirection: "row" },
  expSummaryCell: { flex: 1, alignItems: "center", gap: 2 },
  expSummaryDivider: { width: 1, marginVertical: 4 },
  expSummaryLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  expSummaryValue: { fontSize: 20, fontWeight: "800" },
  catChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catSummaryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  catSummaryText: { fontSize: 12, fontWeight: "700" },
  addExpBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12 },
  addExpBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  expCard: { flexDirection: "row", borderRadius: 12, padding: 14, borderWidth: 1, gap: 12, alignItems: "flex-start" },
  expCatIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  expInfo: { flex: 1, gap: 4 },
  expInfoTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  catTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  expDate: { fontSize: 11 },
  expDesc: { fontSize: 14, fontWeight: "600" },
  expAmount: { fontSize: 16, fontWeight: "800" },
  expDelete: { paddingTop: 2 },

  // Add expense modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 20, gap: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: -8 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catGridItem: { width: "30%", alignItems: "center", padding: 14, borderRadius: 12, gap: 6, flexGrow: 1 },
  catGridLabel: { fontSize: 12, fontWeight: "600" },
  selectedCatBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  selectedCatText: { fontSize: 13, fontWeight: "600" },
  errorText: { fontSize: 13 },

  // Info tab
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", marginTop: 1 },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  colorText: { fontSize: 14 },
  empRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  empAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  empInitials: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empName: { fontSize: 14, fontWeight: "600" },
  empPos: { fontSize: 12, marginTop: 1 },
  notesText: { fontSize: 14, lineHeight: 20 },
  statusOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
});
