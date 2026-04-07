import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  SectionList,
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
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { TimeLog, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function WorkLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    projects,
    employees,
    timeLogs,
    clockIn,
    clockOut,
    getActiveTimeLog,
    getEmployeeDailyHours,
    getEmployeeWeeklyHours,
    getEmployeeDailyLaborCost,
    getEmployeeWeeklyLaborCost,
    getSessionLaborCost,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const employee = employees.find((e) => e.id === user?.id);
  const myProjects = projects.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));

  const myLogs = timeLogs
    .filter((l) => l.employeeId === user?.id)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const [elapsed, setElapsed] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [clockInError, setClockInError] = useState("");
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated pulse for active state
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (activeLog) {
      pulseScale.value = withRepeat(withTiming(1.06, { duration: 900 }), -1, true);
      pulseOpacity.value = withRepeat(withTiming(0.4, { duration: 900 }), -1, true);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeLog.clockIn).getTime()) / 1000));
      }, 1000);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
      setElapsed(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [!!activeLog, activeLog?.id]);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatTimeShort = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;
  const weeklyHours = user ? getEmployeeWeeklyHours(user.id) : 0;
  const dailyCost = user ? getEmployeeDailyLaborCost(user.id) : 0;
  const weeklyCost = user ? getEmployeeWeeklyLaborCost(user.id) : 0;

  // Live labor accumulating during active session
  const liveSessionCost = activeLog
    ? (elapsed / 3600) * (employee?.hourlyRate ?? 0)
    : 0;

  const activeProject = projects.find((p) => p.id === activeLog?.projectId);

  const handleClockIn = async (projectId: string) => {
    if (!user || clockingIn) return;
    setClockInError("");
    setClockingIn(true);
    try {
      const result = await clockIn(user.id, projectId);
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowProjectPicker(false);
      } else {
        setClockInError(result.error ?? "Failed to clock in");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = () => {
    if (!activeLog) return;
    setNotes("");
    setShowNotes(true);
  };

  const confirmClockOut = async () => {
    if (!activeLog || clockingOut) return;
    setClockingOut(true);
    try {
      await clockOut(activeLog.id, notes);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNotes(false);
      setNotes("");
    } finally {
      setClockingOut(false);
    }
  };

  // Group logs by date for section list
  const grouped = myLogs.reduce<Record<string, TimeLog[]>>((acc, log) => {
    const key = log.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const sections = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      title: date,
      data: grouped[date],
    }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Work Log</Text>
        <View style={[styles.statusPill, { backgroundColor: activeLog ? colors.success + "30" : "rgba(255,255,255,0.12)" }]}>
          <View style={[styles.statusDot, { backgroundColor: activeLog ? colors.success : "rgba(255,255,255,0.4)" }]} />
          <Text style={[styles.statusText, { color: activeLog ? colors.success : "rgba(255,255,255,0.55)" }]}>
            {activeLog ? "Currently Working" : "Stopped"}
          </Text>
        </View>
      </View>

      {/* Clock section */}
      <View style={[styles.clockSection, { backgroundColor: colors.accent }]}>
        {activeLog ? (
          <View style={styles.activeContainer}>
            {/* Pulsing ring */}
            <View style={styles.timerWrapper}>
              <Animated.View style={[styles.pulseRing, { borderColor: colors.primary }, ringStyle]} />
              <Animated.View style={[styles.timerCircle, { backgroundColor: colors.primary }, pulseStyle]}>
                <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
                <Text style={styles.timerSubtext}>
                  ${liveSessionCost.toFixed(2)} earned
                </Text>
              </Animated.View>
            </View>

            <View style={styles.activeInfo}>
              <Text style={styles.workingOnLabel}>Working on</Text>
              <Text style={styles.activeProjectName} numberOfLines={1}>
                {activeProject?.name ?? "Unknown Project"}
              </Text>
              <Text style={styles.startedAtText}>
                Started at {formatTime(activeLog.clockIn)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.clockBtn, { backgroundColor: colors.destructive }]}
              onPress={handleClockOut}
              activeOpacity={0.85}
            >
              <Feather name="square" size={16} color="#fff" />
              <Text style={styles.clockBtnText}>Clock Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.idleContainer}>
            <View style={[styles.timerCircle, { backgroundColor: "rgba(255,255,255,0.10)" }]}>
              <Feather name="clock" size={34} color="rgba(255,255,255,0.4)" />
              <Text style={styles.idleTimerText}>00:00:00</Text>
            </View>
            <Text style={styles.idleLabel}>Not clocked in</Text>
            {myProjects.length > 0 ? (
              <TouchableOpacity
                style={[styles.clockBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setClockInError("");
                  setShowProjectPicker(true);
                }}
                activeOpacity={0.85}
              >
                <Feather name="play" size={16} color="#fff" />
                <Text style={styles.clockBtnText}>Clock In</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noProjectsText}>No projects assigned to you</Text>
            )}
          </View>
        )}
      </View>

      {/* Daily / Weekly stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <StatCell
          label="Today"
          hours={dailyHours}
          cost={dailyCost}
          highlight={dailyHours > 0}
        />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCell label="This Week" hours={weeklyHours} cost={weeklyCost} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCell
          label="Hourly Rate"
          hours={null}
          cost={null}
          rate={employee?.hourlyRate}
        />
      </View>

      {/* Session history */}
      {sections.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No sessions yet"
          subtitle="Clock in to start tracking your work"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <SectionHeader
              title={formatDate(section.title)}
              logs={section.data}
              getSessionLaborCost={getSessionLaborCost}
              employees={employees}
              userId={user?.id ?? ""}
            />
          )}
          renderItem={({ item }) => (
            <SessionCard
              log={item}
              project={projects.find((p) => p.id === item.projectId)}
              cost={getSessionLaborCost(item)}
              formatTimeShort={formatTimeShort}
            />
          )}
        />
      )}

      {/* Project picker modal */}
      <Modal visible={showProjectPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Project</Text>
            <View style={{ width: 22 }} />
          </View>

          {clockInError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
            </View>
          ) : null}

          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={
              <EmptyState icon="folder" title="No projects assigned" subtitle="Ask your admin to assign you to a project" />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.projOption, { backgroundColor: colors.card, borderColor: colors.border, opacity: clockingIn ? 0.6 : 1 }]}
                onPress={() => handleClockIn(item.id)}
                activeOpacity={0.85}
                disabled={clockingIn}
              >
                <View style={styles.projOptionInfo}>
                  <Text style={[styles.projOptionName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={styles.projOptionMeta}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.projOptionAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </View>
                <View style={[styles.clockInBadge, { backgroundColor: colors.primary }]}>
                  {clockingIn ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="play" size={12} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Clock out notes modal */}
      <Modal visible={showNotes} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowNotes(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Clock Out</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            {/* Session summary */}
            <View style={[styles.sessionSummary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Session Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Start</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {activeLog ? formatTimeShort(activeLog.clockIn) : "—"}
                  </Text>
                </View>
                <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Now</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {formatTimeShort(new Date().toISOString())}
                  </Text>
                </View>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Duration</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: "700" }]}>
                    {formatElapsed(elapsed)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Labor Cost</Text>
                  <Text style={[styles.summaryValue, { color: colors.success, fontWeight: "700" }]}>
                    ${liveSessionCost.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>
              Add notes for this session (optional)
            </Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="What did you accomplish today?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.clockBtn, styles.clockBtnFull, { backgroundColor: colors.destructive, opacity: clockingOut ? 0.7 : 1 }]}
              onPress={confirmClockOut}
              activeOpacity={0.85}
              disabled={clockingOut}
            >
              {clockingOut ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="square" size={16} color="#fff" />
                  <Text style={styles.clockBtnText}>Confirm Clock Out</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function StatCell({
  label,
  hours,
  cost,
  rate,
  highlight,
}: {
  label: string;
  hours: number | null;
  cost: number | null;
  rate?: number;
  highlight?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {rate !== undefined ? (
        <Text style={[styles.statValue, { color: colors.primary }]}>${rate}/hr</Text>
      ) : (
        <>
          <Text style={[styles.statValue, { color: highlight ? colors.primary : colors.foreground }]}>
            {(hours ?? 0).toFixed(1)}h
          </Text>
          <Text style={[styles.statCost, { color: colors.success }]}>
            ${(cost ?? 0).toFixed(2)}
          </Text>
        </>
      )}
    </View>
  );
}

function SectionHeader({
  title,
  logs,
  getSessionLaborCost,
  employees,
  userId,
}: {
  title: string;
  logs: TimeLog[];
  getSessionLaborCost: (log: TimeLog) => number;
  employees: any[];
  userId: string;
}) {
  const colors = useColors();
  const completedLogs = logs.filter((l) => l.totalMinutes);
  const totalMins = completedLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0);
  const totalHours = totalMins / 60;
  const totalCost = completedLogs.reduce((s, l) => s + getSessionLaborCost(l), 0);
  const activeLogs = logs.filter((l) => !l.clockOut);

  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={[styles.sectionHeaderTitle, { color: colors.foreground }]}>{title}</Text>
        {activeLogs.length > 0 ? (
          <View style={[styles.liveChip, { backgroundColor: colors.primary + "20" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.liveText, { color: colors.primary }]}>Live</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sectionHeaderRight}>
        <Text style={[styles.sectionHours, { color: colors.foreground }]}>
          {totalHours.toFixed(1)}h
        </Text>
        <Text style={[styles.sectionCost, { color: colors.success }]}>
          ${totalCost.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

function SessionCard({
  log,
  project,
  cost,
  formatTimeShort,
}: {
  log: TimeLog;
  project: any;
  cost: number;
  formatTimeShort: (iso: string) => string;
}) {
  const colors = useColors();
  const isActive = !log.clockOut;
  const hours = log.totalMinutes ? (log.totalMinutes / 60) : null;

  const durationLabel = () => {
    if (!log.totalMinutes) return null;
    const h = Math.floor(log.totalMinutes / 60);
    const m = log.totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <View
      style={[
        styles.sessionCard,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? colors.primary + "60" : colors.border,
          borderLeftColor: isActive ? colors.primary : colors.border,
          borderLeftWidth: isActive ? 3 : 1,
        },
      ]}
    >
      {/* Top row */}
      <View style={styles.sessionTop}>
        <View style={styles.sessionProject}>
          <Text style={[styles.sessionProjectName, { color: colors.foreground }]} numberOfLines={1}>
            {project?.name ?? "Unknown Project"}
          </Text>
          {isActive ? (
            <View style={[styles.activeChip, { backgroundColor: colors.primary + "18" }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.activeText, { color: colors.primary }]}>Working Now</Text>
            </View>
          ) : null}
        </View>
        {!isActive && durationLabel() ? (
          <View style={styles.durationBadge}>
            <Text style={[styles.durationText, { color: colors.foreground }]}>{durationLabel()}</Text>
          </View>
        ) : null}
      </View>

      {/* Time row */}
      <View style={styles.sessionTimes}>
        <TimeStampBlock
          icon="log-in"
          label="Clock In"
          time={formatTimeShort(log.clockIn)}
          color={colors.success}
        />
        {log.clockOut ? (
          <>
            <Feather name="arrow-right" size={12} color={colors.mutedForeground} style={{ marginTop: 10 }} />
            <TimeStampBlock
              icon="log-out"
              label="Clock Out"
              time={formatTimeShort(log.clockOut)}
              color={colors.destructive}
            />
          </>
        ) : (
          <View style={[styles.ongoingChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.ongoingText, { color: colors.primary }]}>In progress...</Text>
          </View>
        )}
      </View>

      {/* Footer: cost + notes */}
      {log.totalMinutes ? (
        <View style={[styles.sessionFooter, { borderTopColor: colors.border }]}>
          <View style={styles.costRow}>
            <Feather name="dollar-sign" size={12} color={colors.success} />
            <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Labor cost: </Text>
            <Text style={[styles.costValue, { color: colors.success }]}>${cost.toFixed(2)}</Text>
          </View>
          {log.notes ? (
            <Text style={[styles.sessionNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
              "{log.notes}"
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TimeStampBlock({
  icon,
  label,
  time,
  color,
}: {
  icon: string;
  label: string;
  time: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.tsBlock}>
      <View style={styles.tsIconRow}>
        <Feather name={icon as any} size={11} color={color} />
        <Text style={[styles.tsLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.tsTime, { color: colors.foreground }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  clockSection: { paddingHorizontal: 20, paddingBottom: 24 },
  activeContainer: { alignItems: "center", gap: 10 },
  idleContainer: { alignItems: "center", gap: 10 },
  timerWrapper: { alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 2,
  },
  timerCircle: {
    width: 146,
    height: 146,
    borderRadius: 73,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  timerText: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 1.5 },
  timerSubtext: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  idleTimerText: { color: "rgba(255,255,255,0.35)", fontSize: 20, fontWeight: "700", letterSpacing: 1 },
  activeInfo: { alignItems: "center", gap: 3 },
  workingOnLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "500" },
  activeProjectName: { color: "#fff", fontSize: 17, fontWeight: "700", maxWidth: 260, textAlign: "center" },
  startedAtText: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  idleLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "500" },
  noProjectsText: { color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", maxWidth: 220 },
  clockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 100,
    marginTop: 4,
  },
  clockBtnFull: { justifyContent: "center" },
  clockBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  statsBar: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 17, fontWeight: "800" },
  statCost: { fontSize: 11, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 0, gap: 0 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: "700" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "700" },
  sectionHeaderRight: { alignItems: "flex-end" },
  sectionHours: { fontSize: 13, fontWeight: "700" },
  sectionCost: { fontSize: 12, fontWeight: "600" },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  sessionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sessionProject: { flex: 1, gap: 4 },
  sessionProjectName: { fontSize: 14, fontWeight: "700" },
  activeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, alignSelf: "flex-start" },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "600" },
  durationBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, backgroundColor: "transparent" },
  durationText: { fontSize: 14, fontWeight: "700" },
  sessionTimes: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tsBlock: { gap: 2 },
  tsIconRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tsLabel: { fontSize: 10, fontWeight: "500" },
  tsTime: { fontSize: 14, fontWeight: "700" },
  ongoingChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, alignSelf: "center" },
  ongoingText: { fontSize: 12, fontWeight: "600" },
  sessionFooter: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  costLabel: { fontSize: 12 },
  costValue: { fontSize: 12, fontWeight: "700" },
  sessionNotes: { fontSize: 12, fontStyle: "italic" },
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
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  projOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  projOptionInfo: { flex: 1 },
  projOptionName: { fontSize: 15, fontWeight: "600" },
  projOptionMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  projOptionAddr: { fontSize: 12, flex: 1 },
  clockInBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionSummary: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  summaryTitle: { fontSize: 14, fontWeight: "700" },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", gap: 3 },
  summaryLabel: { fontSize: 11, fontWeight: "500" },
  summaryValue: { fontSize: 16, fontWeight: "600" },
  summaryDivider: { height: 1 },
  notesLabel: { fontSize: 14, fontWeight: "500" },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 90, fontSize: 15 },
});
