import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Expense, ProjectStatus, useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: ProjectStatus[] = ["pending", "in_progress", "completed", "on_hold"];
const EXPENSE_CATEGORIES = ["Materials", "Equipment", "Transport", "Labor", "Other"];
const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isHexColor(s: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function SectionCard({
  title,
  rightNode,
  children,
}: {
  title: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[sc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={sc.header}>
        <Text style={[sc.title, { color: colors.foreground }]}>{title}</Text>
        {rightNode}
      </View>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={sc.infoRow}>
      <View style={[sc.infoIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={13} color={colors.mutedForeground} />
      </View>
      <View style={sc.infoText}>
        <Text style={[sc.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[sc.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[sc.divider, { backgroundColor: colors.border }]} />;
}

const sc = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2, textTransform: "uppercase" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "600" },
  infoValue: { fontSize: 14, fontWeight: "600", marginTop: 1 },
  divider: { height: 1, marginVertical: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
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
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showCrewEdit, setShowCrewEdit] = useState(false);
  const [editingCrewIds, setEditingCrewIds] = useState<string[]>([]);
  const [savingCrew, setSavingCrew] = useState(false);

  if (!project) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="inbox" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 17, marginTop: 8 }}>
          Project not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600", marginTop: 4 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = user?.role === "admin";
  const labor = getProjectLaborCost(project.id);
  const otherExp = getProjectExpenses(project.id);
  const totalCost = labor + otherExp;
  const contractVal = project.totalValue ?? 0;
  const profit = contractVal - totalCost;
  const margin = contractVal > 0 ? ((profit / contractVal) * 100).toFixed(1) : "0";
  const isProfitable = profit >= 0;

  const projectLogs = timeLogs.filter((l) => l.projectId === project.id);
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const assignedEmployees = employees.filter((e) => project.assignedEmployeeIds.includes(e.id));
  const totalLogHours = projectLogs
    .filter((l) => l.totalMinutes)
    .reduce((s, l) => s + l.totalMinutes! / 60, 0);
  const sortedLogs = [...projectLogs].sort(
    (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
  );
  const expenseTotal = projectExpenses.reduce((s, e) => s + e.amount, 0);

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
            setDeleting(true);
            try {
              await deleteProject(project.id);
              router.back();
            } catch {
              setDeleting(false);
              showToast("error", "Failed to delete project");
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await updateProject(project.id, { status });
      setShowStatusPicker(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("success", "Status updated");
    } catch {
      showToast("error", "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {project.name}
        </Text>
        {isAdmin ? (
          <TouchableOpacity onPress={handleDelete} disabled={deleting} hitSlop={10}>
            {deleting ? (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
            ) : (
              <Feather name="trash-2" size={20} color="rgba(255,255,255,0.65)" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      {/* ─── Status strip ────────────────────────────────────────────────── */}
      <View style={[styles.statusStrip, { backgroundColor: colors.accent }]}>
        <StatusBadge status={project.status} />
        {isAdmin ? (
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setShowStatusPicker(true)}
          >
            <Text style={styles.changeBtnText}>Change Status</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ─── Scrollable content ───────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Project Info ── */}
        <SectionCard title="Project Info">
          <InfoRow icon="map-pin" label="Address" value={project.address} />
          {project.address ? <Divider /> : null}
          <InfoRow
            icon="calendar"
            label="Start Date"
            value={fmtDate(project.startDate)}
          />
          {project.startDate ? <Divider /> : null}
          <InfoRow
            icon="flag"
            label="Due Date"
            value={project.expectedEndDate ? fmtDate(project.expectedEndDate) : "Not set"}
          />
        </SectionCard>

        {/* ── Client (admin only) ── */}
        {isAdmin && project.clientName ? (
          <SectionCard title="Client">
            <InfoRow icon="user" label="Name" value={project.clientName} />
            {project.clientPhone ? <Divider /> : null}
            <InfoRow icon="phone" label="Phone" value={project.clientPhone} />
            {project.clientEmail ? <Divider /> : null}
            <InfoRow icon="mail" label="Email" value={project.clientEmail} />
          </SectionCard>
        ) : null}

        {/* ── Finances (admin only) ── */}
        {isAdmin ? (
          <View style={[sc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={sc.header}>
              <Text style={[sc.title, { color: colors.foreground }]}>Finances</Text>
            </View>

            {/* Contract value */}
            <View style={[styles.contractRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.contractLabel, { color: colors.mutedForeground }]}>Contract Value</Text>
              <Text style={[styles.contractVal, { color: colors.foreground }]}>
                {fmt(contractVal)}
              </Text>
            </View>

            {/* Labor + Expenses side by side */}
            <View style={styles.costRow}>
              <View style={[styles.costBox, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Labor</Text>
                <Text style={[styles.costVal, { color: colors.destructive }]}>{fmt(labor)}</Text>
              </View>
              <View style={[styles.costBox, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Expenses</Text>
                <Text style={[styles.costVal, { color: colors.warning }]}>{fmt(otherExp)}</Text>
              </View>
            </View>

            {/* Profit hero gradient */}
            <LinearGradient
              colors={
                isProfitable
                  ? ["#166534", "#15803d"]
                  : ["#991b1b", "#b91c1c"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profitCard}
            >
              <View>
                <Text style={styles.profitLabel}>Estimated Profit</Text>
                <Text style={styles.profitVal}>
                  {isProfitable ? "+" : ""}{fmt(profit)}
                </Text>
              </View>
              <View style={styles.marginPill}>
                <Text style={styles.marginText}>{margin}% margin</Text>
              </View>
            </LinearGradient>

            {/* Budget bars */}
            <View style={{ gap: 8 }}>
              <BudgetBar label="Labor" amount={labor} total={contractVal} color={colors.destructive} />
              <BudgetBar label="Expenses" amount={otherExp} total={contractVal} color={colors.warning} />
              <BudgetBar
                label="Remaining"
                amount={Math.max(0, contractVal - totalCost)}
                total={contractVal}
                color={colors.success}
              />
            </View>
          </View>
        ) : null}

        {/* ── Crew ── */}
        <SectionCard
          title={assignedEmployees.length > 0 ? `Equipa · ${assignedEmployees.length}` : "Equipa"}
          rightNode={
            isAdmin ? (
              <TouchableOpacity
                onPress={() => {
                  setEditingCrewIds(project.assignedEmployeeIds ?? []);
                  setShowCrewEdit(true);
                }}
                style={[styles.editCrewBtn, { backgroundColor: colors.primary + "18" }]}
              >
                <Feather name="user-plus" size={13} color={colors.primary} />
                <Text style={[styles.editCrewBtnText, { color: colors.primary }]}>Editar</Text>
              </TouchableOpacity>
            ) : undefined
          }
        >
          {assignedEmployees.length === 0 ? (
            <Text style={[styles.crewSub, { color: colors.mutedForeground }]}>
              Nenhum funcionário atribuído ainda.
            </Text>
          ) : null}
          {assignedEmployees.map((emp, i) => {
            const initials = emp.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <View key={emp.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.crewRow}>
                  <View style={[styles.crewAvatar, { backgroundColor: colors.accent }]}>
                    <Text style={styles.crewInitials}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.crewName, { color: colors.foreground }]}>{emp.name}</Text>
                    <Text style={[styles.crewSub, { color: colors.mutedForeground }]}>
                      {emp.position ?? "Employee"}
                      {isAdmin ? ` · $${emp.hourlyRate}/hr` : ""}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </SectionCard>

        {/* ── Paint Colors ── */}
        {project.paintColors.length > 0 ? (
          <SectionCard title="Paint Colors">
            <View style={styles.colorGrid}>
              {project.paintColors.map((c, i) => (
                <View
                  key={i}
                  style={[
                    styles.colorChip,
                    { backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: isHexColor(c) ? c : colors.primary },
                    ]}
                  />
                  <Text style={[styles.colorName, { color: colors.foreground }]} numberOfLines={1}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        {/* ── Photos ── */}
        {project.photos.length > 0 ? (
          <SectionCard title={`Photos · ${project.photos.length}`}>
            <View style={styles.photoGrid}>
              {project.photos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.photoThumb, { borderColor: colors.border }]}
                  onPress={() => setLightboxPhoto(uri)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri }}
                    style={styles.photoImg}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>
        ) : null}

        {/* ── Notes ── */}
        {project.notes ? (
          <SectionCard title="Notes">
            <Text style={[styles.notesText, { color: colors.foreground }]}>{project.notes}</Text>
          </SectionCard>
        ) : null}

        {/* ── Time Log ── */}
        <SectionCard
          title="Time Log"
          rightNode={
            <View style={[styles.hoursTag, { backgroundColor: colors.primary + "16", borderColor: colors.primary + "30" }]}>
              <Text style={[styles.hoursTagText, { color: colors.primary }]}>
                {totalLogHours.toFixed(1)}h total
              </Text>
            </View>
          }
        >
          {sortedLogs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No time logged yet
            </Text>
          ) : (
            sortedLogs.map((log, i) => {
              const emp = employees.find((e) => e.id === log.employeeId);
              const hours = log.totalMinutes ? (log.totalMinutes / 60).toFixed(2) : null;
              const isActive = !log.clockOut;
              return (
                <View key={log.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={styles.logRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.logTop}>
                        <Text style={[styles.logName, { color: colors.foreground }]}>
                          {emp?.name ?? "Unknown"}
                        </Text>
                        {isActive ? (
                          <View style={[styles.activePill, { backgroundColor: colors.success + "18", borderColor: colors.success + "35" }]}>
                            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                            <Text style={[styles.activeText, { color: colors.success }]}>Active</Text>
                          </View>
                        ) : hours ? (
                          <Text style={[styles.logHours, { color: colors.foreground }]}>{hours}h</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
                        {new Date(log.clockIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" · "}
                        {new Date(log.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {log.clockOut
                          ? ` — ${new Date(log.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </Text>
                      {log.notes ? (
                        <Text style={[styles.logNote, { color: colors.mutedForeground }]}>
                          "{log.notes}"
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>

        {/* ── Expenses (admin only) ── */}
        {isAdmin ? (
          <SectionCard
            title="Expenses"
            rightNode={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {projectExpenses.length > 0 ? (
                  <Text style={[styles.expTotal, { color: colors.mutedForeground }]}>
                    {fmt(expenseTotal)}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddExpense(true)}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            }
          >
            {projectExpenses.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No expenses recorded
              </Text>
            ) : (
              projectExpenses.map((exp, i) => (
                <View key={exp.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={styles.expRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={[styles.catTag, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.catText, { color: colors.primary }]}>{exp.category}</Text>
                        </View>
                        <Text style={[styles.expDate, { color: colors.mutedForeground }]}>
                          {new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                      <Text style={[styles.expDesc, { color: colors.foreground }]}>{exp.description}</Text>
                      <Text style={[styles.expAmount, { color: colors.success }]}>{fmt(exp.amount)}</Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => {
                        Alert.alert("Delete Expense", "Remove this expense?", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await deleteExpense(exp.id);
                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                showToast("success", "Expense removed");
                              } catch {
                                showToast("error", "Failed to delete expense");
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        ) : null}
      </ScrollView>

      {/* ─── Crew edit modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showCrewEdit}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCrewEdit(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCrewEdit(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar Equipa</Text>
            <TouchableOpacity
              onPress={async () => {
                setSavingCrew(true);
                try {
                  await updateProject(project.id, { assignedEmployeeIds: editingCrewIds });
                  setShowCrewEdit(false);
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  showToast("success", "Equipa actualizada");
                } catch {
                  showToast("error", "Erro ao actualizar equipa");
                } finally {
                  setSavingCrew(false);
                }
              }}
              disabled={savingCrew}
              hitSlop={10}
            >
              {savingCrew ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
            {employees.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 24 }}>
                Sem funcionários nesta empresa.
              </Text>
            ) : null}
            {employees.map((emp) => {
              const selected = editingCrewIds.includes(emp.id);
              const initials = emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.crewPickerRow,
                    {
                      backgroundColor: selected ? colors.primary + "12" : colors.card,
                      borderColor: selected ? colors.primary + "40" : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setEditingCrewIds((prev) =>
                      prev.includes(emp.id) ? prev.filter((x) => x !== emp.id) : [...prev, emp.id]
                    );
                    Haptics.selectionAsync();
                  }}
                >
                  <View style={[styles.crewAvatar, { backgroundColor: selected ? colors.primary : colors.accent }]}>
                    <Text style={styles.crewInitials}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.crewName, { color: colors.foreground }]}>{emp.name}</Text>
                    <Text style={[styles.crewSub, { color: colors.mutedForeground }]}>
                      {emp.position ?? "Employee"} · ${emp.hourlyRate}/hr
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.crewCheck,
                      {
                        backgroundColor: selected ? colors.primary : "transparent",
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {selected ? <Feather name="check" size={12} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Status picker modal ──────────────────────────────────────────── */}
      <Modal
        visible={showStatusPicker}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowStatusPicker(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Change Status</Text>
            <View style={{ width: 22 }} />
          </View>
          {updatingStatus ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Updating…</Text>
            </View>
          ) : (
            STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusOption,
                  {
                    backgroundColor: project.status === s ? colors.primary + "12" : colors.card,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => handleStatusChange(s)}
              >
                <StatusBadge status={s} />
                {project.status === s ? (
                  <Feather name="check" size={18} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modal>

      {/* ─── Add expense modal ────────────────────────────────────────────── */}
      {showAddExpense ? (
        <AddExpenseModal
          onClose={() => setShowAddExpense(false)}
          onSave={async (data) => {
            await addExpense({ ...data, projectId: project.id, createdBy: user?.id ?? "" });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("success", "Expense added");
            setShowAddExpense(false);
          }}
        />
      ) : null}

      {/* ─── Photo lightbox ───────────────────────────────────────────────── */}
      <Modal
        visible={!!lightboxPhoto}
        animationType="fade"
        transparent
        onRequestClose={() => setLightboxPhoto(null)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightboxPhoto(null)}
          >
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          {lightboxPhoto ? (
            <Image
              source={{ uri: lightboxPhoto }}
              style={styles.lightboxImg}
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ─── Budget bar ───────────────────────────────────────────────────────────────
function BudgetBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, amount / total) : 0;
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
          ${amount.toFixed(0)} · {(pct * 100).toFixed(0)}%
        </Text>
      </View>
      <View style={[styles.bar, { backgroundColor: colors.muted }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Add expense modal ────────────────────────────────────────────────────────
function AddExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => Promise<void> }) {
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
    setError("");
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    } catch (err: any) {
      setError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet">
      <KeyboardAvoidingView
        style={[styles.modal, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Expense</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
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
                <Text
                  style={{
                    color: form.category === c ? "#fff" : colors.mutedForeground,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <InputField
            label="Description *"
            value={form.description}
            onChangeText={(t) => set("description", t)}
            placeholder="e.g. 20 gallons of primer"
          />
          <InputField
            label="Amount ($) *"
            value={form.amount}
            onChangeText={(t) => set("amount", t)}
            keyboardType="numeric"
            placeholder="500"
          />
          <InputField
            label="Date"
            value={form.date}
            onChangeText={(t) => set("date", t)}
            placeholder="YYYY-MM-DD"
          />
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={{ color: colors.destructive, fontSize: 13, flex: 1, fontWeight: "500" }}>{error}</Text>
            </View>
          ) : null}
          <PrimaryButton label="Add Expense" onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  topBarTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },

  // Status strip
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 100,
  },
  changeBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Scroll content
  scroll: { padding: 16, gap: 12 },

  // Contract value
  contractRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  contractLabel: { fontSize: 13, fontWeight: "600" },
  contractVal: { fontSize: 20, fontWeight: "800" },

  // Cost boxes
  costRow: { flexDirection: "row", gap: 10 },
  costBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  costLabel: { fontSize: 11, fontWeight: "600" },
  costVal: { fontSize: 18, fontWeight: "800" },

  // Profit card
  profitCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profitLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  profitVal: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  marginPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  marginText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Budget bars
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  // Crew
  crewRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  crewPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  crewCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  editCrewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  editCrewBtnText: { fontSize: 12, fontWeight: "700" },
  crewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  crewInitials: { color: "#fff", fontWeight: "800", fontSize: 13 },
  crewName: { fontSize: 14, fontWeight: "700" },
  crewSub: { fontSize: 12, marginTop: 1 },

  // Paint colors
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: "48%",
  },
  colorSwatch: { width: 14, height: 14, borderRadius: 4, flexShrink: 0 },
  colorName: { fontSize: 13, fontWeight: "600", flexShrink: 1 },

  // Photos
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photoThumb: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  photoImg: { width: "100%", height: "100%" },

  // Notes
  notesText: { fontSize: 14, lineHeight: 22 },

  // Hours tag
  hoursTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  hoursTagText: { fontSize: 12, fontWeight: "700" },

  // Time log
  logRow: { flexDirection: "row", alignItems: "flex-start" },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logName: { fontSize: 14, fontWeight: "700" },
  logHours: { fontSize: 14, fontWeight: "800" },
  logTime: { fontSize: 12, marginTop: 2 },
  logNote: { fontSize: 12, fontStyle: "italic", marginTop: 3 },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 8 },

  // Expenses
  expTotal: { fontSize: 14, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  expRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: "700" },
  expDate: { fontSize: 12 },
  expDesc: { fontSize: 14, fontWeight: "600" },
  expAmount: { fontSize: 15, fontWeight: "800" },

  // Modal
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
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  catLabel: { fontSize: 13, fontWeight: "600" },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImg: {
    width: "100%",
    height: "80%",
  },
});
