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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { Employee, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { employees, addEmployee, timeLogs, getEmployeeTotalHours } = useData();

  const [showAdd, setShowAdd] = useState(false);

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeEmployees = employees.filter((e) => e.role === "employee" && e.isActive);
  const activeLogs = timeLogs.filter((l) => !l.clockOut);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeEmployees}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 24 },
          activeEmployees.length === 0 && styles.emptyContainer,
        ]}
        ListHeaderComponent={
          <View style={styles.stats}>
            <StatBox
              label="Total Staff"
              value={activeEmployees.length.toString()}
              color={colors.primary}
            />
            <StatBox
              label="On Site"
              value={activeLogs.length.toString()}
              color={colors.success}
            />
            <StatBox
              label="Avg Rate"
              value={
                activeEmployees.length > 0
                  ? `$${(activeEmployees.reduce((s, e) => s + e.hourlyRate, 0) / activeEmployees.length).toFixed(0)}/h`
                  : "—"
              }
              color={colors.warning}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No employees yet"
            subtitle="Add your first team member to start tracking time and costs."
            actionLabel="Add First Employee"
            onAction={() => setShowAdd(true)}
          />
        }
        renderItem={({ item }) => (
          <EmployeeCard
            employee={item}
            isOnSite={activeLogs.some((l) => l.employeeId === item.id)}
            totalHours={getEmployeeTotalHours(item.id)}
          />
        )}
      />

      {showAdd ? (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await addEmployee(data);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowAdd(false);
          }}
        />
      ) : null}
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statBox, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function EmployeeCard({
  employee,
  isOnSite,
  totalHours,
}: {
  employee: Employee;
  isOnSite: boolean;
  totalHours: number;
}) {
  const colors = useColors();
  const initials = employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const laborCost = totalHours * employee.hourlyRate;

  return (
    <View style={[styles.empCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.empAvatar, { backgroundColor: colors.accent }]}>
        <Text style={styles.empInitials}>{initials}</Text>
      </View>
      <View style={styles.empInfo}>
        <View style={styles.empNameRow}>
          <Text style={[styles.empName, { color: colors.foreground }]}>{employee.name}</Text>
          {isOnSite ? (
            <View style={[styles.activePill, { backgroundColor: colors.success + "20" }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.activeText, { color: colors.success }]}>On Site</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.empPosition, { color: colors.mutedForeground }]}>
          {employee.position}
        </Text>
        <View style={styles.empMeta}>
          <Text style={[styles.empMetaText, { color: colors.mutedForeground }]}>
            ${employee.hourlyRate}/hr
          </Text>
          <Text style={[styles.empMetaDot, { color: colors.border }]}>•</Text>
          <Text style={[styles.empMetaText, { color: colors.mutedForeground }]}>
            {totalHours.toFixed(1)}h total
          </Text>
          <Text style={[styles.empMetaDot, { color: colors.border }]}>•</Text>
          <Text style={[styles.empMetaText, { color: colors.mutedForeground }]}>
            ${laborCost.toFixed(0)} earned
          </Text>
        </View>
      </View>
    </View>
  );
}

function AddEmployeeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<Employee, "id">) => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    hourlyRate: "",
    startDate: new Date().toISOString().split("T")[0],
    role: "employee" as "admin" | "employee",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name || !form.email || !form.hourlyRate) {
      setError("Name, email and hourly rate are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, hourlyRate: parseFloat(form.hourlyRate) || 0 });
    } finally {
      setSaving(false);
    }
  }

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
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Employee</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <InputField label="Full Name *" value={form.name} onChangeText={(t) => set("name", t)} placeholder="John Smith" />
          <InputField label="Email *" value={form.email} onChangeText={(t) => set("email", t)} keyboardType="email-address" autoCapitalize="none" placeholder="john@email.com" />
          <InputField label="Phone" value={form.phone} onChangeText={(t) => set("phone", t)} keyboardType="phone-pad" placeholder="555-0100" />
          <InputField label="Position / Title" value={form.position} onChangeText={(t) => set("position", t)} placeholder="e.g. Painter, Lead Painter" />
          <InputField label="Hourly Rate ($) *" value={form.hourlyRate} onChangeText={(t) => set("hourlyRate", t)} keyboardType="numeric" placeholder="25" />
          <InputField label="Start Date" value={form.startDate} onChangeText={(t) => set("startDate", t)} placeholder="YYYY-MM-DD" />
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Default password: employee123
          </Text>
          {error ? (
            <Text style={[{ color: colors.destructive, fontSize: 13 }]}>{error}</Text>
          ) : null}
          <PrimaryButton label="Add Employee" onPress={handleSave} loading={saving} />
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
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 6 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  empCard: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  empAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  empInitials: { color: "#fff", fontWeight: "700", fontSize: 16 },
  empInfo: { flex: 1, gap: 3 },
  empNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  empName: { fontSize: 15, fontWeight: "700" },
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
  empPosition: { fontSize: 13 },
  empMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  empMetaText: { fontSize: 12 },
  empMetaDot: { fontSize: 12 },
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
  note: { fontSize: 12, fontStyle: "italic" },
});
