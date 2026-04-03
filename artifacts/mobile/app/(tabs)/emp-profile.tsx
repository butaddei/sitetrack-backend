import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const {
    employees,
    projects,
    timeLogs,
    getActiveTimeLog,
    getEmployeeDailyHours,
    getEmployeeWeeklyHours,
    getEmployeeTotalHours,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const employee = employees.find((e) => e.id === user?.id);
  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const myProjects = projects.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));
  const activeProject = projects.find((p) => p.id === activeLog?.projectId);

  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;
  const weeklyHours = user ? getEmployeeWeeklyHours(user.id) : 0;
  const totalHours = user ? getEmployeeTotalHours(user.id) : 0;

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const myLogs = timeLogs
    .filter((l) => l.employeeId === user?.id && l.clockOut)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const completedSessions = myLogs.length;

  // Recent sessions (last 5)
  const recentLogs = myLogs.slice(0, 5);

  const formatDate = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return new Date(dateStr + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const durationLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
        },
      },
    ]);
  };

  const memberSince = employee?.startDate
    ? new Date(employee.startDate + "T12:00:00").toLocaleDateString([], { year: "numeric", month: "long" })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.accent }]}>
          <View style={[styles.avatarRing, { borderColor: colors.primary + "60" }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profilePosition}>{employee?.position ?? "Employee"}</Text>

          {/* Status indicator */}
          {activeLog ? (
            <View style={[styles.statusChip, { backgroundColor: colors.success + "25" }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                Working on {activeProject?.name ?? "a project"}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <View style={[styles.statusDot, { backgroundColor: "rgba(255,255,255,0.35)" }]} />
              <Text style={[styles.statusText, { color: "rgba(255,255,255,0.5)" }]}>Not clocked in</Text>
            </View>
          )}
        </View>

        {/* Info rows */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {employee?.email ? (
            <InfoRow icon="mail" label="Email" value={employee.email} />
          ) : null}
          {employee?.phone ? (
            <InfoRow icon="phone" label="Phone" value={employee.phone} divider />
          ) : null}
          {memberSince ? (
            <InfoRow icon="calendar" label="Member since" value={memberSince} divider />
          ) : null}
          <InfoRow icon="folder" label="Assigned projects" value={`${myProjects.length} project${myProjects.length !== 1 ? "s" : ""}`} divider />
        </View>

        {/* Hours stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Work Summary</Text>
          <View style={styles.statsGrid}>
            <StatBox label="Today" value={dailyHours.toFixed(1) + "h"} highlight={dailyHours > 0} />
            <StatBox label="This Week" value={weeklyHours.toFixed(1) + "h"} />
            <StatBox label="All Time" value={totalHours.toFixed(0) + "h"} />
            <StatBox label="Sessions" value={completedSessions.toString()} />
          </View>
        </View>

        {/* Recent sessions */}
        {recentLogs.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Sessions</Text>
            {recentLogs.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId);
              return (
                <View
                  key={log.id}
                  style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.sessionDot, { backgroundColor: colors.success }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionProject, { color: colors.foreground }]} numberOfLines={1}>
                      {proj?.name ?? "Unknown"}
                    </Text>
                    <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>
                      {formatDate(log.date)} · {formatTime(log.clockIn)} — {formatTime(log.clockOut!)}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDur, { color: colors.foreground }]}>
                    {durationLabel(log.totalMinutes ?? 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Sign out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: colors.destructive + "50" }]}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Feather name="log-out" size={17} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  divider,
}: {
  icon: string;
  label: string;
  value: string;
  divider?: boolean;
}) {
  const colors = useColors();
  return (
    <>
      {divider ? <View style={[styles.infoDivider, { backgroundColor: colors.border }]} /> : null}
      <View style={styles.infoRow}>
        <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
          <Feather name={icon as any} size={14} color={colors.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
        </View>
      </View>
    </>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: highlight ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  scroll: { gap: 0 },
  profileCard: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    gap: 6,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  profileName: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profilePosition: { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "500" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, marginTop: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  infoCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", marginTop: 1 },
  infoDivider: { height: 1, marginVertical: 2 },
  statsSection: { paddingHorizontal: 16, paddingTop: 24, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  recentSection: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionInfo: { flex: 1 },
  sessionProject: { fontSize: 14, fontWeight: "600" },
  sessionDate: { fontSize: 12, marginTop: 2 },
  sessionDur: { fontSize: 14, fontWeight: "700" },
  signOutSection: { paddingHorizontal: 16, paddingTop: 32 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { fontSize: 16, fontWeight: "700" },
});
