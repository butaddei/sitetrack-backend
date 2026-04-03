import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
    addEmployeeNote,
    addProjectPhoto,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const myProjects = projects.filter((p) =>
    p.assignedEmployeeIds.includes(user?.id ?? "")
  );
  const activeProject = projects.find((p) => p.id === activeLog?.projectId);

  // Timer state
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal state
  const [showPicker, setShowPicker] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [stopNotes, setStopNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteProjectId, setNoteProjectId] = useState("");
  const [clockInError, setClockInError] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Pulse animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (activeLog) {
      pulseScale.value = withRepeat(withTiming(1.07, { duration: 1100 }), -1, true);
      pulseOpacity.value = withRepeat(withTiming(0.55, { duration: 1100 }), -1, true);
      intervalRef.current = setInterval(() => {
        setElapsed(
          Math.floor((Date.now() - new Date(activeLog.clockIn).getTime()) / 1000)
        );
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

  // ── Helpers ──────────────────────────────────────────────
  const hms = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const durationLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;

  // Today's finished sessions
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySessions = timeLogs
    .filter(
      (l) => l.employeeId === user?.id && l.date === todayStr && !!l.clockOut
    )
    .sort(
      (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
    );

  // ── Actions ──────────────────────────────────────────────
  const handleStart = async (projectId: string) => {
    if (!user) return;
    setClockInError("");
    const result = await clockIn(user.id, projectId);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPicker(false);
    } else {
      setClockInError(result.error ?? "Could not start timer");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleStop = async () => {
    if (!activeLog) return;
    await clockOut(activeLog.id, stopNotes.trim() || undefined);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowStop(false);
    setStopNotes("");
  };

  const openNoteModal = () => {
    setNoteProjectId(activeLog?.projectId ?? myProjects[0]?.id ?? "");
    setNoteText("");
    setShowNote(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !noteProjectId || !user) return;
    setSavingNote(true);
    try {
      await addEmployeeNote(noteProjectId, user.id, noteText.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNote(false);
      setNoteText("");
    } finally {
      setSavingNote(false);
    }
  };

  const handleTakePhoto = async () => {
    const targetProjectId = activeLog?.projectId ?? myProjects[0]?.id;
    if (!targetProjectId) {
      Alert.alert("No project", "You need to be assigned to a project first.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission needed",
        "Allow camera access to take site photos."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!result.canceled && result.assets.length > 0) {
      await addProjectPhoto(targetProjectId, result.assets[0].uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Photo saved", "Site photo added to the project.");
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 10, backgroundColor: colors.accent },
        ]}
      >
        <View>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/emp-profile")}
          hitSlop={8}
        >
          <Text style={styles.avatarText}>
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: botPad + 40 },
        ]}
      >
        {/* ══════════════════════════════════════════
            TIMER / STATUS BLOCK
        ══════════════════════════════════════════ */}
        <View
          style={[styles.timerBlock, { backgroundColor: colors.accent }]}
        >
          {/* Status badge */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: activeLog
                    ? colors.success + "28"
                    : "rgba(255,255,255,0.10)",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: activeLog
                      ? colors.success
                      : "rgba(255,255,255,0.35)",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color: activeLog
                      ? colors.success
                      : "rgba(255,255,255,0.5)",
                  },
                ]}
              >
                {activeLog ? "Currently Working" : "Not Clocked In"}
              </Text>
            </View>
          </View>

          {/* Project name (when working) */}
          {activeLog && activeProject ? (
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {activeProject.name}
              </Text>
              <View style={styles.projectAddrRow}>
                <Feather
                  name="map-pin"
                  size={12}
                  color="rgba(255,255,255,0.4)"
                />
                <Text style={styles.projectAddr} numberOfLines={1}>
                  {activeProject.address}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Timer circle */}
          <View style={styles.circleWrapper}>
            {activeLog ? (
              <>
                <Animated.View
                  style={[
                    styles.ring,
                    { borderColor: colors.primary },
                    ringStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.circle,
                    { backgroundColor: colors.primary },
                    pulseStyle,
                  ]}
                >
                  <Text style={styles.timerDisplay}>{hms(elapsed)}</Text>
                  <Text style={styles.timerSublabel}>elapsed</Text>
                </Animated.View>
              </>
            ) : (
              <View
                style={[
                  styles.circle,
                  { backgroundColor: "rgba(255,255,255,0.07)" },
                ]}
              >
                <Feather
                  name="clock"
                  size={40}
                  color="rgba(255,255,255,0.18)"
                />
                <Text style={styles.idleTimerText}>00:00:00</Text>
              </View>
            )}
          </View>

          {/* Start time hint when working */}
          {activeLog ? (
            <Text style={styles.startedAt}>
              Started at {fmtTime(activeLog.clockIn)}
            </Text>
          ) : (
            <Text style={styles.idleHint}>
              {myProjects.length > 0
                ? "Choose a project to begin"
                : "No projects assigned yet"}
            </Text>
          )}

          {/* ── PRIMARY BUTTON ── */}
          {activeLog ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.destructive }]}
              onPress={() => {
                setStopNotes("");
                setShowStop(true);
              }}
              activeOpacity={0.86}
            >
              <Feather name="square" size={22} color="#fff" />
              <Text style={styles.primaryBtnText}>Stop Work</Text>
            </TouchableOpacity>
          ) : myProjects.length > 0 ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setClockInError("");
                setShowPicker(true);
              }}
              activeOpacity={0.86}
            >
              <Feather name="play" size={22} color="#fff" />
              <Text style={styles.primaryBtnText}>Start Work</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ══════════════════════════════════════════
            TODAY HOURS — single big number
        ══════════════════════════════════════════ */}
        <View
          style={[
            styles.hoursCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.hoursLeft}>
            <Text
              style={[
                styles.hoursNumber,
                {
                  color:
                    dailyHours > 0 ? colors.primary : colors.mutedForeground,
                },
              ]}
            >
              {dailyHours > 0 ? dailyHours.toFixed(1) : "0.0"}
            </Text>
            <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>
              hours today
            </Text>
          </View>
          <View style={styles.hoursDivider} />
          <View style={styles.hoursRight}>
            <Text style={[styles.sessionsCount, { color: colors.foreground }]}>
              {todaySessions.length + (activeLog ? 1 : 0)}
            </Text>
            <Text style={[styles.sessionsLabel, { color: colors.mutedForeground }]}>
              {todaySessions.length + (activeLog ? 1 : 0) === 1
                ? "session"
                : "sessions"}
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            QUICK ACTIONS — Add Note + Take Photo
        ══════════════════════════════════════════ */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[
              styles.quickBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={openNoteModal}
            activeOpacity={0.82}
            disabled={myProjects.length === 0}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Feather name="edit-3" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.quickBtnLabel, { color: colors.foreground }]}>
              Add Note
            </Text>
            <Text
              style={[styles.quickBtnSub, { color: colors.mutedForeground }]}
            >
              Log an observation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={handleTakePhoto}
            activeOpacity={0.82}
            disabled={myProjects.length === 0}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: colors.accent + "18" },
              ]}
            >
              <Feather name="camera" size={22} color={colors.accent} />
            </View>
            <Text style={[styles.quickBtnLabel, { color: colors.foreground }]}>
              Take Photo
            </Text>
            <Text
              style={[styles.quickBtnSub, { color: colors.mutedForeground }]}
            >
              Save site photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════
            TODAY'S SESSIONS — compact list
        ══════════════════════════════════════════ */}
        {todaySessions.length > 0 ? (
          <View style={styles.sessionsSection}>
            <Text
              style={[styles.sectionTitle, { color: colors.foreground }]}
            >
              Today's Work
            </Text>
            {todaySessions.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId);
              return (
                <View
                  key={log.id}
                  style={[
                    styles.sessionItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.sessionBar,
                      { backgroundColor: colors.success },
                    ]}
                  />
                  <View style={styles.sessionBody}>
                    <Text
                      style={[
                        styles.sessionProj,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {proj?.name ?? "Unknown"}
                    </Text>
                    <Text
                      style={[
                        styles.sessionTime,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {fmtTime(log.clockIn)} — {fmtTime(log.clockOut!)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.sessionDur, { color: colors.foreground }]}
                  >
                    {durationLabel(log.totalMinutes ?? 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* ══════════════════════════════════════════
          PROJECT PICKER MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              { paddingTop: insets.top + 16, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Choose Project
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {clockInError ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + "12",
                  borderColor: colors.destructive + "40",
                },
              ]}
            >
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {clockInError}
              </Text>
            </View>
          ) : null}

          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleStart(item.id)}
                activeOpacity={0.84}
              >
                <View style={styles.pickRowLeft}>
                  <Text
                    style={[styles.pickRowName, { color: colors.foreground }]}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.pickRowAddr}>
                    <Feather
                      name="map-pin"
                      size={12}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.pickRowAddrText,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {item.address}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <View
                  style={[
                    styles.startBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Feather name="play" size={16} color="#fff" />
                  <Text style={styles.startBadgeText}>Start</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ══════════════════════════════════════════
          STOP CONFIRM MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={showStop}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalHeader,
              { paddingTop: insets.top + 16, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setShowStop(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Stop Work
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.stopScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Summary strip */}
            <View
              style={[
                styles.stopSummary,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.stopProject, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {activeProject?.name ?? "—"}
              </Text>
              <View style={styles.stopRow}>
                <StopStat
                  label="Started"
                  value={activeLog ? fmtTime(activeLog.clockIn) : "—"}
                />
                <Feather
                  name="arrow-right"
                  size={14}
                  color={colors.mutedForeground}
                />
                <StopStat
                  label="Duration"
                  value={hms(elapsed)}
                  accent={colors.primary}
                />
              </View>
            </View>

            {/* Notes input */}
            <View style={styles.notesBlock}>
              <Text
                style={[styles.notesBlockLabel, { color: colors.foreground }]}
              >
                Session notes (optional)
              </Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="What did you work on today?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={stopNotes}
                onChangeText={setStopNotes}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.destructive, marginHorizontal: 0 },
              ]}
              onPress={handleStop}
              activeOpacity={0.86}
            >
              <Feather name="square" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirm Stop</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════
          ADD NOTE MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={showNote}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalHeader,
              { paddingTop: insets.top + 16, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setShowNote(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Add Observation
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.noteScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Project selector — only if more than one project */}
            {myProjects.length > 1 ? (
              <View style={styles.projectPickerRow}>
                <Text
                  style={[
                    styles.projectPickerLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Project
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {myProjects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.projChip,
                        {
                          backgroundColor:
                            noteProjectId === p.id
                              ? colors.primary
                              : colors.muted,
                        },
                      ]}
                      onPress={() => setNoteProjectId(p.id)}
                    >
                      <Text
                        style={[
                          styles.projChipText,
                          {
                            color:
                              noteProjectId === p.id
                                ? "#fff"
                                : colors.mutedForeground,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : myProjects.length === 1 ? (
              <View
                style={[
                  styles.singleProjectPill,
                  {
                    backgroundColor: colors.primary + "15",
                    borderColor: colors.primary + "40",
                  },
                ]}
              >
                <Feather name="folder" size={13} color={colors.primary} />
                <Text
                  style={[styles.singleProjectText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {myProjects[0].name}
                </Text>
              </View>
            ) : null}

            {/* Text area */}
            <TextInput
              style={[
                styles.noteTextInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Describe what you worked on, any issues, materials used, or observations..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              autoFocus
              value={noteText}
              onChangeText={setNoteText}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor:
                    noteText.trim() && noteProjectId
                      ? colors.primary
                      : colors.muted,
                  marginHorizontal: 0,
                },
              ]}
              onPress={handleSaveNote}
              disabled={!noteText.trim() || !noteProjectId || savingNote}
              activeOpacity={0.86}
            >
              <Feather
                name="check"
                size={20}
                color={
                  noteText.trim() && noteProjectId ? "#fff" : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.primaryBtnText,
                  {
                    color:
                      noteText.trim() && noteProjectId
                        ? "#fff"
                        : colors.mutedForeground,
                  },
                ]}
              >
                {savingNote ? "Saving..." : "Save Observation"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StopStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: "500" }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: accent ?? colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greetingText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "500",
  },
  userName: { color: "#fff", fontSize: 24, fontWeight: "800" },
  avatarBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  scroll: { gap: 0 },

  // ── Timer block ──────────────────────────────
  timerBlock: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    alignItems: "center",
    gap: 10,
  },
  statusRow: { width: "100%", alignItems: "flex-start" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 100,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: "700" },
  projectInfo: { alignItems: "center", gap: 4, marginTop: 4 },
  projectName: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 300,
  },
  projectAddrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  projectAddr: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    maxWidth: 260,
  },
  circleWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  ring: {
    position: "absolute",
    width: 194,
    height: 194,
    borderRadius: 97,
    borderWidth: 3,
  },
  circle: {
    width: 178,
    height: 178,
    borderRadius: 89,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  timerDisplay: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  timerSublabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  idleTimerText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 6,
  },
  startedAt: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "500",
  },
  idleHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 230,
  },

  // Primary button — the biggest, most important button
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 20,
    borderRadius: 100,
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 19, fontWeight: "800" },

  // ── Today hours card ──────────────────────────
  hoursCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  hoursLeft: { flex: 1, alignItems: "center", gap: 2 },
  hoursNumber: { fontSize: 52, fontWeight: "900", letterSpacing: -1 },
  hoursLabel: { fontSize: 13, fontWeight: "600" },
  hoursDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 20,
  },
  hoursRight: { flex: 1, alignItems: "center", gap: 2 },
  sessionsCount: { fontSize: 36, fontWeight: "800" },
  sessionsLabel: { fontSize: 13, fontWeight: "600" },

  // ── Quick actions ─────────────────────────────
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 8,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnLabel: { fontSize: 15, fontWeight: "700" },
  quickBtnSub: { fontSize: 11, textAlign: "center" },

  // ── Today's sessions ──────────────────────────
  sessionsSection: {
    marginHorizontal: 16,
    marginTop: 24,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sessionBar: { width: 4, alignSelf: "stretch" },
  sessionBody: { flex: 1, paddingVertical: 13, paddingHorizontal: 13 },
  sessionProj: { fontSize: 14, fontWeight: "700" },
  sessionTime: { fontSize: 12, marginTop: 2 },
  sessionDur: { fontSize: 16, fontWeight: "800", paddingRight: 14 },

  // ── Modals ────────────────────────────────────
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  pickRowLeft: { flex: 1, gap: 6 },
  pickRowName: { fontSize: 17, fontWeight: "700" },
  pickRowAddr: { flexDirection: "row", alignItems: "center", gap: 5 },
  pickRowAddrText: { fontSize: 13, flex: 1 },
  startBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
  },
  startBadgeText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Stop modal
  stopScroll: { padding: 20, gap: 20 },
  stopSummary: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  stopProject: { fontSize: 16, fontWeight: "700" },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  notesBlock: { gap: 10 },
  notesBlockLabel: { fontSize: 15, fontWeight: "600" },
  notesInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    fontSize: 15,
  },

  // Note modal
  noteScroll: { padding: 20, gap: 16 },
  projectPickerRow: { gap: 8 },
  projectPickerLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  projChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    maxWidth: 200,
  },
  projChipText: { fontSize: 13, fontWeight: "600" },
  singleProjectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  singleProjectText: { fontSize: 13, fontWeight: "600", maxWidth: 260 },
  noteTextInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    minHeight: 140,
    fontSize: 16,
    lineHeight: 24,
  },
});
