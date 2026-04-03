import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    projects,
    timeLogs,
    clockIn,
    clockOut,
    getActiveTimeLog,
    getEmployeeDailyHours,
    getEmployeeWeeklyHours,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const myProjects = projects.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));
  const activeProject = projects.find((p) => p.id === activeLog?.projectId);

  const [elapsed, setElapsed] = useState(0);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [stopNotes, setStopNotes] = useState("");
  const [clockInError, setClockInError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (activeLog) {
      pulseScale.value = withRepeat(withTiming(1.08, { duration: 1000 }), -1, true);
      pulseOpacity.value = withRepeat(withTiming(0.5, { duration: 1000 }), -1, true);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeLog.clockIn).getTime()) / 1000));
      }, 1000);
    } else {
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0);
      setElapsed(0);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [!!activeLog, activeLog?.id]);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTimeShort = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const greeting =
    new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;
  const weeklyHours = user ? getEmployeeWeeklyHours(user.id) : 0;

  const handleStart = async (projectId: string) => {
    if (!user) return;
    setClockInError("");
    const result = await clockIn(user.id, projectId);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowProjectPicker(false);
    } else {
      setClockInError(result.error ?? "Could not start timer");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleStop = async () => {
    if (!activeLog) return;
    await clockOut(activeLog.id, stopNotes.trim() || undefined);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowStopConfirm(false);
    setStopNotes("");
  };

  // Today's completed sessions
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySessions = timeLogs
    .filter((l) => l.employeeId === user?.id && l.date === todayStr && l.clockOut)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/emp-profile")}
        >
          <Text style={styles.avatarText}>
            {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
      >
        {/* ── MAIN TIMER CARD ── */}
        {activeLog ? (
          /* WORKING STATE */
          <View style={[styles.timerCard, { backgroundColor: colors.accent }]}>
            <View style={styles.workingHeader}>
              <View style={[styles.workingBadge, { backgroundColor: colors.success + "30" }]}>
                <View style={[styles.workingDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.workingText, { color: colors.success }]}>Currently Working</Text>
              </View>
            </View>

            <Text style={styles.timerProjectLabel} numberOfLines={2}>
              {activeProject?.name ?? "Unknown Project"}
            </Text>
            <View style={styles.timerAddressRow}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.timerAddress} numberOfLines={1}>
                {activeProject?.address ?? ""}
              </Text>
            </View>

            {/* Big pulsing timer */}
            <View style={styles.timerCircleWrapper}>
              <Animated.View style={[styles.timerRing, { borderColor: colors.primary }, ringStyle]} />
              <Animated.View style={[styles.timerCircle, { backgroundColor: colors.primary }, pulseStyle]}>
                <Text style={styles.timerDisplay}>{formatElapsed(elapsed)}</Text>
                <Text style={styles.timerSubLabel}>elapsed</Text>
              </Animated.View>
            </View>

            <Text style={styles.startedAt}>
              Started at {formatTimeShort(activeLog.clockIn)}
            </Text>

            {/* BIG STOP BUTTON */}
            <TouchableOpacity
              style={[styles.bigStopBtn, { backgroundColor: colors.destructive }]}
              onPress={() => { setStopNotes(""); setShowStopConfirm(true); }}
              activeOpacity={0.88}
            >
              <Feather name="square" size={22} color="#fff" />
              <Text style={styles.bigBtnText}>Stop Work</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* IDLE STATE */
          <View style={[styles.timerCard, { backgroundColor: colors.accent }]}>
            <View style={styles.workingHeader}>
              <View style={[styles.workingBadge, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
                <View style={[styles.workingDot, { backgroundColor: "rgba(255,255,255,0.4)" }]} />
                <Text style={[styles.workingText, { color: "rgba(255,255,255,0.55)" }]}>Not Clocked In</Text>
              </View>
            </View>

            <View style={styles.idleCircle}>
              <Feather name="clock" size={42} color="rgba(255,255,255,0.25)" />
              <Text style={styles.idleTimerText}>00:00:00</Text>
            </View>

            <Text style={styles.idleHint}>
              {myProjects.length > 0
                ? "Select a project to start tracking"
                : "No projects assigned yet"}
            </Text>

            {/* BIG START BUTTON */}
            {myProjects.length > 0 ? (
              <TouchableOpacity
                style={[styles.bigStartBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setClockInError(""); setShowProjectPicker(true); }}
                activeOpacity={0.88}
              >
                <Feather name="play" size={22} color="#fff" />
                <Text style={styles.bigBtnText}>Start Work</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── TODAY STATS ── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="sun"
            label="Today"
            value={dailyHours > 0 ? `${dailyHours.toFixed(1)}h` : "—"}
            sub={`${todaySessions.length} session${todaySessions.length !== 1 ? "s" : ""}`}
            highlight={dailyHours > 0}
          />
          <StatCard
            icon="calendar"
            label="This Week"
            value={weeklyHours > 0 ? `${weeklyHours.toFixed(1)}h` : "—"}
            sub="total hours"
          />
          <StatCard
            icon="folder"
            label="My Jobs"
            value={myProjects.length.toString()}
            sub="assigned"
          />
        </View>

        {/* ── TODAY'S SESSIONS ── */}
        {todaySessions.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Sessions</Text>
            {todaySessions.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId);
              const mins = log.totalMinutes ?? 0;
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
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
                    <Text style={[styles.sessionTimes, { color: colors.mutedForeground }]}>
                      {formatTimeShort(log.clockIn)} — {formatTimeShort(log.clockOut!)}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDur, { color: colors.foreground }]}>{dur}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── MY PROJECTS ── */}
        {myProjects.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Projects</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/emp-projects")}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>View all</Text>
              </TouchableOpacity>
            </View>
            {myProjects.slice(0, 3).map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })}
                activeOpacity={0.85}
              >
                <View style={styles.projectCardTop}>
                  <View style={styles.projectCardInfo}>
                    <Text style={[styles.projectCardName, { color: colors.foreground }]} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <View style={styles.projectCardAddr}>
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.projectCardAddrText, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {project.address}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={project.status} />
                </View>
                {activeLog?.projectId === project.id ? (
                  <View style={[styles.activeOnCard, { backgroundColor: colors.primary + "15" }]}>
                    <View style={[styles.activeOnDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.activeOnText, { color: colors.primary }]}>Currently working here</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Project Picker Modal */}
      <Modal visible={showProjectPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Project</Text>
            <View style={{ width: 22 }} />
          </View>

          {clockInError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
              <Feather name="alert-circle" size={15} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
            </View>
          ) : null}

          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleStart(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.pickCardLeft}>
                  <Text style={[styles.pickCardName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={styles.pickCardAddr}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.pickCardAddrText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <View style={[styles.startBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="play" size={16} color="#fff" />
                  <Text style={styles.startBadgeText}>Start</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Stop Confirm Modal */}
      <Modal visible={showStopConfirm} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowStopConfirm(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Stop Work</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
            {/* Summary */}
            <View style={[styles.stopSummary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.stopSummaryProject, { color: colors.foreground }]}>
                {activeProject?.name}
              </Text>
              <View style={styles.stopSummaryRow}>
                <View style={styles.stopSummaryItem}>
                  <Text style={[styles.stopSummaryLabel, { color: colors.mutedForeground }]}>Started</Text>
                  <Text style={[styles.stopSummaryValue, { color: colors.foreground }]}>
                    {activeLog ? formatTimeShort(activeLog.clockIn) : "—"}
                  </Text>
                </View>
                <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                <View style={styles.stopSummaryItem}>
                  <Text style={[styles.stopSummaryLabel, { color: colors.mutedForeground }]}>Duration</Text>
                  <Text style={[styles.stopSummaryValue, { color: colors.primary, fontWeight: "700" }]}>
                    {formatElapsed(elapsed)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.notesLabel, { color: colors.foreground }]}>
                Any notes for this session?
              </Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Optional — what did you work on?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={stopNotes}
                onChangeText={setStopNotes}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.bigStopBtn, { backgroundColor: colors.destructive }]}
              onPress={handleStop}
              activeOpacity={0.88}
            >
              <Feather name="square" size={20} color="#fff" />
              <Text style={styles.bigBtnText}>Confirm Stop</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={15} color={highlight ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.statValue, { color: highlight ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  userName: { color: "#fff", fontSize: 26, fontWeight: "800" },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  scroll: { gap: 0 },

  // Timer card
  timerCard: {
    marginHorizontal: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: "center",
    gap: 10,
  },
  workingHeader: { width: "100%", alignItems: "flex-start", marginBottom: 4 },
  workingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  workingDot: { width: 7, height: 7, borderRadius: 4 },
  workingText: { fontSize: 12, fontWeight: "700" },
  timerProjectLabel: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },
  timerAddressRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  timerAddress: { color: "rgba(255,255,255,0.45)", fontSize: 12, flex: 1 },
  timerCircleWrapper: { alignItems: "center", justifyContent: "center", marginVertical: 8 },
  timerRing: {
    position: "absolute",
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 2.5,
  },
  timerCircle: {
    width: 164,
    height: 164,
    borderRadius: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  timerDisplay: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 1.5 },
  timerSubLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  startedAt: { color: "rgba(255,255,255,0.5)", fontSize: 13 },

  // Idle
  idleCircle: { alignItems: "center", gap: 8, paddingVertical: 20 },
  idleTimerText: { color: "rgba(255,255,255,0.2)", fontSize: 28, fontWeight: "700", letterSpacing: 2 },
  idleHint: { color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center", maxWidth: 220 },

  // Big buttons
  bigStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 100,
    marginTop: 8,
  },
  bigStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 100,
    marginTop: 8,
  },
  bigBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 3,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  statSub: { fontSize: 10 },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  // Today sessions
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionInfo: { flex: 1 },
  sessionProject: { fontSize: 14, fontWeight: "600" },
  sessionTimes: { fontSize: 12, marginTop: 2 },
  sessionDur: { fontSize: 15, fontWeight: "700" },

  // Project cards
  projectCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  projectCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  projectCardInfo: { flex: 1, marginRight: 8 },
  projectCardName: { fontSize: 15, fontWeight: "700" },
  projectCardAddr: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  projectCardAddrText: { fontSize: 12, flex: 1 },
  activeOnCard: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, alignSelf: "flex-start" },
  activeOnDot: { width: 6, height: 6, borderRadius: 3 },
  activeOnText: { fontSize: 11, fontWeight: "600" },

  // Modals
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  pickCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  pickCardLeft: { flex: 1, gap: 5 },
  pickCardName: { fontSize: 16, fontWeight: "700" },
  pickCardAddr: { flexDirection: "row", alignItems: "center", gap: 4 },
  pickCardAddrText: { fontSize: 12, flex: 1 },
  startBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
  },
  startBadgeText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  stopSummary: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  stopSummaryProject: { fontSize: 16, fontWeight: "700" },
  stopSummaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  stopSummaryItem: { alignItems: "center", gap: 2 },
  stopSummaryLabel: { fontSize: 11, fontWeight: "500" },
  stopSummaryValue: { fontSize: 16, fontWeight: "600" },
  notesLabel: { fontSize: 14, fontWeight: "600" },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 90, fontSize: 15 },
});
