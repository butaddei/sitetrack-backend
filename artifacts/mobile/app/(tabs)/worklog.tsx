import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
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
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { TimeLog, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

/* ═══════════════════════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════════════════════ */

export default function WorkLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    projects, employees, timeLogs,
    clockIn, clockOut, getActiveTimeLog,
    getEmployeeDailyHours, getEmployeeWeeklyHours,
    getEmployeeDailyLaborCost, getEmployeeWeeklyLaborCost,
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for active ring
  const pulseOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (activeLog) {
      pulseOpacity.value = withRepeat(withTiming(0.35, { duration: 1000 }), -1, true);
      pulseScale.value = withRepeat(withTiming(1.18, { duration: 1000 }), -1, true);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeLog.clockIn).getTime()) / 1000));
      }, 1000);
    } else {
      pulseOpacity.value = withTiming(0, { duration: 300 });
      pulseScale.value = withTiming(1, { duration: 300 });
      setElapsed(0);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [!!activeLog, activeLog?.id]);

  const fmtElapsed = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };
  const fmtTimeShort = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return new Date(dateStr + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;
  const weeklyHours = user ? getEmployeeWeeklyHours(user.id) : 0;
  const dailyCost = user ? getEmployeeDailyLaborCost(user.id) : 0;
  const weeklyCost = user ? getEmployeeWeeklyLaborCost(user.id) : 0;
  const liveSessionCost = activeLog ? (elapsed / 3600) * (employee?.hourlyRate ?? 0) : 0;
  const activeProject = projects.find((p) => p.id === activeLog?.projectId);

  const handleClockIn = async (projectId: string) => {
    if (!user) return;
    setClockInError("");
    const result = await clockIn(user.id, projectId);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowProjectPicker(false);
    } else {
      setClockInError(result.error ?? "Failed to clock in");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClockOut = () => { if (!activeLog) return; setNotes(""); setShowNotes(true); };
  const confirmClockOut = async () => {
    if (!activeLog) return;
    await clockOut(activeLog.id, notes);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowNotes(false);
    setNotes("");
  };

  // Group logs by date
  const grouped = myLogs.reduce<Record<string, TimeLog[]>>((acc, l) => {
    if (!acc[l.date]) acc[l.date] = [];
    acc[l.date].push(l);
    return acc;
  }, {});
  const sections = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ title: date, data: grouped[date] }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Sticky top hero ── */}
      <View style={[styles.hero, { backgroundColor: colors.accent, paddingTop: topPad + 10 }]}>
        {/* Header row */}
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>Work Log</Text>
            <Text style={styles.heroSub}>{user?.name?.split(" ")[0]}</Text>
          </View>
          <View style={[
            styles.statusPill,
            { backgroundColor: activeLog ? "#4ade8025" : "rgba(255,255,255,0.10)" },
          ]}>
            <View style={[styles.statusDot, { backgroundColor: activeLog ? "#4ade80" : "rgba(255,255,255,0.3)" }]} />
            <Text style={[styles.statusText, { color: activeLog ? "#4ade80" : "rgba(255,255,255,0.5)" }]}>
              {activeLog ? "On the clock" : "Off the clock"}
            </Text>
          </View>
        </View>

        {/* ── Clock panel ── */}
        {activeLog ? (
          /* ─── ACTIVE STATE ─── */
          <View style={styles.activePanel}>
            {/* Timer ring */}
            <View style={styles.timerRingWrap}>
              <Animated.View style={[styles.timerRingPulse, { borderColor: "#f97316" }, pulseStyle]} />
              <View style={[styles.timerRing, { borderColor: "#f9731640" }]}>
                <Text style={styles.timerDisplay}>{fmtElapsed(elapsed)}</Text>
                <Text style={styles.timerEarned}>${liveSessionCost.toFixed(2)} earned</Text>
              </View>
            </View>

            {/* Project chip */}
            <View style={[styles.activeProjectChip, { backgroundColor: "rgba(255,255,255,0.10)" }]}>
              <Feather name="briefcase" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.activeProjectName} numberOfLines={1}>
                {activeProject?.name ?? "Unknown Project"}
              </Text>
            </View>
            <Text style={styles.startedAt}>Started at {fmtTimeShort(activeLog.clockIn)}</Text>

            {/* STOP button */}
            <TouchableOpacity
              style={styles.stopBtn}
              onPress={handleClockOut}
              activeOpacity={0.85}
            >
              <View style={styles.stopBtnInner}>
                <Feather name="square" size={22} color="#fff" />
                <Text style={styles.stopBtnText}>Stop Work</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── IDLE STATE ─── */
          <View style={styles.idlePanel}>
            <View style={styles.idleTimerRing}>
              <Feather name="clock" size={36} color="rgba(255,255,255,0.25)" />
              <Text style={styles.idleTimerText}>00:00:00</Text>
            </View>
            <Text style={styles.idleLabel}>Ready to start?</Text>

            {myProjects.length > 0 ? (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => { setClockInError(""); setShowProjectPicker(true); }}
                activeOpacity={0.85}
              >
                <View style={styles.startBtnInner}>
                  <Feather name="play" size={22} color="#fff" />
                  <Text style={styles.startBtnText}>Start Work</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.noProjectsBanner, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                <Feather name="info" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.noProjectsText}>No projects assigned yet</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Stats bar ── */}
        <View style={styles.statsBar}>
          <StatsCell label="Today" hours={dailyHours} cost={dailyCost} active={dailyHours > 0} />
          <View style={styles.statsDivider} />
          <StatsCell label="This Week" hours={weeklyHours} cost={weeklyCost} />
          <View style={styles.statsDivider} />
          <View style={styles.statsCell}>
            <Text style={styles.statsCellLabel}>Rate</Text>
            <Text style={[styles.statsCellValue, { color: colors.primary }]}>
              ${employee?.hourlyRate ?? 0}/hr
            </Text>
          </View>
        </View>
      </View>

      {/* ── Session history ── */}
      {sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Feather name="clock" size={36} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sessions yet</Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            Tap "Start Work" to begin tracking your hours
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 32 }]}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <DaySectionHeader
              title={fmtDate(section.title)}
              logs={section.data}
              getSessionLaborCost={getSessionLaborCost}
            />
          )}
          renderItem={({ item }) => (
            <SessionCard
              log={item}
              project={projects.find((p) => p.id === item.projectId)}
              cost={getSessionLaborCost(item)}
              fmtTimeShort={fmtTimeShort}
            />
          )}
        />
      )}

      {/* ── Project picker modal ── */}
      <Modal visible={showProjectPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowProjectPicker(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select a Project</Text>
            <View style={{ width: 36 }} />
          </View>

          {clockInError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "25" }]}>
              <Feather name="alert-circle" size={15} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
            </View>
          ) : null}

          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.pickerList}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Feather name="folder" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No projects assigned</Text>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                  Ask your admin to assign you to a project
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.projOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleClockIn(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.projOptionIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="briefcase" size={18} color={colors.primary} />
                </View>
                <View style={styles.projOptionInfo}>
                  <Text style={[styles.projOptionName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={styles.projOptionMeta}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.projOptionAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </View>
                <View style={[styles.selectChip, { backgroundColor: colors.primary }]}>
                  <Feather name="play" size={13} color="#fff" />
                  <Text style={styles.selectChipText}>Start</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Clock-out notes modal ── */}
      <Modal visible={showNotes} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowNotes(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Clock Out</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.clockOutContent} keyboardShouldPersistTaps="handled">
            {/* Session summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.accent }]}>
              <Text style={styles.summaryCardTitle}>Session Summary</Text>
              <View style={styles.summaryRow}>
                <SummaryCell label="Start" value={activeLog ? fmtTimeShort(activeLog.clockIn) : "—"} />
                <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.4)" />
                <SummaryCell label="End" value={fmtTimeShort(new Date().toISOString())} />
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <SummaryCell label="Duration" value={fmtElapsed(elapsed)} highlight />
                <SummaryCell label="Earned" value={`$${liveSessionCost.toFixed(2)}`} highlight />
              </View>
            </View>

            <View style={styles.notesSection}>
              <Text style={[styles.notesLabel, { color: colors.foreground }]}>Session Notes</Text>
              <Text style={[styles.notesHint, { color: colors.mutedForeground }]}>Optional — describe what you worked on</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Completed primer coat on north wall, started second coat on south side…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            {/* CONFIRM STOP button */}
            <TouchableOpacity style={styles.confirmStopBtn} onPress={confirmClockOut} activeOpacity={0.85}>
              <Feather name="square" size={20} color="#fff" />
              <Text style={styles.confirmStopText}>Confirm — Stop Work</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowNotes(false)}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Sub-components ─── */

function StatsCell({ label, hours, cost, active }: { label: string; hours: number; cost: number; active?: boolean }) {
  return (
    <View style={styles.statsCell}>
      <Text style={styles.statsCellLabel}>{label}</Text>
      <Text style={[styles.statsCellValue, active ? { color: "#f97316" } : {}]}>
        {hours.toFixed(1)}h
      </Text>
      <Text style={styles.statsCellCost}>${cost.toFixed(0)}</Text>
    </View>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryCellLabel}>{label}</Text>
      <Text style={[styles.summaryCellValue, highlight ? { color: "#f97316" } : {}]}>{value}</Text>
    </View>
  );
}

