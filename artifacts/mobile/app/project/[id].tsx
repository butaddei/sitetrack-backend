import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
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

import { InputField } from "@/components/InputField";
import { MetricCard } from "@/components/MetricCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Expense, ProjectStatus, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: ProjectStatus[] = ["pending", "in_progress", "completed", "on_hold"];
const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

const EXPENSE_CATEGORIES = ["Materials", "Equipment", "Transport", "Labor", "Other"];

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
  const margin = project.totalValue > 0 ? ((profit / project.totalValue) * 100).toFixed(1) : "0";
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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

      <View style={[styles.projectHeader, { backgroundColor: colors.accent }]}>
        <StatusBadge status={project.status} />
        {isAdmin ? (
          <TouchableOpacity
            style={styles.changeStatus}
            onPress={() => setShowStatusPicker(true)}
          >
            <Text style={styles.changeStatusText}>Change</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(
          isAdmin
            ? (["info", "finances", "timelog", "expenses"] as const)
            : (["info", "timelog"] as const)
        ).map((t) => (
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
              {t === "info"
                ? "Details"
                : t === "finances"
                ? "Finances"
                : t === "timelog"
                ? "Time Log"
                : "Expenses"}
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
          />
        )}
        {activeTab === "timelog" && (
          <TimeLogTab logs={projectLogs} employees={employees} />
        )}
        {activeTab === "expenses" && isAdmin && (
          <ExpensesTab
            expenses={projectExpenses}
            onAdd={() => setShowAddExpense(true)}
            onDelete={deleteExpense}
          />
        )}
      </ScrollView>

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
        <InfoRow icon="dollar-sign" label="Total Value" value={`$${project.totalValue.toLocaleString()}`} />
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

function FinancesTab({ project, labor, otherExp, totalCost, profit, margin, remaining }: any) {
  const colors = useColors();
  return (
    <View style={styles.tabContent}>
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <MetricCard label="Contract Value" value={`$${project.totalValue.toLocaleString()}`} color={colors.foreground} />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard label="Labor Cost" value={`$${labor.toFixed(0)}`} color={colors.destructive} />
          <MetricCard label="Other Costs" value={`$${otherExp.toFixed(0)}`} color={colors.warning} />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Est. Profit"
            value={`$${profit.toFixed(0)}`}
            color={profit >= 0 ? colors.success : colors.destructive}
          />
          <MetricCard label="Margin" value={`${margin}%`} color={parseFloat(margin) >= 30 ? colors.success : colors.warning} />
        </View>
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Budget Breakdown</Text>
        <BudgetBar label="Labor" amount={labor} total={project.totalValue} color={colors.destructive} />
        <BudgetBar label="Expenses" amount={otherExp} total={project.totalValue} color={colors.warning} />
        <BudgetBar label="Remaining" amount={Math.max(0, remaining)} total={project.totalValue} color={colors.success} />
      </View>
    </View>
  );
}

function BudgetBar({ label, amount, total, color }: any) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, amount / total) : 0;
  return (
    <View style={{ gap: 4, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
          ${amount.toFixed(0)} ({(pct * 100).toFixed(0)}%)
        </Text>
      </View>
      <View style={[styles.progBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.progFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TimeLogTab({ logs, employees }: any) {
  const colors = useColors();
  const sorted = [...logs].sort((a: any, b: any) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  const totalHours = logs.filter((l: any) => l.totalMinutes).reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);

  return (
    <View style={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Total Hours</Text>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{totalHours.toFixed(1)}h</Text>
        </View>
      </View>
      {sorted.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 24 }}>
          No time logs for this project
        </Text>
      ) : null}
      {sorted.map((log: any) => {
        const emp = employees.find((e: any) => e.id === log.employeeId);
        const hours = log.totalMinutes ? (log.totalMinutes / 60).toFixed(2) : null;
        const isActive = !log.clockOut;
        return (
          <View
            key={log.id}
            style={[
              styles.logCard,
              {
                backgroundColor: colors.card,
                borderColor: isActive ? colors.primary : colors.border,
                borderLeftWidth: isActive ? 3 : 1,
                borderLeftColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }}>
                {emp?.name ?? "Unknown"}
              </Text>
              {isActive ? (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Active</Text>
              ) : hours ? (
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>{hours}h</Text>
              ) : null}
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {new Date(log.clockIn).toLocaleDateString()} · {new Date(log.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {log.clockOut ? ` — ${new Date(log.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </Text>
            {log.notes ? <Text style={{ color: colors.mutedForeground, fontSize: 12, fontStyle: "italic" }}>{log.notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function ExpensesTab({ expenses, onAdd, onDelete }: any) {
  const colors = useColors();
  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <View style={styles.tabContent}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>
          Total: ${total.toFixed(0)}
        </Text>
        <TouchableOpacity
          style={[styles.addExpBtn, { backgroundColor: colors.primary }]}
          onPress={onAdd}
        >
          <Feather name="plus" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Add Expense</Text>
        </TouchableOpacity>
      </View>
      {expenses.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 24 }}>
          No expenses recorded
        </Text>
      ) : null}
      {expenses.map((exp: Expense) => (
        <View
          key={exp.id}
          style={[styles.expCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.catTag, { backgroundColor: colors.primary + "20" }]}>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                  {exp.category}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {new Date(exp.date).toLocaleDateString()}
              </Text>
            </View>
            <Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 4 }}>
              {exp.description}
            </Text>
            <Text style={{ color: colors.success, fontWeight: "700", fontSize: 16, marginTop: 2 }}>
              ${exp.amount.toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(exp.id)}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function AddExpenseModal({ onClose, onSave }: any) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    category: "Materials",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.description || !form.amount) {
      setError("Description and amount are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    } finally {
      setSaving(false);
    }
  }

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
          <Text style={[styles.catLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.catChip,
                  { backgroundColor: form.category === c ? colors.primary : colors.muted },
                ]}
                onPress={() => set("category", c)}
              >
                <Text style={{ color: form.category === c ? "#fff" : colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <InputField label="Description *" value={form.description} onChangeText={(t) => set("description", t)} placeholder="e.g. 20 gallons of primer" />
          <InputField label="Amount ($) *" value={form.amount} onChangeText={(t) => set("amount", t)} keyboardType="numeric" placeholder="500" />
          <InputField label="Date" value={form.date} onChangeText={(t) => set("date", t)} placeholder="YYYY-MM-DD" />
          {error ? <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text> : null}
          <PrimaryButton label="Add Expense" onPress={handleSave} loading={saving} />
        </ScrollView>
      </View>
    </Modal>
  );
}

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
  projectHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  changeStatus: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 100 },
  changeStatusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "600" },
  content: { padding: 16 },
  tabContent: { gap: 12 },
  section: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", marginTop: 1 },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  colorText: { fontSize: 14 },
  empRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  empAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  empInitials: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empName: { fontSize: 14, fontWeight: "600" },
  empPos: { fontSize: 12, marginTop: 1 },
  notesText: { fontSize: 14, lineHeight: 20 },
  metricsGrid: { gap: 10 },
  metricsRow: { flexDirection: "row", gap: 10 },
  progBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  logCard: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 6 },
  addExpBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  expCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, gap: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 20, gap: 14 },
  statusOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  catLabel: { fontSize: 13, fontWeight: "600" },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
});
