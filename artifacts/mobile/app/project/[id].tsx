import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
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
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Expense, Project, ProjectStatus, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

/* ─────────────────────────── constants ─────────────────────────── */

const STATUS_OPTIONS: ProjectStatus[] = ["pending", "in_progress", "completed", "on_hold"];
const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

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

const DOC_TYPES = [
  { key: "Floor Plan", icon: "grid" },
  { key: "Blueprint", icon: "layout" },
  { key: "Contract", icon: "file-text" },
  { key: "Permit", icon: "shield" },
  { key: "Photo", icon: "image" },
  { key: "Other", icon: "paperclip" },
] as const;
type DocType = typeof DOC_TYPES[number]["key"];

interface DocEntry {
  name: string;
  type: DocType;
  uri?: string;
}

/* ─────────────────────────── main screen ─────────────────────────── */

export default function ProjectDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    projects, employees, timeLogs, expenses,
    updateProject, deleteProject,
    addExpense, deleteExpense,
    getProjectLaborCost, getProjectExpenses, getSessionLaborCost,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const project = projects.find((p) => p.id === id);
  const [activeTab, setActiveTab] = useState<"info" | "finances" | "timelog" | "expenses">("info");
  const [showEditModal, setShowEditModal] = useState(false);
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
          text: "Delete", style: "destructive",
          onPress: async () => { await deleteProject(project.id); router.back(); },
        },
      ]
    );
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    await updateProject(project.id, { status });
    setShowStatusPicker(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const tabs = isAdmin
    ? (["info", "finances", "timelog", "expenses"] as const)
    : (["info", "timelog"] as const);
  const tabLabels: Record<string, string> = {
    info: "Details", finances: "Finances", timelog: "Time Log", expenses: "Expenses",
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
        <View style={styles.topBarActions}>
          {isAdmin ? (
            <TouchableOpacity onPress={() => setShowEditModal(true)} hitSlop={8}>
              <Feather name="edit-2" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          ) : null}
          {isAdmin ? (
            <TouchableOpacity onPress={handleDelete} hitSlop={8} style={{ marginLeft: 14 }}>
              <Feather name="trash-2" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          ) : null}
          {!isAdmin ? <View style={{ width: 22 }} /> : null}
        </View>
      </View>

      {/* ── Project hero strip ── */}
      <View style={[styles.heroStrip, { backgroundColor: colors.accent }]}>
        <StatusBadge status={project.status} />
        <View style={styles.heroRight}>
          {isAdmin ? (
            <TouchableOpacity style={styles.changeStatusBtn} onPress={() => setShowStatusPicker(true)}>
              <Text style={styles.changeStatusText}>Change</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.heroFinancials}>
            <Text style={styles.heroValue}>${project.totalValue.toLocaleString()}</Text>
            <Text style={[styles.heroProfit, { color: profit >= 0 ? "#4ade80" : "#f87171" }]}>
              {profit >= 0 ? "+" : ""}${profit.toFixed(0)} est. profit
            </Text>
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, { borderBottomColor: activeTab === t ? colors.primary : "transparent", borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t as any)}
          >
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
              {tabLabels[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>
        {activeTab === "info" && (
          <InfoTab
            project={project}
            assignedEmployees={assignedEmployees}
            isAdmin={isAdmin}
            onEdit={() => setShowEditModal(true)}
          />
        )}
        {activeTab === "finances" && isAdmin && (
          <FinancesTab
            project={project} labor={labor} otherExp={otherExp} totalCost={totalCost}
            profit={profit} margin={margin} remaining={remaining}
            projectLogs={projectLogs} projectExpenses={projectExpenses}
            employees={employees} getSessionLaborCost={getSessionLaborCost}
            onAddExpense={() => setShowAddExpense(true)}
          />
        )}
        {activeTab === "timelog" && (
          <TimeLogTab logs={projectLogs} employees={employees} getSessionLaborCost={getSessionLaborCost} isAdmin={isAdmin} />
        )}
        {activeTab === "expenses" && isAdmin && (
          <ExpensesTab expenses={projectExpenses} labor={labor} onAdd={() => setShowAddExpense(true)} onDelete={deleteExpense} />
        )}
      </ScrollView>

      {/* ── Status picker modal ── */}
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
              style={[styles.statusOption, { backgroundColor: project.status === s ? colors.primary + "18" : colors.card, borderBottomColor: colors.border }]}
              onPress={() => handleStatusChange(s)}
            >
              <StatusBadge status={s} />
              {project.status === s ? <Feather name="check" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Edit details modal (admin only) ── */}
      {showEditModal ? (
        <EditDetailsModal
          project={project}
          employees={employees}
          onClose={() => setShowEditModal(false)}
          onSave={async (updates) => {
            await updateProject(project.id, updates);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowEditModal(false);
          }}
        />
      ) : null}

      {/* ── Add expense modal ── */}
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

/* ═══════════════════════════════════════════════════════════════════
   INFO TAB  –  read-only, visible to admin AND employee
═══════════════════════════════════════════════════════════════════ */

function InfoTab({ project, assignedEmployees, isAdmin, onEdit }: {
  project: Project;
  assignedEmployees: any[];
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const colors = useColors();

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };

  const handlePhone = (phone: string) => Linking.openURL(`tel:${phone.replace(/\D/g, "")}`);
  const handleEmail = (email: string) => Linking.openURL(`mailto:${email}`);
  const handleAddress = (addr: string) => {
    const q = encodeURIComponent(addr);
    Linking.openURL(Platform.OS === "ios" ? `maps:?q=${q}` : `geo:0,0?q=${q}`);
  };

  // Parse documents stored as JSON strings
  const parsedDocs: DocEntry[] = (project.documents ?? []).map((d) => {
    try { return JSON.parse(d) as DocEntry; } catch { return { name: d, type: "Other" }; }
  });

  return (
    <View style={styles.tabContent}>
      {/* ── Dates & Schedule ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Feather name="calendar" size={15} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Schedule</Text>
        </View>
        <View style={styles.datesRow}>
          <View style={styles.dateCell}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Start Date</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>{fmtDate(project.startDate)}</Text>
          </View>
          <Feather name="arrow-right" size={14} color={colors.mutedForeground} style={{ marginTop: 18 }} />
          <View style={[styles.dateCell, { alignItems: "flex-end" }]}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Est. End Date</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {project.expectedEndDate ? fmtDate(project.expectedEndDate) : "TBD"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Client ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Feather name="user" size={15} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Client</Text>
        </View>
        <Text style={[styles.clientName, { color: colors.foreground }]}>{project.clientName || "—"}</Text>
        {project.clientPhone ? (
          <TouchableOpacity style={styles.contactRow} onPress={() => handlePhone(project.clientPhone)}>
            <View style={[styles.contactIcon, { backgroundColor: colors.success + "18" }]}>
              <Feather name="phone" size={14} color={colors.success} />
            </View>
            <Text style={[styles.contactValue, { color: colors.foreground }]}>{project.clientPhone}</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
        {project.clientEmail ? (
          <TouchableOpacity style={styles.contactRow} onPress={() => handleEmail(project.clientEmail)}>
            <View style={[styles.contactIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="mail" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.contactValue, { color: colors.foreground }]}>{project.clientEmail}</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Project Info ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Feather name="map-pin" size={15} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Project Info</Text>
        </View>
        {project.address ? (
          <TouchableOpacity style={styles.contactRow} onPress={() => handleAddress(project.address)}>
            <View style={[styles.contactIcon, { backgroundColor: colors.warning + "18" }]}>
              <Feather name="map-pin" size={14} color={colors.warning} />
            </View>
            <Text style={[styles.contactValue, { color: colors.foreground, flex: 1 }]} numberOfLines={2}>{project.address}</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.infoValueRow}>
          <Feather name="dollar-sign" size={14} color={colors.mutedForeground} />
          <View>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Contract Value</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>${project.totalValue.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* ── Paint Colors ── */}
      {project.paintColors.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Feather name="droplet" size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paint Colors</Text>
          </View>
          <View style={styles.colorChips}>
            {project.paintColors.map((c, i) => (
              <View key={i} style={[styles.colorChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                <View style={[styles.colorDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.colorChipText, { color: colors.foreground }]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── Photos ── */}
      {project.photos.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Feather name="image" size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photos</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>{project.photos.length}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
            {project.photos.map((uri, i) => (
              <View key={i} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Documents / Floor Plans ── */}
      {parsedDocs.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Feather name="paperclip" size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Documents & Floor Plans</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>{parsedDocs.length}</Text>
            </View>
          </View>
          {parsedDocs.map((doc, i) => {
            const docDef = DOC_TYPES.find((d) => d.key === doc.type) ?? DOC_TYPES[DOC_TYPES.length - 1];
            return (
              <View key={i} style={[styles.docRow, { borderBottomColor: colors.border, borderBottomWidth: i < parsedDocs.length - 1 ? 1 : 0 }]}>
                <View style={[styles.docIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name={docDef.icon as any} size={16} color={colors.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                  <Text style={[styles.docType, { color: colors.mutedForeground }]}>{doc.type}</Text>
                </View>
                {doc.uri ? (
                  <Image source={{ uri: doc.uri }} style={styles.docThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.docThumbPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="file" size={14} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Assigned Crew ── */}
      {assignedEmployees.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Feather name="users" size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Assigned Crew</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>{assignedEmployees.length}</Text>
            </View>
          </View>
          {assignedEmployees.map((emp, idx) => (
            <View
              key={emp.id}
              style={[styles.empRow, { borderBottomColor: colors.border, borderBottomWidth: idx < assignedEmployees.length - 1 ? 1 : 0 }]}
            >
              <View style={[styles.empAvatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.empInitials}>
                  {emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View style={styles.empInfo}>
                <Text style={[styles.empName, { color: colors.foreground }]}>{emp.name}</Text>
                <Text style={[styles.empMeta, { color: colors.mutedForeground }]}>
                  {emp.position} · ${emp.hourlyRate}/hr
                </Text>
              </View>
              <View style={[styles.empRoleBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.empRoleText, { color: colors.mutedForeground }]}>Crew</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Notes ── */}
      {project.notes ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Feather name="file-text" size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
          </View>
          <Text style={[styles.notesText, { color: colors.foreground }]}>{project.notes}</Text>
        </View>
      ) : null}

      {/* ── Edit button (admin only) ── */}
      {isAdmin ? (
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.accent }]} onPress={onEdit}>
          <Feather name="edit-2" size={16} color="#fff" />
          <Text style={styles.editBtnText}>Edit Project Details</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.readOnlyBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>
            Contact your admin to make changes
          </Text>
        </View>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EDIT DETAILS MODAL  –  admin only
═══════════════════════════════════════════════════════════════════ */

function EditDetailsModal({ project, employees, onClose, onSave }: {
  project: Project;
  employees: any[];
  onClose: () => void;
  onSave: (updates: Partial<Project>) => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: project.name,
    clientName: project.clientName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    address: project.address,
    totalValue: project.totalValue.toString(),
    startDate: project.startDate,
    expectedEndDate: project.expectedEndDate ?? "",
    status: project.status as ProjectStatus,
    notes: project.notes,
    paintColors: [...project.paintColors],
    photos: [...project.photos],
    documents: [...project.documents],
    assignedEmployeeIds: [...project.assignedEmployeeIds],
  });

  const [newColor, setNewColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [newDoc, setNewDoc] = useState<{ name: string; type: DocType; uri?: string }>({ name: "", type: "Floor Plan" });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ── paint colors ──
  const addColor = () => {
    const c = newColor.trim();
    if (!c) return;
    set("paintColors", [...form.paintColors, c]);
    setNewColor("");
  };
  const removeColor = (i: number) =>
    set("paintColors", form.paintColors.filter((_: any, idx: number) => idx !== i));

  // ── photos ──
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow access to your photo library to add photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      set("photos", [...form.photos, ...uris]);
    }
  };
  const removePhoto = (i: number) =>
    set("photos", form.photos.filter((_: any, idx: number) => idx !== i));

  // ── documents ──
  const parsedDocs: DocEntry[] = form.documents.map((d) => {
    try { return JSON.parse(d) as DocEntry; } catch { return { name: d, type: "Other" }; }
  });

  const pickDocImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!result.canceled) setNewDoc((d) => ({ ...d, uri: result.assets[0].uri }));
  };

  const addDoc = () => {
    if (!newDoc.name.trim()) return;
    set("documents", [...form.documents, JSON.stringify(newDoc)]);
    setNewDoc({ name: "", type: "Floor Plan" });
    setShowDocForm(false);
  };
  const removeDoc = (i: number) =>
    set("documents", form.documents.filter((_: any, idx: number) => idx !== i));

  // ── crew assignment ──
  const toggleEmployee = (empId: string) => {
    const ids = form.assignedEmployeeIds;
    set("assignedEmployeeIds", ids.includes(empId) ? ids.filter((x: string) => x !== empId) : [...ids, empId]);
  };

  // ── save ──
  const handleSave = async () => {
    if (!form.name.trim()) { setError("Project name is required"); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        clientEmail: form.clientEmail.trim(),
        address: form.address.trim(),
        totalValue: parseFloat(form.totalValue) || 0,
        startDate: form.startDate,
        expectedEndDate: form.expectedEndDate || undefined,
        status: form.status,
        notes: form.notes.trim(),
        paintColors: form.paintColors,
        photos: form.photos,
        documents: form.documents,
        assignedEmployeeIds: form.assignedEmployeeIds,
      });
    } finally {
      setSaving(false);
    }
  };

  const fieldEmployees = employees.filter((e) => e.role === "employee" && e.isActive);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.editModalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.editHeaderBtn}>
            <Text style={[styles.editHeaderCancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.editModalTitle, { color: colors.foreground }]}>Edit Project</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.editHeaderBtn}>
            <Text style={[styles.editHeaderSave, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>
              {saving ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorBannerText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* ── Project name & status ── */}
          <EditSection title="Project" icon="briefcase">
            <InputField label="Project Name *" value={form.name} onChangeText={(t) => set("name", t)} placeholder="Project name" />

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Status</Text>
              <TouchableOpacity
                style={[styles.statusPickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowStatusPicker(true)}
              >
                <StatusBadge status={form.status} />
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <InputField label="Start Date" value={form.startDate} onChangeText={(t) => set("startDate", t)} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Est. End Date" value={form.expectedEndDate} onChangeText={(t) => set("expectedEndDate", t)} placeholder="YYYY-MM-DD" />
              </View>
            </View>

            <InputField label="Contract Value ($)" value={form.totalValue} onChangeText={(t) => set("totalValue", t)} keyboardType="numeric" placeholder="0" />
          </EditSection>

          {/* ── Client ── */}
          <EditSection title="Client" icon="user">
            <InputField label="Client Name" value={form.clientName} onChangeText={(t) => set("clientName", t)} placeholder="Full name" />
            <InputField label="Phone" value={form.clientPhone} onChangeText={(t) => set("clientPhone", t)} keyboardType="phone-pad" placeholder="+1 555 000 0000" />
            <InputField label="Email" value={form.clientEmail} onChangeText={(t) => set("clientEmail", t)} keyboardType="email-address" autoCapitalize="none" placeholder="client@email.com" />
          </EditSection>

          {/* ── Location ── */}
          <EditSection title="Location" icon="map-pin">
            <InputField label="Project Address" value={form.address} onChangeText={(t) => set("address", t)} placeholder="123 Main St, City, State ZIP" multiline />
          </EditSection>

          {/* ── Paint Colors ── */}
          <EditSection title="Paint Colors" icon="droplet">
            {form.paintColors.length > 0 ? (
              <View style={styles.colorTagsWrap}>
                {form.paintColors.map((c: string, i: number) => (
                  <View key={i} style={[styles.colorTag, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                    <View style={[styles.colorDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.colorTagText, { color: colors.foreground }]} numberOfLines={1}>{c}</Text>
                    <TouchableOpacity onPress={() => removeColor(i)} hitSlop={6}>
                      <Feather name="x" size={12} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.addColorRow}>
              <TextInput
                style={[styles.addColorInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Benjamin Moore White Dove OC-17"
                placeholderTextColor={colors.mutedForeground}
                value={newColor}
                onChangeText={setNewColor}
                onSubmitEditing={addColor}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addColorBtn, { backgroundColor: newColor.trim() ? colors.primary : colors.muted }]}
                onPress={addColor}
              >
                <Feather name="plus" size={16} color={newColor.trim() ? "#fff" : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Type a color name and press + to add
            </Text>
          </EditSection>

          {/* ── Notes ── */}
          <EditSection title="Notes" icon="file-text">
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Project notes, special instructions, client preferences…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={form.notes}
              onChangeText={(t) => set("notes", t)}
            />
          </EditSection>

          {/* ── Photos ── */}
          <EditSection title="Photos" icon="image">
            {form.photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {form.photos.map((uri: string, i: number) => (
                  <View key={i} style={styles.photoGridItem}>
                    <Image source={{ uri }} style={styles.photoGridImg} resizeMode="cover" />
                    <TouchableOpacity style={[styles.photoRemoveBtn, { backgroundColor: colors.destructive }]} onPress={() => removePhoto(i)}>
                      <Feather name="x" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={[styles.photoAddTile, { borderColor: colors.border, backgroundColor: colors.muted }]} onPress={pickPhoto}>
                  <Feather name="plus" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.photoPickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickPhoto}>
                <Feather name="camera" size={24} color={colors.mutedForeground} />
                <Text style={[styles.photoPickerText, { color: colors.mutedForeground }]}>Tap to add photos</Text>
                <Text style={[styles.photoPickerHint, { color: colors.mutedForeground }]}>Progress shots, before/after, site photos</Text>
              </TouchableOpacity>
            )}
          </EditSection>

          {/* ── Documents & Floor Plans ── */}
          <EditSection title="Documents & Floor Plans" icon="paperclip">
            {parsedDocs.length > 0 ? (
              <View style={styles.docList}>
                {parsedDocs.map((doc, i) => {
                  const docDef = DOC_TYPES.find((d) => d.key === doc.type) ?? DOC_TYPES[DOC_TYPES.length - 1];
                  return (
                    <View key={i} style={[styles.docEditRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.docIconWrap, { backgroundColor: colors.primary + "18" }]}>
                        <Feather name={docDef.icon as any} size={14} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                        <Text style={[styles.docType, { color: colors.mutedForeground }]}>{doc.type}</Text>
                      </View>
                      {doc.uri ? <Image source={{ uri: doc.uri }} style={styles.docThumb} resizeMode="cover" /> : null}
                      <TouchableOpacity onPress={() => removeDoc(i)} hitSlop={8}>
                        <Feather name="trash-2" size={15} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {showDocForm ? (
              <View style={[styles.docFormCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>Document Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {DOC_TYPES.map(({ key, icon }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.docTypeChip,
                        { backgroundColor: newDoc.type === key ? colors.primary : colors.muted },
                      ]}
                      onPress={() => setNewDoc((d) => ({ ...d, type: key as DocType }))}
                    >
                      <Feather name={icon as any} size={13} color={newDoc.type === key ? "#fff" : colors.mutedForeground} />
                      <Text style={[styles.docTypeChipText, { color: newDoc.type === key ? "#fff" : colors.mutedForeground }]}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={[styles.docNameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Document name (e.g. Ground Floor Plan)"
                  placeholderTextColor={colors.mutedForeground}
                  value={newDoc.name}
                  onChangeText={(t) => setNewDoc((d) => ({ ...d, name: t }))}
                />

                <TouchableOpacity style={[styles.docImagePickBtn, { borderColor: colors.border }]} onPress={pickDocImage}>
                  {newDoc.uri ? (
                    <Image source={{ uri: newDoc.uri }} style={styles.docPreviewImg} resizeMode="cover" />
                  ) : (
                    <>
                      <Feather name="image" size={16} color={colors.mutedForeground} />
                      <Text style={[styles.docImagePickText, { color: colors.mutedForeground }]}>Attach image (optional)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.docFormActions}>
                  <TouchableOpacity style={[styles.docCancelBtn, { borderColor: colors.border }]} onPress={() => { setShowDocForm(false); setNewDoc({ name: "", type: "Floor Plan" }); }}>
                    <Text style={[styles.docCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.docSaveBtn, { backgroundColor: colors.primary }]} onPress={addDoc}>
                    <Text style={styles.docSaveText}>Add Document</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.addDocBtn, { borderColor: colors.border, backgroundColor: colors.muted }]} onPress={() => setShowDocForm(true)}>
                <Feather name="plus" size={16} color={colors.mutedForeground} />
                <Text style={[styles.addDocText, { color: colors.mutedForeground }]}>Add Document or Floor Plan</Text>
              </TouchableOpacity>
            )}
          </EditSection>

          {/* ── Assigned Crew ── */}
          <EditSection title="Assigned Crew" icon="users">
            <Text style={[styles.hintText, { color: colors.mutedForeground, marginBottom: 8 }]}>
              Selected employees can view this project and clock in.
            </Text>
            {fieldEmployees.map((emp) => {
              const isAssigned = form.assignedEmployeeIds.includes(emp.id);
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.crewRow, { borderColor: isAssigned ? colors.primary + "60" : colors.border, backgroundColor: isAssigned ? colors.primary + "08" : colors.surface }]}
                  onPress={() => toggleEmployee(emp.id)}
                >
                  <View style={[styles.crewAvatar, { backgroundColor: isAssigned ? colors.primary : colors.muted }]}>
                    <Text style={[styles.crewInitials, { color: isAssigned ? "#fff" : colors.mutedForeground }]}>
                      {emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.crewInfo}>
                    <Text style={[styles.crewName, { color: colors.foreground }]}>{emp.name}</Text>
                    <Text style={[styles.crewMeta, { color: colors.mutedForeground }]}>{emp.position} · ${emp.hourlyRate}/hr</Text>
                  </View>
                  <View style={[styles.crewCheck, { backgroundColor: isAssigned ? colors.primary : colors.muted, borderColor: isAssigned ? colors.primary : colors.border }]}>
                    {isAssigned ? <Feather name="check" size={12} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </EditSection>

          <PrimaryButton label={saving ? "Saving…" : "Save Changes"} onPress={handleSave} loading={saving} />
        </ScrollView>

        {/* Inline status picker */}
        <Modal visible={showStatusPicker} animationType="slide" presentationStyle="formSheet" transparent>
          <View style={styles.statusPickerOverlay}>
            <View style={[styles.statusPickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statusPickerTitle, { color: colors.foreground }]}>Project Status</Text>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusPickerRow, { borderBottomColor: colors.border, backgroundColor: form.status === s ? colors.primary + "12" : "transparent" }]}
                  onPress={() => { set("status", s); setShowStatusPicker(false); }}
                >
                  <StatusBadge status={s} />
                  {form.status === s ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.statusPickerCancel, { borderTopColor: colors.border }]} onPress={() => setShowStatusPicker(false)}>
                <Text style={[styles.statusPickerCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

function EditSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.editSection, { borderColor: colors.border }]}>
      <View style={styles.editSectionHeader}>
        <Feather name={icon as any} size={14} color={colors.primary} />
        <Text style={[styles.editSectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FINANCES TAB
═══════════════════════════════════════════════════════════════════ */

function FinancesTab({ project, labor, otherExp, totalCost, profit, margin, remaining, projectLogs, projectExpenses, employees, getSessionLaborCost, onAddExpense }: any) {
  const colors = useColors();
  const isProfit = profit >= 0;
  const marginColor = margin >= 30 ? colors.success : margin >= 15 ? colors.warning : colors.destructive;

  const laborByEmployee = employees
    .filter((e: any) => project.assignedEmployeeIds.includes(e.id))
    .map((emp: any) => {
      const empLogs = projectLogs.filter((l: any) => l.employeeId === emp.id && l.totalMinutes);
      const hours = empLogs.reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);
      const cost = empLogs.reduce((s: number, l: any) => s + getSessionLaborCost(l), 0);
      return { emp, hours, cost, sessions: empLogs.length };
    })
    .filter((x: any) => x.hours > 0);

  const expByCategory: Record<string, number> = {};
  for (const exp of projectExpenses) expByCategory[exp.category] = (expByCategory[exp.category] ?? 0) + exp.amount;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.finCard, { backgroundColor: colors.accent }]}>
        <Text style={styles.finCardTitle}>Financial Summary</Text>
        <View style={styles.finCardRow}>
          <View style={styles.finCardCell}>
            <Text style={styles.finCardLabel}>Contract Value</Text>
            <Text style={styles.finCardValue}>${project.totalValue.toLocaleString()}</Text>
          </View>
          <View style={styles.finCardDivider} />
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
          <View style={styles.finCardDivider} />
          <View style={styles.finCardCell}>
            <Text style={styles.finCardLabel}>Margin</Text>
            <Text style={[styles.finCardLargeValue, { color: marginColor }]}>{margin.toFixed(1)}%</Text>
          </View>
        </View>
        <View style={[styles.finCardSeparator, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
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

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Budget Utilization</Text>
        <FinBar label="Labor" amount={labor} total={project.totalValue} color={colors.destructive} />
        <FinBar label="Expenses" amount={otherExp} total={project.totalValue} color={colors.warning} />
        <FinBar label="Remaining" amount={Math.max(0, remaining)} total={project.totalValue} color={colors.success} />
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total spent</Text>
          <Text style={[styles.totalValue2, { color: colors.foreground }]}>${totalCost.toFixed(0)} of ${project.totalValue.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Labor Cost</Text>
          <Text style={[styles.sectionBadge, { backgroundColor: colors.destructive + "20", color: colors.destructive }]}>${labor.toFixed(0)} total</Text>
        </View>
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Auto-calculated from clocked hours</Text>
        {laborByEmployee.length === 0
          ? <Text style={[styles.hintText, { color: colors.mutedForeground }]}>No hours logged yet</Text>
          : laborByEmployee.map(({ emp, hours, cost, sessions }: any) => (
            <View key={emp.id} style={[styles.laborRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.laborAvatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.laborInitials}>{emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</Text>
              </View>
              <View style={styles.laborInfo}>
                <Text style={[styles.laborName, { color: colors.foreground }]}>{emp.name}</Text>
                <Text style={[styles.laborMeta, { color: colors.mutedForeground }]}>{hours.toFixed(1)}h · {sessions} session{sessions !== 1 ? "s" : ""} · ${emp.hourlyRate}/hr</Text>
              </View>
              <Text style={[styles.laborCost, { color: colors.destructive }]}>${cost.toFixed(0)}</Text>
            </View>
          ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Other Expenses</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={[styles.sectionBadge, { backgroundColor: colors.warning + "20", color: colors.warning }]}>${otherExp.toFixed(0)} total</Text>
            <TouchableOpacity style={[styles.addExpSmall, { backgroundColor: colors.primary }]} onPress={onAddExpense}>
              <Feather name="plus" size={12} color="#fff" />
              <Text style={styles.addExpSmallText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        {Object.keys(expByCategory).length === 0
          ? <Text style={[styles.hintText, { color: colors.mutedForeground }]}>No expenses recorded yet</Text>
          : EXPENSE_CATEGORIES.filter(({ key }) => expByCategory[key]).map(({ key, icon }) => (
            <View key={key} style={[styles.catRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.catIcon, { backgroundColor: CATEGORY_COLORS[key] + "20" }]}>
                <Feather name={icon as any} size={14} color={CATEGORY_COLORS[key]} />
              </View>
              <Text style={[styles.catLabel2, { color: colors.foreground }]}>{key}</Text>
              <View style={styles.catBarWrap}>
                <View style={[styles.catBarBg, { backgroundColor: colors.muted }]}>
                  <View style={[styles.catBarFill, { width: `${Math.min(100, (expByCategory[key] / (otherExp || 1)) * 100)}%` as any, backgroundColor: CATEGORY_COLORS[key] }]} />
                </View>
              </View>
              <Text style={[styles.catAmount, { color: colors.foreground }]}>${expByCategory[key].toFixed(0)}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}

function FinBar({ label, amount, total, color }: any) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, amount / total) : 0;
  return (
    <View style={styles.finBarWrap}>
      <View style={styles.finBarTop}>
        <Text style={[styles.finBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.finBarAmt, { color: colors.foreground }]}>
          ${amount.toFixed(0)} <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>({(pct * 100).toFixed(0)}%)</Text>
        </Text>
      </View>
      <View style={[styles.progBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.progFill, { width: `${Math.max(0, pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TIME LOG TAB
═══════════════════════════════════════════════════════════════════ */

function TimeLogTab({ logs, employees, getSessionLaborCost, isAdmin }: any) {
  const colors = useColors();
  const sorted = [...logs].sort((a: any, b: any) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  const completedLogs = logs.filter((l: any) => l.totalMinutes);
  const totalHours = completedLogs.reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);
  const totalLaborCost = completedLogs.reduce((s: number, l: any) => s + getSessionLaborCost(l), 0);
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

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
        <Text style={[styles.hintText, { color: colors.mutedForeground, textAlign: "center", padding: 24 }]}>No time logs for this project</Text>
      ) : null}
      {sorted.map((log: any) => {
        const emp = employees.find((e: any) => e.id === log.employeeId);
        const hours = log.totalMinutes ? log.totalMinutes / 60 : null;
        const cost = getSessionLaborCost(log);
        const isActive = !log.clockOut;
        return (
          <View key={log.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: isActive ? colors.primary + "60" : colors.border, borderLeftWidth: isActive ? 3 : 1, borderLeftColor: isActive ? colors.primary : colors.border }]}>
            <View style={styles.logCardTop}>
              <View style={styles.logEmpRow}>
                <View style={[styles.logAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.logAvatarText}>{emp?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"}</Text>
                </View>
                <View>
                  <Text style={[styles.logName, { color: colors.foreground }]}>{emp?.name ?? "Unknown"}</Text>
                  <Text style={[styles.logDate, { color: colors.mutedForeground }]}>{fmtDate(log.clockIn)}</Text>
                </View>
              </View>
              {isActive ? (
                <View style={[styles.activeChip, { backgroundColor: colors.primary + "20" }]}>
                  <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.activeText, { color: colors.primary }]}>Active</Text>
                </View>
              ) : hours ? (
                <View style={styles.logRight}>
                  <Text style={[styles.logHours, { color: colors.foreground }]}>{hours.toFixed(2)}h</Text>
                  {isAdmin ? <Text style={[styles.logCost, { color: colors.destructive }]}>${cost.toFixed(0)}</Text> : null}
                </View>
              ) : null}
            </View>
            <View style={styles.logTimes}>
              <View style={styles.logTimeChip}>
                <Feather name="log-in" size={11} color={colors.success} />
                <Text style={[styles.logTime, { color: colors.mutedForeground }]}>{fmtTime(log.clockIn)}</Text>
              </View>
              {log.clockOut ? (
                <>
                  <Text style={{ color: colors.border }}>→</Text>
                  <View style={styles.logTimeChip}>
                    <Feather name="log-out" size={11} color={colors.destructive} />
                    <Text style={[styles.logTime, { color: colors.mutedForeground }]}>{fmtTime(log.clockOut)}</Text>
                  </View>
                </>
              ) : null}
            </View>
            {log.notes ? <Text style={[styles.logNotes, { color: colors.mutedForeground }]} numberOfLines={2}>"{log.notes}"</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EXPENSES TAB
═══════════════════════════════════════════════════════════════════ */

function ExpensesTab({ expenses, labor, onAdd, onDelete }: any) {
  const colors = useColors();
  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const expByCategory: Record<string, number> = {};
  for (const exp of expenses) expByCategory[exp.category] = (expByCategory[exp.category] ?? 0) + exp.amount;

  return (
    <View style={styles.tabContent}>
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
      {Object.keys(expByCategory).length > 0 ? (
        <View style={styles.catChipsRow}>
          {EXPENSE_CATEGORIES.filter(({ key }) => expByCategory[key]).map(({ key }) => (
            <View key={key} style={[styles.catSummaryChip, { borderColor: CATEGORY_COLORS[key] + "40", backgroundColor: CATEGORY_COLORS[key] + "15" }]}>
              <Text style={[styles.catSummaryText, { color: CATEGORY_COLORS[key] }]}>{key}: ${expByCategory[key].toFixed(0)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <TouchableOpacity style={[styles.addExpBtn, { backgroundColor: colors.primary }]} onPress={onAdd}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.addExpBtnText}>Add Expense</Text>
      </TouchableOpacity>
      {expenses.length === 0 ? (
        <Text style={[styles.hintText, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 24 }]}>No expenses recorded yet</Text>
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
                  <Text style={{ color: catColor, fontSize: 10, fontWeight: "700" }}>{exp.category.toUpperCase()}</Text>
                </View>
                <Text style={[styles.expDate, { color: colors.mutedForeground }]}>{new Date(exp.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
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

/* ═══════════════════════════════════════════════════════════════════
   ADD EXPENSE MODAL
═══════════════════════════════════════════════════════════════════ */

function AddExpenseModal({ onClose, onSave }: any) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ category: "Materials" as ExpenseCategoryKey, description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.description.trim()) { setError("Description is required"); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError("Valid amount is required"); return; }
    setSaving(true);
    try { await onSave({ ...form, amount: parseFloat(form.amount) }); }
    finally { setSaving(false); }
  }

  const selectedColor = CATEGORY_COLORS[form.category];
  return (
    <Modal visible animationType="slide" presentationStyle="formSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Expense</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map(({ key, icon }) => {
              const catColor = CATEGORY_COLORS[key];
              const isSelected = form.category === key;
              return (
                <TouchableOpacity key={key} style={[styles.catGridItem, { backgroundColor: isSelected ? catColor : colors.muted, borderColor: isSelected ? catColor : "transparent", borderWidth: 2 }]} onPress={() => set("category", key)}>
                  <Feather name={icon as any} size={20} color={isSelected ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.catGridLabel, { color: isSelected ? "#fff" : colors.mutedForeground }]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.selectedCatBar, { backgroundColor: selectedColor + "18", borderColor: selectedColor + "40" }]}>
            <Feather name={EXPENSE_CATEGORIES.find((c) => c.key === form.category)!.icon as any} size={14} color={selectedColor} />
            <Text style={[styles.selectedCatText, { color: selectedColor }]}>{form.category} selected</Text>
          </View>
          <InputField label="Description *" value={form.description} onChangeText={(t: string) => set("description", t)} placeholder="e.g. 20 gallons of primer" />
          <InputField label="Amount ($) *" value={form.amount} onChangeText={(t: string) => set("amount", t)} keyboardType="numeric" placeholder="0.00" />
          <InputField label="Date" value={form.date} onChangeText={(t: string) => set("date", t)} placeholder="YYYY-MM-DD" />
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          <PrimaryButton label={saving ? "Adding…" : "Add Expense"} onPress={handleSave} loading={saving} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // Top bar
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center", marginHorizontal: 10 },
  topBarActions: { flexDirection: "row", alignItems: "center" },

  // Hero strip
  heroStrip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  heroRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  changeStatusBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 100 },
  changeStatusText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  heroFinancials: { alignItems: "flex-end" },
  heroValue: { color: "#fff", fontSize: 15, fontWeight: "800" },
  heroProfit: { fontSize: 11, fontWeight: "600" },

  // Tabs
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 12, fontWeight: "600" },
  content: { padding: 16, gap: 14 },
  tabContent: { gap: 14 },

  // Shared section card
  section: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, fontSize: 12, fontWeight: "700" },
  hintText: { fontSize: 12 },
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  countText: { fontSize: 11, fontWeight: "700" },

  // Info tab: dates
  datesRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  dateCell: { flex: 1, gap: 4 },
  dateLabel: { fontSize: 11, fontWeight: "500" },
  dateValue: { fontSize: 14, fontWeight: "700" },

  // Info tab: client / contact rows
  clientName: { fontSize: 18, fontWeight: "800" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  contactIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  contactValue: { fontSize: 14, flex: 1 },

  // Info tab: generic info row
  infoValueRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", marginTop: 1 },

  // Paint colors display
  colorChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  colorChipText: { fontSize: 13, fontWeight: "500" },

  // Photos display
  photoScroll: { gap: 10, paddingVertical: 4 },
  photoThumbWrap: { borderRadius: 10, overflow: "hidden" },
  photoThumb: { width: 120, height: 90 },

  // Documents display
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  docIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: "600" },
  docType: { fontSize: 12, marginTop: 1 },
  docThumb: { width: 44, height: 44, borderRadius: 6 },
  docThumbPlaceholder: { width: 44, height: 44, borderRadius: 6, alignItems: "center", justifyContent: "center" },

  // Assigned crew display
  empRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  empAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  empInitials: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: "700" },
  empMeta: { fontSize: 12, marginTop: 1 },
  empRoleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  empRoleText: { fontSize: 11, fontWeight: "600" },

  // Notes
  notesText: { fontSize: 14, lineHeight: 22 },

  // Edit and read-only buttons
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  editBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  readOnlyBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  readOnlyText: { fontSize: 13 },

  // Edit modal
  modal: { flex: 1 },
  editModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  editModalTitle: { fontSize: 17, fontWeight: "700" },
  editHeaderBtn: { minWidth: 60 },
  editHeaderCancel: { fontSize: 15 },
  editHeaderSave: { fontSize: 15, fontWeight: "700", textAlign: "right" },
  editContent: { padding: 16, gap: 16, paddingBottom: 40 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorBannerText: { fontSize: 13, flex: 1 },
  editSection: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 14 },
  editSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: -4 },
  editSectionTitle: { fontSize: 14, fontWeight: "700" },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  twoCol: { flexDirection: "row", gap: 12 },

  // Status picker in edit modal
  statusPickerBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  statusPickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  statusPickerSheet: { borderRadius: 20, borderWidth: 1, margin: 16, overflow: "hidden" },
  statusPickerTitle: { fontSize: 15, fontWeight: "700", padding: 16, paddingBottom: 8 },
  statusPickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  statusPickerCancel: { padding: 16, alignItems: "center", borderTopWidth: 1 },
  statusPickerCancelText: { fontSize: 14, fontWeight: "600" },

  // Paint colors edit
  colorTagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorTag: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, borderWidth: 1, maxWidth: 220 },
  colorTagText: { fontSize: 13, flex: 1 },
  addColorRow: { flexDirection: "row", gap: 10 },
  addColorInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addColorBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },

  // Notes input
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 14, minHeight: 100 },

  // Photos edit
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoGridItem: { position: "relative" },
  photoGridImg: { width: 90, height: 90, borderRadius: 10 },
  photoRemoveBtn: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  photoAddTile: { width: 90, height: 90, borderRadius: 10, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoPickerBtn: { padding: 24, borderRadius: 14, borderWidth: 2, borderStyle: "dashed", alignItems: "center", gap: 8 },
  photoPickerText: { fontSize: 15, fontWeight: "600" },
  photoPickerHint: { fontSize: 12 },

  // Documents edit
  docList: { gap: 8 },
  docEditRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 12, borderWidth: 1 },
  addDocBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 2, borderStyle: "dashed" },
  addDocText: { fontSize: 14, fontWeight: "600" },
  docFormCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 12 },
  docTypeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
  docTypeChipText: { fontSize: 12, fontWeight: "600" },
  docNameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  docImagePickBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 12 },
  docImagePickText: { fontSize: 13 },
  docPreviewImg: { width: "100%", height: 80, borderRadius: 8 },
  docFormActions: { flexDirection: "row", gap: 10 },
  docCancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  docCancelText: { fontSize: 14, fontWeight: "600" },
  docSaveBtn: { flex: 2, padding: 12, borderRadius: 10, alignItems: "center" },
  docSaveText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Crew assignment
  crewRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 12, borderWidth: 1 },
  crewAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  crewInitials: { fontWeight: "700", fontSize: 13 },
  crewInfo: { flex: 1 },
  crewName: { fontSize: 14, fontWeight: "600" },
  crewMeta: { fontSize: 12, marginTop: 1 },
  crewCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  // Finances tab
  finCard: { borderRadius: 16, padding: 20 },
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
  finBarWrap: { gap: 5 },
  finBarTop: { flexDirection: "row", justifyContent: "space-between" },
  finBarLabel: { fontSize: 13 },
  finBarAmt: { fontSize: 13, fontWeight: "600" },
  progBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, marginTop: 4 },
  totalLabel: { fontSize: 13 },
  totalValue2: { fontSize: 13, fontWeight: "700" },
  laborRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10, borderBottomWidth: 1 },
  laborAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  laborInitials: { color: "#fff", fontWeight: "700", fontSize: 13 },
  laborInfo: { flex: 1 },
  laborName: { fontSize: 14, fontWeight: "600" },
  laborMeta: { fontSize: 12, marginTop: 1 },
  laborCost: { fontSize: 15, fontWeight: "800" },
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
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 20, gap: 16 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catGridItem: { width: "30%", alignItems: "center", padding: 14, borderRadius: 12, gap: 6, flexGrow: 1 },
  catGridLabel: { fontSize: 12, fontWeight: "600" },
  selectedCatBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  selectedCatText: { fontSize: 13, fontWeight: "600" },
  errorText: { fontSize: 13 },

  // Status picker (main modal)
  statusOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
});
