import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { Employee, useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { useColors } from "@/hooks/useColors";

// ─── Avatar color ─────────────────────────────────────────────────────────────
const PALETTE = [
  "#f97316", "#3b82f6", "#16a34a", "#a855f7",
  "#ec4899", "#14b8a6", "#6366f1", "#d97706",
];
function nameToColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function EmployeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { employees, projects, addEmployee, updateEmployee, timeLogs, isLoading } = useData();
  const { showToast } = useToast();

  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive);
  const activeLogs = timeLogs.filter((l) => !l.clockOut);
  const onSiteCount = activeLogs.length;
  const idleCount = activeEmployees.length - onSiteCount;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.topBarTitle}>Team</Text>
        <TouchableOpacity
          style={styles.addCircle}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeEmployees}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 24 },
          activeEmployees.length === 0 && styles.listEmpty,
        ]}
        ListHeaderComponent={
          <View style={styles.statStrip}>
            <StatPill icon="users" label="Total" value={activeEmployees.length} color={colors.primary} />
            <StatPill icon="radio" label="On Site" value={onSiteCount} color={colors.success} pulse={onSiteCount > 0} />
            <StatPill icon="moon" label="Idle" value={idleCount} color={colors.mutedForeground} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No team members yet"
            subtitle="Add your first employee to start tracking time and assignments."
            actionLabel="Add Employee"
            onAction={() => setShowAdd(true)}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        renderItem={({ item }) => {
          const isOnSite = activeLogs.some((l) => l.employeeId === item.id);
          const assigned = projects.filter((p) => p.assignedEmployeeIds.includes(item.id));
          return (
            <EmployeeRow
              employee={item}
              isOnSite={isOnSite}
              assignedProjects={assigned}
              onEdit={() => setEditTarget(item)}
            />
          );
        }}
      />

      {/* ─── Add modal ───────────────────────────────────────────────────── */}
      {showAdd && (
        <EmployeeFormModal
          title="Add Employee"
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await addEmployee(data);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      )}

      {/* ─── Edit modal ──────────────────────────────────────────────────── */}
      {editTarget && (
        <EmployeeFormModal
          title="Edit Employee"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => {
            await updateEmployee(editTarget.id, data);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("success", "Employee updated");
            setEditTarget(null);
          }}
        />
      )}
    </View>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon, label, value, color, pulse = false,
}: {
  icon: string; label: string; value: number; color: string; pulse?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={13} color={color} />
      </View>
      <View>
        <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Employee row ─────────────────────────────────────────────────────────────
function EmployeeRow({
  employee, isOnSite, assignedProjects, onEdit,
}: {
  employee: Employee;
  isOnSite: boolean;
  assignedProjects: { id: string; name: string }[];
  onEdit: () => void;
}) {
  const colors = useColors();
  const initials = employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const avatarColor = nameToColor(employee.name);
  const shown = assignedProjects.slice(0, 2);
  const extra = assignedProjects.length - shown.length;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card }]}
      onPress={onEdit}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {employee.name}
          </Text>
          {isOnSite ? (
            <View style={[styles.onSitePill, { backgroundColor: colors.success + "18", borderColor: colors.success + "35" }]}>
              <View style={[styles.onSiteDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.onSiteText, { color: colors.success }]}>On Site</Text>
            </View>
          ) : (
            <View style={[styles.idlePill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.idleText, { color: colors.mutedForeground }]}>Idle</Text>
            </View>
          )}
        </View>
        {employee.position ? (
          <Text style={[styles.position, { color: colors.mutedForeground }]} numberOfLines={1}>
            {employee.position}
          </Text>
        ) : null}
        <View style={styles.projectChips}>
          {shown.length === 0 ? (
            <Text style={[styles.noProjects, { color: colors.mutedForeground }]}>No projects assigned</Text>
          ) : (
            <>
              {shown.map((p) => (
                <View key={p.id} style={[styles.chip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28" }]}>
                  <Feather name="briefcase" size={10} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>{p.name}</Text>
                </View>
              ))}
              {extra > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>+{extra} more</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ─── Employee form modal (add + edit) ────────────────────────────────────────
function EmployeeFormModal({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial?: Employee;
  onClose: () => void;
  onSave: (data: Omit<Employee, "id">) => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    position: initial?.position ?? "",
    hourlyRate: initial?.hourlyRate != null ? String(initial.hourlyRate) : "",
    startDate: initial?.startDate ?? new Date().toISOString().split("T")[0],
    role: (initial?.role ?? "employee") as "admin" | "employee",
    isActive: initial?.isActive ?? true,
    avatarUrl: initial?.avatarUrl ?? null,
  });
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.hourlyRate) {
      setError("Name, email and hourly rate are required");
      return;
    }
    if (!initial) {
      if (!password.trim()) {
        setError("Temporary password is required");
        return;
      }
      if (password.length < 8) {
        setError("Temporary password must be at least 8 characters");
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, password, hourlyRate: parseFloat(form.hourlyRate) || 0 } as any);
      if (!initial) {
        setCredentials({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password });
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!credentials) return;
    const text =
      `SiteTrack Login\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    try {
      if (Platform.OS === "web") {
        await (navigator as any).clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        await Share.share({ message: text });
      }
    } catch {}
  }

  // ── Credentials success view ─────────────────────────────────────────────
  if (credentials) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <View style={{ width: 22 }} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Account Created</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.credIconRow}>
              <View style={[styles.credIconWrap, { backgroundColor: colors.success + "18" }]}>
                <Feather name="check-circle" size={40} color={colors.success} />
              </View>
            </View>

            <Text style={[styles.credTitle, { color: colors.foreground }]}>
              {credentials.name}
            </Text>
            <Text style={[styles.credSubtitle, { color: colors.mutedForeground }]}>
              Account created successfully
            </Text>

            {/* Credential card */}
            <View style={[styles.credCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.credRow}>
                <View style={[styles.credFieldIcon, { backgroundColor: colors.primary + "14" }]}>
                  <Feather name="mail" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.credLabel, { color: colors.mutedForeground }]}>Email</Text>
                  <Text style={[styles.credValue, { color: colors.foreground }]} selectable>
                    {credentials.email}
                  </Text>
                </View>
              </View>
              <View style={[styles.credDivider, { backgroundColor: colors.border }]} />
              <View style={styles.credRow}>
                <View style={[styles.credFieldIcon, { backgroundColor: colors.primary + "14" }]}>
                  <Feather name="lock" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.credLabel, { color: colors.mutedForeground }]}>Temporary Password</Text>
                  <Text style={[styles.credValue, { color: colors.foreground }]} selectable>
                    {credentials.password}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info note */}
            <View style={[styles.infoNote, { backgroundColor: colors.primary + "0f", borderColor: colors.primary + "28" }]}>
              <Feather name="info" size={14} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.infoNoteText, { color: colors.primary }]}>
                Please share these login details with the employee. The employee should change the password after first login.
              </Text>
            </View>

            {/* Share / Copy button */}
            <TouchableOpacity
              style={[
                styles.shareBtn,
                { backgroundColor: copied ? colors.success : colors.accent },
              ]}
              onPress={handleShare}
              activeOpacity={0.82}
            >
              <Feather name={copied ? "check" : Platform.OS === "web" ? "copy" : "share-2"} size={16} color="#fff" />
              <Text style={styles.shareBtnText}>
                {copied ? "Copied!" : Platform.OS === "web" ? "Copy Credentials" : "Share Credentials"}
              </Text>
            </TouchableOpacity>

            <PrimaryButton label="Done" onPress={onClose} />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>

        {/* Modal header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

          {/* Avatar preview (edit mode) */}
          {initial ? (
            <View style={styles.modalAvatarRow}>
              <View style={[styles.modalAvatar, { backgroundColor: nameToColor(form.name || initial.name) }]}>
                <Text style={styles.modalAvatarText}>
                  {(form.name || initial.name).split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              </View>
            </View>
          ) : null}

          <InputField
            label="Full Name *"
            value={form.name}
            onChangeText={(t) => set("name", t)}
            placeholder="John Smith"
          />
          <InputField
            label="Email *"
            value={form.email}
            onChangeText={(t) => set("email", t)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="john@email.com"
          />

          {/* Password — only for new employees */}
          {!initial ? (
            <InputField
              label="Temporary Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Min. 8 characters"
            />
          ) : null}

          <InputField
            label="Phone"
            value={form.phone ?? ""}
            onChangeText={(t) => set("phone", t)}
            keyboardType="phone-pad"
            placeholder="555-0100"
          />
          <InputField
            label="Position / Title"
            value={form.position ?? ""}
            onChangeText={(t) => set("position", t)}
            placeholder="e.g. Painter, Lead Painter"
          />
          <InputField
            label="Hourly Rate ($) *"
            value={form.hourlyRate}
            onChangeText={(t) => set("hourlyRate", t)}
            keyboardType="numeric"
            placeholder="25"
          />
          <InputField
            label="Start Date"
            value={form.startDate ?? ""}
            onChangeText={(t) => set("startDate", t)}
            placeholder="YYYY-MM-DD"
          />

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={initial ? "Save Changes" : "Add Employee"}
            onPress={handleSave}
            loading={saving}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  topBarTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // List
  list: { padding: 16, gap: 12 },
  listEmpty: { flex: 1 },
  separator: { height: 1, marginHorizontal: 16 },

  // Stat strip
  statStrip: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statVal: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  statLabel: { fontSize: 10, fontWeight: "600" },

  // Employee row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  info: { flex: 1, gap: 4, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "700", flex: 1 },
  onSitePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  onSiteDot: { width: 5, height: 5, borderRadius: 3 },
  onSiteText: { fontSize: 10, fontWeight: "700" },
  idlePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  idleText: { fontSize: 10, fontWeight: "600" },
  position: { fontSize: 12, fontWeight: "500" },
  projectChips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 140,
  },
  chipText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  noProjects: { fontSize: 12, fontStyle: "italic" },

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
  modalAvatarRow: { alignItems: "center", paddingVertical: 4 },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: { color: "#fff", fontWeight: "800", fontSize: 22 },

  // Credentials view
  credIconRow: { alignItems: "center", paddingVertical: 8 },
  credIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  credTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 8 },
  credSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 6 },
  credCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  credRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  credFieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  credDivider: { height: 1 },
  credLabel: { fontSize: 11, fontWeight: "600", marginBottom: 3 },
  credValue: { fontSize: 15, fontWeight: "700" },
  infoNote: {
    flexDirection: "row",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoNoteText: { fontSize: 13, lineHeight: 19, flex: 1, fontWeight: "500" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },
});
