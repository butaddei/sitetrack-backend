import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const router = useRouter();
  const {
    projects,
    timeLogs,
    getActiveTimeLog,
    getEmployeeDailyHours,
    getEmployeeWeeklyHours,
    isLoading,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const activeProject = projects.find((p) => p.id === activeLog?.projectId);
  const myProjects = projects.filter((p) =>
    p.assignedEmployeeIds.includes(user?.id ?? "")
  );

  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;
  const weeklyHours = user ? getEmployeeWeeklyHours(user.id) : 0;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  // Recent finished sessions (last 7)
  const recentLogs = timeLogs
    .filter((l) => l.employeeId === user?.id && !!l.clockOut)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
    .slice(0, 7);

  const fmtDate = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return new Date(dateStr + "T12:00:00").toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const durLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign back in to use the app.", [
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

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}
      >
        {/* ── Hero gradient header ── */}
        <LinearGradient
          colors={[colors.accent, colors.primary + "99"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 12 }]}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>My Profile</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.heroBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                onPress={() => router.push("/profile-settings")}
                hitSlop={8}
              >
                <Feather name="edit-2" size={15} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                onPress={handleSignOut}
                hitSlop={8}
              >
                <Feather name="log-out" size={15} color="rgba(255,255,255,0.85)" />
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Identity */}
          <View style={styles.identity}>
            <View style={[styles.avatarRing, { borderColor: "rgba(255,255,255,0.4)" }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.idInfo}>
              <Text style={styles.idName}>{user?.name}</Text>
              <Text style={styles.idPosition}>{user?.position ?? "Field Employee"}</Text>
            </View>
            {/* Live status */}
            {activeLog ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.success + "25" }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.statusText, { color: colors.success }]} numberOfLines={1}>
                  {activeProject?.name ?? "Working"}
                </Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.09)" }]}>
                <View style={[styles.statusDot, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
                <Text style={[styles.statusText, { color: "rgba(255,255,255,0.45)" }]}>
                  Not clocked in
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Hours today + this week ── */}
        <View style={styles.hoursRow}>
          <View style={[styles.hoursCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.hoursNum, { color: dailyHours > 0 ? colors.primary : colors.mutedForeground }]}>
              {dailyHours.toFixed(1)}h
            </Text>
            <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>Today</Text>
          </View>
          <View style={[styles.hoursCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.hoursNum, { color: colors.foreground }]}>
              {weeklyHours.toFixed(1)}h
            </Text>
            <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>This week</Text>
          </View>
          <View style={[styles.hoursCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.hoursNum, { color: colors.foreground }]}>
              {myProjects.length}
            </Text>
            <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>
              {myProjects.length === 1 ? "Job" : "Jobs"}
            </Text>
          </View>
        </View>

        {/* ── Recent work log ── */}
        {recentLogs.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Work</Text>
            {recentLogs.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId);
              return (
                <View
                  key={log.id}
                  style={[styles.logRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.logBar, { backgroundColor: colors.success }]} />
                  <View style={styles.logBody}>
                    <Text style={[styles.logProject, { color: colors.foreground }]} numberOfLines={1}>
                      {proj?.name ?? "Unknown"}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>
                      {fmtDate(log.date)} · {fmtTime(log.clockIn)} — {fmtTime(log.clockOut!)}
                    </Text>
                  </View>
                  <Text style={[styles.logDur, { color: colors.foreground }]}>
                    {durLabel(log.totalMinutes ?? 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyLog}>
            <Feather name="clock" size={24} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyLogText, { color: colors.mutedForeground }]}>
              No work sessions yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { gap: 0 },

  // Hero gradient header
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 100,
  },
  signOutBtnText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },

  // Identity section
  identity: { gap: 10 },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatar: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  idInfo: { gap: 3 },
  idName: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  idPosition: { color: "rgba(255,255,255,0.55)", fontSize: 14 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600", maxWidth: 200 },

  // Hours row
  hoursRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 16 },
  hoursCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 18,
    gap: 4,
  },
  hoursNum: { fontSize: 26, fontWeight: "900" },
  hoursLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },

  // Recent log
  section: { marginHorizontal: 16, marginTop: 24, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  logBar: { width: 4, alignSelf: "stretch" },
  logBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  logProject: { fontSize: 14, fontWeight: "700" },
  logMeta: { fontSize: 12, marginTop: 2 },
  logDur: { fontSize: 15, fontWeight: "800", paddingRight: 14 },
  emptyLog: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyLogText: { fontSize: 14 },
});
