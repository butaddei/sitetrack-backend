import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
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
import { Employee, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

type FilterTab = "all" | "active" | "inactive";

/* ═══════════════════════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════════════════════ */

export default function EmployeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    employees, projects, timeLogs,
    addEmployee, updateEmployee, deleteEmployee,
    getEmployeeTotalHours, getSessionLaborCost,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [filter, setFilter] = useState<FilterTab>("active");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const staff = employees.filter((e) => e.role === "employee");
  const activeCount = staff.filter((e) => e.isActive).length;
  const onSiteCount = timeLogs.filter((l) => !l.clockOut).length;

  const avgRate = staff.length > 0
    ? staff.filter((e) => e.isActive).reduce((s, e) => s + e.hourlyRate, 0) / Math.max(activeCount, 1)
    : 0;

  const totalLaborCost = timeLogs
    .filter((l) => l.totalMinutes)
    .reduce((s, l) => s + getSessionLaborCost(l), 0);

  const filtered = staff.filter((e) =>
    filter === "all" ? true : filter === "active" ? e.isActive : !e.isActive
  );

  const getEmpStats = (emp: Employee) => {
    const empLogs = timeLogs.filter((l) => l.employeeId === emp.id);
    const completedLogs = empLogs.filter((l) => l.totalMinutes);
    const totalHours = completedLogs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);
    const totalCost = completedLogs.reduce((s, l) => s + getSessionLaborCost(l), 0);
    const projectIds = [...new Set(completedLogs.map((l) => l.projectId))];
    const isOnSite = empLogs.some((l) => !l.clockOut);
    return { totalHours, totalCost, projectCount: projectIds.length, isOnSite };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.addBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="user-plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary stats ── */}
      <View style={[styles.summaryBar, { backgroundColor: colors.accent }]}>
        <SummaryCell label="Total Staff" value={staff.length.toString()} icon="users" color="#fff" />
        <SummaryCell label="Active" value={activeCount.toString()} icon="check-circle" color="#4ade80" />
        <SummaryCell label="On Site" value={onSiteCount.toString()} icon="radio" color={colors.primary} />
        <SummaryCell label="Avg Rate" value={`$${avgRate.toFixed(0)}/h`} icon="dollar-sign" color={colors.warning} />
        <SummaryCell label="Labor Paid" value={`$${(totalLaborCost / 1000).toFixed(1)}k`} icon="trending-up" color="#f87171" />
      </View>

      {/* ── Filter tabs ── */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["active", "all", "inactive"] as FilterTab[]).map((f) => {
          const labels: Record<FilterTab, string> = { active: "Active", all: "All", inactive: "Inactive" };
          const counts: Record<FilterTab, number> = {
            active: staff.filter((e) => e.isActive).length,
            all: staff.length,
            inactive: staff.filter((e) => !e.isActive).length,
          };
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, { borderBottomColor: filter === f ? colors.primary : "transparent", borderBottomWidth: 2 }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, { color: filter === f ? colors.primary : colors.mutedForeground }]}>
                {labels[f]}
              </Text>
              <View style={[styles.filterCount, { backgroundColor: filter === f ? colors.primary + "18" : colors.muted }]}>
                <Text style={[styles.filterCountText, { color: filter === f ? colors.primary : colors.mutedForeground }]}>
                  {counts[f]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No employees</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              {filter === "inactive" ? "No inactive employees." : "Tap 'Add' to create your first employee."}
            </Text>
          </View>
        ) : null}

        {filtered.map((emp) => {
          const { totalHours, totalCost, projectCount, isOnSite } = getEmpStats(emp);
          return (
            <TouchableOpacity
              key={emp.id}
              style={[
                styles.empCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isOnSite ? colors.primary + "50" : colors.border,
                  opacity: emp.isActive ? 1 : 0.65,
                },
              ]}
              onPress={() => setSelectedEmployee(emp)}
              activeOpacity={0.75}
            >
              {/* Avatar + name row */}
              <View style={styles.empCardTop}>
                <View style={[styles.empAvatar, { backgroundColor: emp.isActive ? colors.accent : colors.muted }]}>
                  <Text style={[styles.empInitials, { color: emp.isActive ? "#fff" : colors.mutedForeground }]}>
                    {emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.empCardMain}>
                  <View style={styles.empNameRow}>
                    <Text style={[styles.empName, { color: colors.foreground }]}>{emp.name}</Text>
                    {isOnSite ? (
                      <View style={[styles.onSitePill, { backgroundColor: colors.primary + "18" }]}>
                        <View style={[styles.onSiteDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.onSiteText, { color: colors.primary }]}>On Site</Text>
                      </View>
                    ) : null}
                    {!emp.isActive ? (
                      <View style={[styles.inactivePill, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.inactiveText, { color: colors.mutedForeground }]}>Inactive</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.empPosition, { color: colors.mutedForeground }]}>
                    {emp.position} · ${emp.hourlyRate}/hr
                  </Text>
                  <Text style={[styles.empContact, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {emp.email}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </View>

              {/* Stats row */}
              <View style={[styles.empStatsRow, { borderTopColor: colors.border }]}>
                <EmpStat icon="clock" label="Hours" value={`${totalHours.toFixed(1)}h`} color={colors.primary} />
                <EmpStat icon="dollar-sign" label="Labor Cost" value={`$${totalCost.toFixed(0)}`} color={colors.destructive} />
                <EmpStat icon="briefcase" label="Projects" value={projectCount.toString()} color={colors.warning} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Add employee modal ── */}
      {showAdd ? (
        <EmployeeFormModal
          title="New Employee"
          projects={projects}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await addEmployee(data);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowAdd(false);
          }}
        />
      ) : null}

      {/* ── Employee detail / edit modal ── */}
      {selectedEmployee ? (
        <EmployeeDetailModal
          employee={selectedEmployee}
          projects={projects}
          timeLogs={timeLogs}
          employees={employees}
          getSessionLaborCost={getSessionLaborCost}
          onClose={() => setSelectedEmployee(null)}
          onSave={async (updates) => {
            await updateEmployee(selectedEmployee.id, updates);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedEmployee(null);
          }}
          onDelete={async () => {
            Alert.alert(
              "Remove Employee",
              `Remove ${selectedEmployee.name} from the system? This cannot be undone.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove", style: "destructive",
                  onPress: async () => {
                    await deleteEmployee(selectedEmployee.id);
                    setSelectedEmployee(null);
                  },
                },
              ]
            );
          }}
          onToggleActive={async () => {
            await updateEmployee(selectedEmployee.id, { isActive: !selectedEmployee.isActive });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedEmployee(null);
          }}
        />
      ) : null}
    </View>
  );
}

function SummaryCell({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.summaryCell}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.summaryCellValue, { color }]}>{value}</Text>
      <Text style={styles.summaryCellLabel}>{label}</Text>
    </View>
  );
}

function EmpStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.empStatCell}>
      <Feather name={icon as any} size={12} color={color} />
      <Text style={[styles.empStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.empStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMPLOYEE DETAIL MODAL
═══════════════════════════════════════════════════════════════════ */

function EmployeeDetailModal({
  employee, projects, timeLogs, employees, getSessionLaborCost,
  onClose, onSave, onDelete, onToggleActive,
}: {
  employee: Employee;
  projects: any[];
  timeLogs: any[];
  employees: any[];
  getSessionLaborCost: (log: any) => number;
  onClose: () => void;
  onSave: (updates: Partial<Employee>) => Promise<void>;
  onDelete: () => void;
  onToggleActive: () => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    position: employee.position,
    hourlyRate: employee.hourlyRate.toString(),
    startDate: employee.startDate,
    role: employee.role as "admin" | "employee",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const [formError, setFormError] = useState("");

  // Per-project stats
  const completedLogs = timeLogs.filter((l: any) => l.employeeId === employee.id && l.totalMinutes);
  const totalHours = completedLogs.reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);
  const totalCost = completedLogs.reduce((s: number, l: any) => s + getSessionLaborCost(l), 0);

  const projectStats = projects
    .filter((p: any) => p.assignedEmployeeIds.includes(employee.id))
    .map((p: any) => {
      const logs = completedLogs.filter((l: any) => l.projectId === p.id);
      const hrs = logs.reduce((s: number, l: any) => s + l.totalMinutes / 60, 0);
      const cost = logs.reduce((s: number, l: any) => s + getSessionLaborCost(l), 0);
      const sessions = logs.length;
      return { project: p, hrs, cost, sessions };
    });

  // Project assignment state
  const [assignedIds, setAssignedIds] = useState<string[]>(
    projects.filter((p: any) => p.assignedEmployeeIds.includes(employee.id)).map((p: any) => p.id)
  );
  const [showProjectAssign, setShowProjectAssign] = useState(false);

  const toggleProject = (projId: string) => {
    setAssignedIds((ids) => ids.includes(projId) ? ids.filter((x) => x !== projId) : [...ids, projId]);
  };

  const handleSaveEdit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required"); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        startDate: form.startDate,
        role: form.role,
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isOnSite = timeLogs.some((l: any) => l.employeeId === employee.id && !l.clockOut);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        {/* ── Header ── */}
        <View style={[styles.detailHeader, { paddingTop: insets.top + 16, backgroundColor: colors.accent, borderBottomColor: "transparent" }]}>
          <TouchableOpacity onPress={onClose} style={styles.detailHeaderBtn}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>{editing ? "Edit Employee" : "Employee Profile"}</Text>
          <TouchableOpacity onPress={() => { setEditing(!editing); setFormError(""); }} style={styles.detailHeaderBtn}>
            <Feather name={editing ? "eye" : "edit-2"} size={18} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* ── Profile hero ── */}
        <View style={[styles.profileHero, { backgroundColor: colors.accent }]}>
          <View style={[styles.profileAvatar, { backgroundColor: employee.isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)" }]}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </View>
          <View style={styles.profileHeroInfo}>
            <Text style={styles.profileName}>{employee.name}</Text>
            <Text style={styles.profilePosition}>{employee.position || "—"}</Text>
            <View style={styles.profileBadges}>
              <View style={[styles.roleBadge, { backgroundColor: employee.role === "admin" ? colors.primary + "30" : "rgba(255,255,255,0.15)" }]}>
                <Text style={styles.roleBadgeText}>{employee.role === "admin" ? "Admin" : "Employee"}</Text>
              </View>
              {isOnSite ? (
                <View style={[styles.onSiteHeroPill, { backgroundColor: "#4ade8030" }]}>
                  <View style={[styles.onSiteDot, { backgroundColor: "#4ade80" }]} />
                  <Text style={[styles.onSiteHeroText, { color: "#4ade80" }]}>On Site</Text>
                </View>
              ) : null}
              {!employee.isActive ? (
                <View style={[styles.inactiveHeroPill, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                  <Text style={styles.inactiveHeroText}>Inactive</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.profileRate}>
            <Text style={styles.profileRateValue}>${employee.hourlyRate}</Text>
            <Text style={styles.profileRateLabel}>/hr</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.detailContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {editing ? (
            /* ══════════ EDIT MODE ══════════ */
            <>
              <SectionCard title="Personal Info" icon="user">
                <InputField label="Full Name *" value={form.name} onChangeText={(t) => set("name", t)} placeholder="Full name" />
                <InputField label="Email *" value={form.email} onChangeText={(t) => set("email", t)} keyboardType="email-address" autoCapitalize="none" placeholder="email@example.com" />
                <InputField label="Phone" value={form.phone} onChangeText={(t) => set("phone", t)} keyboardType="phone-pad" placeholder="555-0100" />
                <InputField label="Position / Title" value={form.position} onChangeText={(t) => set("position", t)} placeholder="e.g. Lead Painter" />
              </SectionCard>

              <SectionCard title="Employment" icon="briefcase">
                <InputField label="Hourly Rate ($)" value={form.hourlyRate} onChangeText={(t) => set("hourlyRate", t)} keyboardType="numeric" placeholder="25" />
                <InputField label="Start Date" value={form.startDate} onChangeText={(t) => set("startDate", t)} placeholder="YYYY-MM-DD" />

                <View style={styles.fieldWrap}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role</Text>
                  <View style={styles.roleToggle}>
                    {(["employee", "admin"] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleToggleBtn, { backgroundColor: form.role === r ? colors.primary : colors.muted }]}
                        onPress={() => set("role", r)}
                      >
                        <Text style={[styles.roleToggleBtnText, { color: form.role === r ? "#fff" : colors.mutedForeground }]}>
                          {r === "employee" ? "Employee" : "Admin"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </SectionCard>

              {formError ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
                </View>
              ) : null}

              <PrimaryButton label={saving ? "Saving…" : "Save Changes"} onPress={handleSaveEdit} loading={saving} />

              <TouchableOpacity
                style={[styles.toggleActiveBtn, { backgroundColor: employee.isActive ? colors.destructive + "12" : colors.success + "12", borderColor: employee.isActive ? colors.destructive + "30" : colors.success + "30" }]}
                onPress={onToggleActive}
              >
                <Feather name={employee.isActive ? "user-x" : "user-check"} size={15} color={employee.isActive ? colors.destructive : colors.success} />
                <Text style={[styles.toggleActiveBtnText, { color: employee.isActive ? colors.destructive : colors.success }]}>
                  {employee.isActive ? "Set as Inactive" : "Reactivate Employee"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.destructive + "40" }]} onPress={onDelete}>
                <Feather name="trash-2" size={15} color={colors.destructive} />
                <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Remove Employee</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ══════════ VIEW MODE ══════════ */
            <>
              {/* Contact info */}
              <SectionCard title="Contact Info" icon="user">
                <InfoRow icon="mail" label="Email" value={employee.email || "—"} />
                <InfoRow icon="phone" label="Phone" value={employee.phone || "—"} />
                <InfoRow icon="briefcase" label="Position" value={employee.position || "—"} />
                <InfoRow icon="calendar" label="Start Date" value={employee.startDate ? new Date(employee.startDate).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }) : "—"} />
              </SectionCard>

              {/* Performance stats */}
              <View style={[styles.statsCard, { backgroundColor: colors.accent }]}>
                <Text style={styles.statsCardTitle}>Performance Summary</Text>
                <View style={styles.statsCardRow}>
                  <View style={styles.statsCardCell}>
                    <Text style={styles.statsCardValue}>{totalHours.toFixed(1)}h</Text>
                    <Text style={styles.statsCardLabel}>Total Hours</Text>
                  </View>
                  <View style={[styles.statsCardDivider]} />
                  <View style={styles.statsCardCell}>
                    <Text style={[styles.statsCardValue, { color: "#f87171" }]}>${totalCost.toFixed(0)}</Text>
                    <Text style={styles.statsCardLabel}>Labor Cost</Text>
                  </View>
                  <View style={[styles.statsCardDivider]} />
                  <View style={styles.statsCardCell}>
                    <Text style={styles.statsCardValue}>{projectStats.length}</Text>
                    <Text style={styles.statsCardLabel}>Projects</Text>
                  </View>
                </View>
                <View style={[styles.statsCardSep, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
                <View style={styles.statsCardRateRow}>
                  <Text style={styles.statsCardRateLabel}>Hourly Rate</Text>
                  <Text style={styles.statsCardRateValue}>${employee.hourlyRate}/hr</Text>
                </View>
              </View>

              {/* Project assignment */}
              <SectionCard
                title="Project Assignments"
                icon="briefcase"
                action={
                  <TouchableOpacity
                    style={[styles.assignBtn, { backgroundColor: colors.primary + "18" }]}
                    onPress={() => setShowProjectAssign((v) => !v)}
                  >
                    <Feather name={showProjectAssign ? "chevron-up" : "edit-2"} size={13} color={colors.primary} />
                    <Text style={[styles.assignBtnText, { color: colors.primary }]}>
                      {showProjectAssign ? "Done" : "Manage"}
                    </Text>
                  </TouchableOpacity>
                }
              >
                {showProjectAssign ? (
                  /* Assignment checkboxes */
                  projects.map((p: any) => {
                    const isAssigned = assignedIds.includes(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.projectAssignRow, { borderColor: isAssigned ? colors.primary + "50" : colors.border, backgroundColor: isAssigned ? colors.primary + "08" : colors.surface }]}
                        onPress={() => {
                          toggleProject(p.id);
                          // Immediately persist: update this employee's presence in assignedEmployeeIds of each project
                          // We'll do this via a useData call but we need updateProject — pass through onSave differently
                          // For now, toggle locally and save via done button
                        }}
                      >
                        <View style={[styles.assignCheck, { backgroundColor: isAssigned ? colors.primary : colors.muted, borderColor: isAssigned ? colors.primary : colors.border }]}>
                          {isAssigned ? <Feather name="check" size={11} color="#fff" /> : null}
                        </View>
                        <View style={styles.assignProjInfo}>
                          <Text style={[styles.assignProjName, { color: colors.foreground }]}>{p.name}</Text>
                          <Text style={[styles.assignProjMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{p.address}</Text>
                        </View>
                        <View style={[styles.assignStatusDot, { backgroundColor: p.status === "in_progress" ? colors.primary : p.status === "completed" ? colors.success : colors.warning }]} />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  /* Read-only project list */
                  projectStats.length === 0 ? (
                    <Text style={[styles.noProjectsHint, { color: colors.mutedForeground }]}>
                      Not assigned to any projects yet. Tap "Manage" to assign.
                    </Text>
                  ) : (
                    projectStats.map(({ project: p, hrs, cost, sessions }) => (
                      <View key={p.id} style={[styles.projectStatRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.projectStatDot, { backgroundColor: p.status === "in_progress" ? colors.primary : p.status === "completed" ? colors.success : colors.warning }]} />
                        <View style={styles.projectStatInfo}>
                          <Text style={[styles.projectStatName, { color: colors.foreground }]}>{p.name}</Text>
                          <Text style={[styles.projectStatMeta, { color: colors.mutedForeground }]}>
                            {hrs.toFixed(1)}h · {sessions} session{sessions !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <Text style={[styles.projectStatCost, { color: colors.destructive }]}>${cost.toFixed(0)}</Text>
                      </View>
                    ))
                  )
                )}

                {showProjectAssign ? (
                  <SaveAssignmentsButton
                    assignedIds={assignedIds}
                    employeeId={employee.id}
                    projects={projects}
                    onDone={() => setShowProjectAssign(false)}
                  />
                ) : null}
              </SectionCard>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Separate component so it can call useData for updateProject */
function SaveAssignmentsButton({ assignedIds, employeeId, projects, onDone }: {
  assignedIds: string[];
  employeeId: string;
  projects: any[];
  onDone: () => void;
}) {
  const colors = useColors();
  const { updateProject } = useData();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        projects.map((p: any) => {
          const current: string[] = p.assignedEmployeeIds;
          const shouldBeAssigned = assignedIds.includes(p.id);
          const isCurrentlyAssigned = current.includes(employeeId);
          if (shouldBeAssigned && !isCurrentlyAssigned) {
            return updateProject(p.id, { assignedEmployeeIds: [...current, employeeId] });
          } else if (!shouldBeAssigned && isCurrentlyAssigned) {
            return updateProject(p.id, { assignedEmployeeIds: current.filter((x: string) => x !== employeeId) });
          }
          return Promise.resolve();
        })
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.saveAssignBtn, { backgroundColor: colors.primary }]}
      onPress={handleSave}
      disabled={saving}
    >
      <Feather name="check" size={15} color="#fff" />
      <Text style={styles.saveAssignText}>{saving ? "Saving…" : "Save Assignments"}</Text>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ADD / EDIT EMPLOYEE FORM MODAL
═══════════════════════════════════════════════════════════════════ */

function EmployeeFormModal({ title, projects, initial, onClose, onSave }: {
  title: string;
  projects: any[];
  initial?: Partial<Employee>;
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
    hourlyRate: initial?.hourlyRate?.toString() ?? "",
    startDate: initial?.startDate ?? new Date().toISOString().split("T")[0],
    role: (initial?.role ?? "employee") as "admin" | "employee",
    isActive: initial?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required"); return; }
    if (!form.hourlyRate || isNaN(parseFloat(form.hourlyRate))) { setError("Valid hourly rate is required"); return; }
    setSaving(true);
    try {
      await onSave({ ...form, hourlyRate: parseFloat(form.hourlyRate) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SectionCard title="Personal Info" icon="user">
            <InputField label="Full Name *" value={form.name} onChangeText={(t) => set("name", t)} placeholder="John Smith" autoFocus />
            <InputField label="Email *" value={form.email} onChangeText={(t) => set("email", t)} keyboardType="email-address" autoCapitalize="none" placeholder="john@example.com" />
            <InputField label="Phone" value={form.phone} onChangeText={(t) => set("phone", t)} keyboardType="phone-pad" placeholder="555-0100" />
            <InputField label="Position / Title" value={form.position} onChangeText={(t) => set("position", t)} placeholder="e.g. Lead Painter" />
          </SectionCard>

          <SectionCard title="Employment" icon="briefcase">
            <InputField label="Hourly Rate ($) *" value={form.hourlyRate} onChangeText={(t) => set("hourlyRate", t)} keyboardType="numeric" placeholder="25" />
            <InputField label="Start Date" value={form.startDate} onChangeText={(t) => set("startDate", t)} placeholder="YYYY-MM-DD" />

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role</Text>
              <View style={styles.roleToggle}>
                {(["employee", "admin"] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleToggleBtn, { backgroundColor: form.role === r ? colors.primary : colors.muted }]}
                    onPress={() => set("role", r)}
                  >
                    <Text style={[styles.roleToggleBtnText, { color: form.role === r ? "#fff" : colors.mutedForeground }]}>
                      {r === "employee" ? "Employee" : "Admin"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SectionCard>

          <View style={[styles.defaultPassNote, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Feather name="key" size={13} color={colors.primary} />
            <Text style={[styles.defaultPassText, { color: colors.primary }]}>
              Default login password: <Text style={{ fontWeight: "800" }}>employee123</Text>
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton label={saving ? "Creating…" : "Create Employee"} onPress={handleSave} loading={saving} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── Shared helpers ─── */

function SectionCard({ title, icon, action, children }: {
  title: string; icon: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionCardTitleRow}>
          <Feather name={icon as any} size={14} color={colors.primary} />
          <Text style={[styles.sectionCardTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        {action ?? null}
      </View>
      <View style={styles.sectionCardBody}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={13} color={colors.mutedForeground} />
      </View>
      <View style={styles.infoRowText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Summary bar
  summaryBar: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 14, gap: 0 },
  summaryCell: { flex: 1, alignItems: "center", gap: 3 },
  summaryCellValue: { fontSize: 13, fontWeight: "800" },
  summaryCellLabel: { fontSize: 9, fontWeight: "500", color: "rgba(255,255,255,0.55)", textAlign: "center" },

  // Filter tabs
  filterBar: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 6 },
  filterTabText: { fontSize: 13, fontWeight: "600" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 100 },
  filterCountText: { fontSize: 11, fontWeight: "700" },

  // List
  list: { padding: 14, gap: 12 },
  emptyCard: { borderRadius: 16, padding: 32, borderWidth: 1, alignItems: "center", gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyHint: { fontSize: 13, textAlign: "center" },

  // Employee card
  empCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  empCardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 12 },
  empAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empInitials: { fontWeight: "800", fontSize: 16 },
  empCardMain: { flex: 1, gap: 2 },
  empNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  empName: { fontSize: 15, fontWeight: "700" },
  onSitePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  onSiteDot: { width: 6, height: 6, borderRadius: 3 },
  onSiteText: { fontSize: 10, fontWeight: "700" },
  inactivePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  inactiveText: { fontSize: 10, fontWeight: "600" },
  empPosition: { fontSize: 12, fontWeight: "500" },
  empContact: { fontSize: 11 },
  empStatsRow: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 10 },
  empStatCell: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  empStatValue: { fontSize: 13, fontWeight: "700" },
  empStatLabel: { fontSize: 11 },

  // Detail modal
  modal: { flex: 1 },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 0 },
  detailHeaderBtn: { padding: 6, minWidth: 36, alignItems: "center" },
  detailHeaderTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  profileHero: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  profileInitials: { color: "#fff", fontWeight: "800", fontSize: 20 },
  profileHeroInfo: { flex: 1, gap: 4 },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  profilePosition: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  profileBadges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  roleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  onSiteHeroPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  onSiteHeroText: { fontSize: 11, fontWeight: "700" },
  inactiveHeroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  inactiveHeroText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "600" },
  profileRate: { alignItems: "center" },
  profileRateValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  profileRateLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12 },

  detailContent: { padding: 16, gap: 14, paddingBottom: 40 },

  // Stats card
  statsCard: { borderRadius: 16, padding: 20 },
  statsCardTitle: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  statsCardRow: { flexDirection: "row" },
  statsCardCell: { flex: 1, alignItems: "center", gap: 4 },
  statsCardDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 2 },
  statsCardValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statsCardLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "500" },
  statsCardSep: { height: 1, marginVertical: 14 },
  statsCardRateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsCardRateLabel: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  statsCardRateValue: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Section card
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "transparent" },
  sectionCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionCardTitle: { fontSize: 14, fontWeight: "700" },
  sectionCardBody: { padding: 16, gap: 12 },

  // Info rows
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoRowText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600" },

  // Project stats rows
  projectStatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  projectStatDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  projectStatInfo: { flex: 1 },
  projectStatName: { fontSize: 13, fontWeight: "600" },
  projectStatMeta: { fontSize: 11, marginTop: 1 },
  projectStatCost: { fontSize: 14, fontWeight: "800" },
  noProjectsHint: { fontSize: 13, lineHeight: 19 },

  // Project assignment rows
  assignBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  assignBtnText: { fontSize: 12, fontWeight: "700" },
  projectAssignRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 10, borderWidth: 1 },
  assignCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  assignProjInfo: { flex: 1 },
  assignProjName: { fontSize: 13, fontWeight: "600" },
  assignProjMeta: { fontSize: 11, marginTop: 1 },
  assignStatusDot: { width: 8, height: 8, borderRadius: 4 },
  saveAssignBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 10, marginTop: 4 },
  saveAssignText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Edit form fields
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  roleToggle: { flexDirection: "row", gap: 10 },
  roleToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  roleToggleBtnText: { fontSize: 13, fontWeight: "700" },

  // Action buttons
  toggleActiveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  toggleActiveBtnText: { fontSize: 14, fontWeight: "700" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  deleteBtnText: { fontSize: 14, fontWeight: "600" },

  // Modal shared
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 16, gap: 16, paddingBottom: 40 },

  // Feedback
  defaultPassNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  defaultPassText: { fontSize: 13, flex: 1 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, flex: 1 },
});