function DaySectionHeader({ title, logs, getSessionLaborCost }: {
  title: string;
  logs: TimeLog[];
  getSessionLaborCost: (l: TimeLog) => number;
}) {
  const colors = useColors();
  const completed = logs.filter((l) => l.totalMinutes);
  const totalHours = completed.reduce((s, l) => s + l.totalMinutes! / 60, 0);
  const totalCost = completed.reduce((s, l) => s + getSessionLaborCost(l), 0);
  const hasActive = logs.some((l) => !l.clockOut);

  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {hasActive ? (
          <View style={[styles.liveChip, { backgroundColor: colors.primary + "1a" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.liveText, { color: colors.primary }]}>Live</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sectionHeaderRight}>
        <Text style={[styles.sectionHours, { color: colors.foreground }]}>{totalHours.toFixed(1)}h</Text>
        <Text style={[styles.sectionCost, { color: colors.success }]}>${totalCost.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function SessionCard({ log, project, cost, fmtTimeShort }: {
  log: TimeLog;
  project: any;
  cost: number;
  fmtTimeShort: (iso: string) => string;
}) {
  const colors = useColors();
  const isActive = !log.clockOut;
  const durLabel = () => {
    if (!log.totalMinutes) return null;
    const h = Math.floor(log.totalMinutes / 60);
    const m = log.totalMinutes % 60;
    return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
  };

  return (
    <View style={[
      styles.sessionCard,
      {
        backgroundColor: colors.card,
        borderColor: isActive ? colors.primary + "50" : colors.border,
      },
    ]}>
      {isActive ? <View style={[styles.sessionActiveLine, { backgroundColor: colors.primary }]} /> : null}

      <View style={styles.sessionHead}>
        <Text style={[styles.sessionProjName, { color: colors.foreground }]} numberOfLines={1}>
          {project?.name ?? "Unknown Project"}
        </Text>
        {isActive ? (
          <View style={[styles.sessionActiveBadge, { backgroundColor: colors.primary + "1a" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.liveText, { color: colors.primary }]}>Active</Text>
          </View>
        ) : durLabel() ? (
          <View style={[styles.durationChip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.durationText, { color: colors.mutedForeground }]}>{durLabel()}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sessionTimes}>
        <TimeBlock icon="log-in" label="Start" time={fmtTimeShort(log.clockIn)} color={colors.success} />
        {log.clockOut ? (
          <>
            <Feather name="arrow-right" size={13} color={colors.mutedForeground} />
            <TimeBlock icon="log-out" label="End" time={fmtTimeShort(log.clockOut)} color={colors.destructive} />
          </>
        ) : (
          <View style={[styles.inProgressChip, { backgroundColor: colors.primary + "12" }]}>
            <Text style={[styles.inProgressText, { color: colors.primary }]}>In progress…</Text>
          </View>
        )}
      </View>

      {log.totalMinutes ? (
        <View style={[styles.sessionFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerCost}>
            <Feather name="dollar-sign" size={12} color={colors.success} />
            <Text style={[styles.footerCostText, { color: colors.success }]}>{cost.toFixed(2)}</Text>
          </View>
          {log.notes ? (
            <Text style={[styles.sessionNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
              {log.notes}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TimeBlock({ icon, label, time, color }: { icon: string; label: string; time: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.timeBlock}>
      <Text style={[styles.timeBlockLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.timeBlockRow}>
        <Feather name={icon as any} size={12} color={color} />
        <Text style={[styles.timeBlockValue, { color: colors.foreground }]}>{time}</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero block
  hero: { paddingHorizontal: 20, paddingBottom: 0 },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },

  // Active clock panel
  activePanel: { alignItems: "center", gap: 10, paddingBottom: 20 },
  timerRingWrap: { width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  timerRingPulse: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 3 },
  timerRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 3, alignItems: "center", justifyContent: "center", gap: 4 },
  timerDisplay: { color: "#fff", fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  timerEarned: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  activeProjectChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
  activeProjectName: { color: "#fff", fontSize: 14, fontWeight: "600", maxWidth: 220 },
  startedAt: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  stopBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 18,
    marginTop: 8,
    width: "100%",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stopBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  stopBtnText: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },

  // Idle clock panel
  idlePanel: { alignItems: "center", gap: 12, paddingBottom: 20 },
  idleTimerRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", gap: 8 },
  idleTimerText: { color: "rgba(255,255,255,0.3)", fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
  idleLabel: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "500" },
  startBtn: {
    backgroundColor: "#22c55e",
    borderRadius: 18,
    width: "100%",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  noProjectsBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  noProjectsText: { color: "rgba(255,255,255,0.5)", fontSize: 13 },

  // Stats bar
  statsBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)", paddingVertical: 14, marginTop: 4 },
  statsCell: { flex: 1, alignItems: "center", gap: 2 },
  statsCellLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  statsCellValue: { color: "#fff", fontSize: 16, fontWeight: "800" },
  statsCellCost: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "500" },
  statsDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.10)", marginVertical: 4 },

  // History list
  list: { padding: 14, gap: 10 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyHint: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  // Section header
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  sectionHeaderRight: { alignItems: "flex-end", gap: 1 },
  sectionHours: { fontSize: 13, fontWeight: "700" },
  sectionCost: { fontSize: 11, fontWeight: "600" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: "700" },

  // Session card
  sessionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", gap: 0 },
  sessionActiveLine: { height: 3 },
  sessionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 8 },
  sessionProjName: { fontSize: 14, fontWeight: "700", flex: 1, marginRight: 8 },
  sessionActiveBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  durationChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  durationText: { fontSize: 12, fontWeight: "700" },
  sessionTimes: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  inProgressChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginLeft: 4 },
  inProgressText: { fontSize: 12, fontWeight: "600" },
  sessionFooter: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingHorizontal: 14, borderTopWidth: 1 },
  footerCost: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerCostText: { fontSize: 13, fontWeight: "700" },
  sessionNotes: { flex: 1, fontSize: 12, fontStyle: "italic" },

  // Time blocks
  timeBlock: { alignItems: "flex-start", gap: 2 },
  timeBlockLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  timeBlockRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeBlockValue: { fontSize: 14, fontWeight: "600" },

  // Project picker modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13 },
  pickerList: { padding: 16, gap: 10 },
  projOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  projOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  projOptionInfo: { flex: 1, gap: 4 },
  projOptionName: { fontSize: 15, fontWeight: "700" },
  projOptionMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  projOptionAddr: { fontSize: 12, flex: 1 },
  selectChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
  selectChipText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Clock-out modal
  clockOutContent: { padding: 20, gap: 18, paddingBottom: 40 },
  summaryCard: { borderRadius: 16, padding: 20, gap: 12 },
  summaryCardTitle: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  summaryDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  summaryCell: { alignItems: "center", gap: 3 },
  summaryCellLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "600" },
  summaryCellValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  notesSection: { gap: 6 },
  notesLabel: { fontSize: 15, fontWeight: "700" },
  notesHint: { fontSize: 12 },
  notesInput: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 100 },
  confirmStopBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmStopText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: 14, borderWidth: 1, borderRadius: 14 },
  cancelText: { fontSize: 14, fontWeight: "600" },
});
