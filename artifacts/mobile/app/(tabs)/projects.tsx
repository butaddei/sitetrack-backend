import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

import { EmptyState } from "@/components/EmptyState";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Project, ProjectStatus, useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: ProjectStatus[] = ["pending", "in_progress", "completed", "on_hold"];
const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, employees, addProject, getProjectLaborCost, getProjectExpenses } = useData();
  const { showToast } = useToast();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">("all");
  const [showAdd, setShowAdd] = useState(false);

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const myProjects =
    user?.role === "admin" ? filtered : filtered.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Projects</Text>
        {user?.role === "admin" ? (
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.accent, paddingBottom: 16 }]}>
        <View style={[styles.searchInput, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchText}
            placeholder="Search projects..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 48, backgroundColor: colors.background }}
        contentContainerStyle={styles.filters}
      >
        {(["all", ...STATUS_OPTIONS] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterStatus === s ? colors.primary : colors.muted,
              },
            ]}
            onPress={() => setFilterStatus(s)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterStatus === s ? "#fff" : colors.mutedForeground },
              ]}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={myProjects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 24 },
          myProjects.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          projects.length === 0 ? (
            <EmptyState
              icon="folder"
              title="No projects yet"
              subtitle="Create your first project and assign a team to it."
              actionLabel="New Project"
              onAction={() => setShowAdd(true)}
            />
          ) : (
            <EmptyState
              icon="search"
              title="No matches"
              subtitle="Try a different search or filter"
            />
          )
        }
        renderItem={({ item }) => (
          <ProjectListCard
            project={item}
            labor={getProjectLaborCost(item.id)}
            expenses={getProjectExpenses(item.id)}
            employeeCount={item.assignedEmployeeIds.length}
            onPress={() => router.push({ pathname: "/project/[id]", params: { id: item.id } })}
          />
        )}
      />

      {showAdd ? (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await addProject(data);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("success", "Project created successfully");
            setShowAdd(false);
          }}
          employees={employees.filter((e) => e.role === "employee" && e.isActive)}
        />
      ) : null}
    </View>
  );
}

function ProjectListCard({
  project,
  labor,
  expenses,
  employeeCount,
  onPress,
}: {
  project: Project;
  labor: number;
  expenses: number;
  employeeCount: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const profit = project.totalValue - labor - expenses;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.cardAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
              {project.address}
            </Text>
          </View>
        </View>
        <StatusBadge status={project.status} />
      </View>

      <View style={styles.cardRow}>
        <View style={styles.cardStat}>
          <Feather name="dollar-sign" size={13} color={colors.success} />
          <Text style={[styles.cardStatLabel, { color: colors.mutedForeground }]}>
            Value: <Text style={{ color: colors.foreground, fontWeight: "700" }}>${project.totalValue.toLocaleString()}</Text>
          </Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="trending-up" size={13} color={profit >= 0 ? colors.success : colors.destructive} />
          <Text style={[styles.cardStatLabel, { color: colors.mutedForeground }]}>
            Profit: <Text style={{ color: profit >= 0 ? colors.success : colors.destructive, fontWeight: "700" }}>${profit.toLocaleString()}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.cardStat}>
          <Feather name="users" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {employeeCount} assigned
          </Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Due {new Date(project.expectedEndDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AddProjectModal({
  onClose,
  onSave,
  employees,
}: {
  onClose: () => void;
  onSave: (data: Omit<Project, "id" | "createdAt">) => Promise<void>;
  employees: any[];
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    name: "",
    address: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    totalValue: "",
    startDate: new Date().toISOString().split("T")[0],
    expectedEndDate: "",
    status: "pending" as ProjectStatus,
    paintColors: [] as string[],
    notes: "",
    photos: [],
    documents: [],
    assignedEmployeeIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name || !form.address || !form.totalValue) {
      setError("Name, address and value are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        totalValue: parseFloat(form.totalValue) || 0,
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to create project. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const toggleEmployee = (id: string) => {
    set(
      "assignedEmployeeIds",
      form.assignedEmployeeIds.includes(id)
        ? form.assignedEmployeeIds.filter((e) => e !== id)
        : [...form.assignedEmployeeIds, id]
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.modalHeader,
            { paddingTop: insets.top + 16, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Project</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <InputField label="Project Name *" value={form.name} onChangeText={(t) => set("name", t)} placeholder="e.g. Harbor View Residence" />
          <InputField label="Address *" value={form.address} onChangeText={(t) => set("address", t)} placeholder="Full street address" />
          <InputField label="Client Name" value={form.clientName} onChangeText={(t) => set("clientName", t)} placeholder="Client or company name" />
          <InputField label="Client Phone" value={form.clientPhone} onChangeText={(t) => set("clientPhone", t)} keyboardType="phone-pad" placeholder="555-0100" />
          <InputField label="Client Email" value={form.clientEmail} onChangeText={(t) => set("clientEmail", t)} keyboardType="email-address" autoCapitalize="none" placeholder="client@email.com" />
          <InputField label="Total Project Value ($) *" value={form.totalValue} onChangeText={(t) => set("totalValue", t)} keyboardType="numeric" placeholder="25000" />
          <InputField label="Start Date" value={form.startDate} onChangeText={(t) => set("startDate", t)} placeholder="YYYY-MM-DD" />
          <InputField label="Expected End Date" value={form.expectedEndDate} onChangeText={(t) => set("expectedEndDate", t)} placeholder="YYYY-MM-DD" />
          <InputField label="Notes" value={form.notes} onChangeText={(t) => set("notes", t)} placeholder="Any special instructions..." multiline style={{ minHeight: 80 }} />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Assign Employees
          </Text>
          {employees.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              style={[
                styles.empToggle,
                {
                  backgroundColor: form.assignedEmployeeIds.includes(emp.id)
                    ? colors.primary + "18"
                    : colors.muted,
                  borderColor: form.assignedEmployeeIds.includes(emp.id)
                    ? colors.primary
                    : "transparent",
                },
              ]}
              onPress={() => toggleEmployee(emp.id)}
            >
              <Text style={[styles.empName, { color: colors.foreground }]}>{emp.name}</Text>
              <Text style={[styles.empRate, { color: colors.mutedForeground }]}>
                ${emp.hourlyRate}/hr
              </Text>
              {form.assignedEmployeeIds.includes(emp.id) ? (
                <Feather name="check" size={16} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          ))}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorBoxText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}
          <PrimaryButton label="Create Project" onPress={handleSave} loading={saving} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  addBtn: { padding: 4 },
  searchBar: { paddingHorizontal: 16 },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchText: { flex: 1, color: "#fff", fontSize: 15 },
  filters: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardInfo: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 15, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  cardAddress: { fontSize: 12, flex: 1 },
  cardRow: { flexDirection: "row", gap: 16 },
  cardStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardStatLabel: { fontSize: 13 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 12 },
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
  sectionLabel: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  empToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  empName: { flex: 1, fontSize: 14, fontWeight: "600" },
  empRate: { fontSize: 13 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBoxText: { fontSize: 13, flex: 1, fontWeight: "500" },
});
