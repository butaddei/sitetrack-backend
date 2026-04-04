import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { useAuth } from "@/context/AuthContext";
import { Project, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

// ─── Three possible states ───────────────────────────────────
type WorkState = "not_started" | "working" | "finished";

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
    getEmployeeDailyLogs,
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
  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;

  // Determine the current work state
  const workState: WorkState = activeLog
    ? "working"
    : dailyHours > 0
    ? "finished"
    : "not_started";

  // Elapsed seconds for live timer
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal visibility
  const [showPicker, setShowPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [showStop, setShowStop] = useState(false);
  const [showNote, setShowNote] = useState(false);

  // Form values
  const [stopNotes, setStopNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteProjectId, setNoteProjectId] = useState("");
  const [clockInError, setClockInError] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  // Pulse animation
  const pulseScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (activeLog) {
      pulseScale.value = withRepeat(withTiming(1.07, { duration: 1100 }), -1, true);
      ringOpacity.value = withRepeat(withTiming(0.55, { duration: 1100 }), -1, true);
      intervalRef.current = setInterval(() => {
        setElapsed(
          Math.floor((Date.now() - new Date(activeLog.clockIn).getTime()) / 1000)
        );
      }, 1000);
    } else {
      pulseScale.value = withTiming(1, { duration: 400 });
      ringOpacity.value = withTiming(0, { duration: 400 });
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

  // ── Formatters ───────────────────────────────────────────
  const hms = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const durLabel = (mins: number) => {
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

  // Today's finished sessions
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySessions = timeLogs
    .filter((l) => l.employeeId === user?.id && l.date === todayStr && !!l.clockOut)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  // ── Start flow ───────────────────────────────────────────
  const handleStartPress = () => {
    setClockInError("");
    if (myProjects.length === 0) return;
    if (myProjects.length === 1) {
      // Single project → show confirmation
      setConfirmProject(myProjects[0]);
      setShowConfirm(true);
    } else {
      // Multiple projects → show picker
      setShowPicker(true);
    }
  };

  const handleConfirmStart = async (projectId: string) => {
    if (!user || clockingIn) return;
    setClockInError("");
    setClockingIn(true);
    try {
      const result = await clockIn(user.id, projectId);
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowConfirm(false);
        setShowPicker(false);
      } else {
        setClockInError(result.error ?? "Could not start timer");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setClockingIn(false);
    }
  };

  // ── Stop flow ────────────────────────────────────────────
  const handleStop = async () => {
    if (!activeLog || clockingOut) return;
    setClockingOut(true);
    try {
      await clockOut(activeLog.id, stopNotes.trim() || undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowStop(false);
      setStopNotes("");
    } finally {
      setClockingOut(false);
    }
  };

  // ── Notes ────────────────────────────────────────────────
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

  // ── Photo ─────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    const targetId = activeLog?.projectId ?? myProjects[0]?.id;
    if (!targetId) {
      Alert.alert("No project", "You need to be assigned to a project first.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera permission needed", "Allow camera access to take site photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!result.canceled && result.assets.length > 0) {
      await addProjectPhoto(targetId, result.assets[0].uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Site photo added to the project.");
    }
  };

  // ── State config for timer block ─────────────────────────
  const stateConfig = {
    not_started: {
      badge: "Not Started",
      badgeBg: "rgba(255,255,255,0.10)",
      badgeColor: "rgba(255,255,255,0.50)",
      dotColor: "rgba(255,255,255,0.30)",
      circleBg: "rgba(255,255,255,0.07)",
      timerColor: "rgba(255,255,255,0.20)",
    },
    working: {
      badge: "Currently Working",
      badgeBg: colors.success + "28",
      badgeColor: colors.success,
      dotColor: colors.success,
      circleBg: colors.primary,
      timerColor: "#ffffff",
    },
    finished: {
      badge: "Finished for Today",
      badgeBg: colors.success + "22",
      badgeColor: colors.success,
      dotColor: colors.success,
      circleBg: colors.success + "22",
      timerColor: colors.success,
    },
  }[workState];

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10, backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/emp-profile")}
          hitSlop={8}
        >
          <Text style={styles.avatarInitials}>
            {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}
      >
        {/* ══════════════════════════════════════════
            MAIN TIMER BLOCK
        ══════════════════════════════════════════ */}
        <View style={[styles.timerBlock, { backgroundColor: colors.accent }]}>

          {/* Status badge */}
          <View style={[styles.statusPill, { backgroundColor: stateConfig.badgeBg }]}>
            <View style={[styles.statusDot, { backgroundColor: stateConfig.dotColor }]} />
            <Text style={[styles.statusText, { color: stateConfig.badgeColor }]}>
              {stateConfig.badge}
            </Text>
          </View>

          {/* Active project info */}
          {workState === "working" && activeProject ? (
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={2}>
                {activeProject.name}
              </Text>
              <View style={styles.projectAddrRow}>
                <Feather name="map-pin" size={12} color="rgba(255,255,255,0.38)" />
                <Text style={styles.projectAddr} numberOfLines={1}>
                  {activeProject.address}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Timer circle */}
          <View style={styles.circleOuter}>
            {workState === "working" ? (
              <>
                {/* Pulsing ring */}
                <Animated.View
                  style={[styles.ring, { borderColor: colors.primary }, ringStyle]}
                />
                <Animated.View
                  style={[styles.circle, { backgroundColor: stateConfig.circleBg }, pulseStyle]}
                >
                  <Text style={[styles.timerText, { color: stateConfig.timerColor }]}>
                    {hms(elapsed)}
                  </Text>
                  <Text style={styles.timerSub}>elapsed</Text>
                </Animated.View>
              </>
            ) : workState === "finished" ? (
              <View style={[styles.circle, { backgroundColor: stateConfig.circleBg, borderColor: colors.success + "40", borderWidth: 2 }]}>
                <Feather name="check-circle" size={34} color={colors.success} />
                <Text style={[styles.hoursLarge, { color: stateConfig.timerColor }]}>
                  {dailyHours.toFixed(1)}h
                </Text>
                <Text style={[styles.hoursLargeSub, { color: colors.success + "99" }]}>
                  worked today
                </Text>
              </View>
            ) : (
              <View style={[styles.circle, { backgroundColor: stateConfig.circleBg }]}>
                <Feather name="clock" size={40} color="rgba(255,255,255,0.18)" />
                <Text style={[styles.timerText, { color: stateConfig.timerColor }]}>
                  00:00:00
                </Text>
              </View>
            )}
          </View>

          {/* Sub-label below circle */}
          {workState === "working" ? (
            <Text style={styles.startedAt}>
              Started at {fmtTime(activeLog!.clockIn)}
            </Text>
          ) : workState === "not_started" ? (
            <Text style={styles.idleHint}>
              {myProjects.length > 0
                ? "Tap Start Work to begin tracking"
                : "No projects assigned yet"}
            </Text>
          ) : null}

          {/* ── PRIMARY ACTION BUTTON ── */}
          {workState === "working" ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.destructive }]}
              onPress={() => { setStopNotes(""); setShowStop(true); }}
              activeOpacity={0.86}
            >
              <Feather name="square" size={24} color="#fff" />
              <Text style={styles.primaryBtnText}>Stop Work</Text>
            </TouchableOpacity>
          ) : myProjects.length > 0 ? (
            <>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: clockingIn ? colors.primary + "88" : colors.primary },
                ]}
                onPress={handleStartPress}
                activeOpacity={0.86}
                disabled={clockingIn}
              >
                {clockingIn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="play" size={24} color="#fff" />
                )}
                <Text style={styles.primaryBtnText}>
                  {clockingIn
                    ? "Starting..."
                    : workState === "finished"
                    ? "Start Another Session"
                    : "Start Work"}
                </Text>
              </TouchableOpacity>

              {/* Error from duplicate timer prevention */}
              {clockInError ? (
                <View style={[styles.errorPill, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.errorPillText, { color: colors.destructive }]}>
                    {clockInError}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {/* ══════════════════════════════════════════
            TODAY HOURS — one big number
        ══════════════════════════════════════════ */}
        <View style={[styles.hoursCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.hoursLeft}>
            <Text
              style={[
                styles.hoursNumber,
                { color: dailyHours > 0 ? colors.primary : colors.mutedForeground },
              ]}
            >
              {dailyHours.toFixed(1)}
            </Text>
            <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>
              hours today
            </Text>
          </View>
          <View style={[styles.hoursDivider, { backgroundColor: colors.border }]} />
          <View style={styles.hoursRight}>
            <Text style={[styles.sessionsNum, { color: colors.foreground }]}>
              {todaySessions.length + (activeLog ? 1 : 0)}
            </Text>
            <Text style={[styles.sessionsLabel, { color: colors.mutedForeground }]}>
              {todaySessions.length + (activeLog ? 1 : 0) === 1 ? "session" : "sessions"}
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            QUICK ACTIONS — Add Note + Take Photo
        ══════════════════════════════════════════ */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={openNoteModal}
            activeOpacity={0.82}
            disabled={myProjects.length === 0}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="edit-3" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>Add Note</Text>
            <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>Log observation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleTakePhoto}
            activeOpacity={0.82}
            disabled={myProjects.length === 0}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#0f172a18" }]}>
              <Feather name="camera" size={22} color={colors.accent} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>Take Photo</Text>
            <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>Save site photo</Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════
            TODAY'S SESSIONS
        ══════════════════════════════════════════ */}
        {todaySessions.length > 0 ? (
          <View style={styles.sessionsBlock}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Work</Text>
            {todaySessions.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId);
              return (
                <View
                  key={log.id}
                  style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.sessionAccent, { backgroundColor: colors.success }]} />
                  <View style={styles.sessionBody}>
                    <Text style={[styles.sessionProject, { color: colors.foreground }]} numberOfLines={1}>
                      {proj?.name ?? "Unknown"}
                    </Text>
                    <Text style={[styles.sessionTimes, { color: colors.mutedForeground }]}>
                      {fmtTime(log.clockIn)} — {fmtTime(log.clockOut!)}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDur, { color: colors.foreground }]}>
                    {durLabel(log.totalMinutes ?? 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* ══════════════════════════════════════════
          SINGLE-PROJECT CONFIRMATION MODAL
      ══════════════════════════════════════════ */}
      <Modal visible={showConfirm} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowConfirm(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Start Work?</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.confirmBody}>
            {/* Project card */}
            <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.confirmIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="briefcase" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.confirmProjectName, { color: colors.foreground }]}>
                {confirmProject?.name}
              </Text>
              <View style={styles.confirmAddrRow}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.confirmAddr, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {confirmProject?.address}
                </Text>
              </View>
            </View>

            <Text style={[styles.confirmHint, { color: colors.mutedForeground }]}>
              Your timer will start immediately. You can stop and add session notes when you're done.
            </Text>

            {/* Error */}
            {clockInError ? (
              <View style={[styles.errorPill, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorPillText, { color: colors.destructive }]}>{clockInError}</Text>
              </View>
            ) : null}

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: clockingIn ? colors.primary + "88" : colors.primary,
                  marginHorizontal: 0,
                  marginTop: 8,
                },
              ]}
              onPress={() => confirmProject && handleConfirmStart(confirmProject.id)}
              disabled={clockingIn}
              activeOpacity={0.86}
            >
              {clockingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="play" size={22} color="#fff" />
              )}
              <Text style={styles.primaryBtnText}>
                {clockingIn ? "Starting..." : "Confirm — Start Timer"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => { setShowConfirm(false); setClockInError(""); }}
            >
              <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════
          MULTI-PROJECT PICKER MODAL
      ══════════════════════════════════════════ */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Project</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={[styles.pickerSubtitle, { color: colors.mutedForeground }]}>
            Which project are you working on?
          </Text>

          {clockInError ? (
            <View style={[styles.errorPill, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40", marginHorizontal: 16 }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorPillText, { color: colors.destructive }]}>{clockInError}</Text>
            </View>
          ) : null}

          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleConfirmStart(item.id)}
                activeOpacity={0.84}
              >
                <View style={styles.pickCardBody}>
                  <Text style={[styles.pickCardName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <View style={styles.pickCardAddr}>
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.pickCardAddrText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </View>
                <View style={[styles.startChip, { backgroundColor: colors.primary }]}>
                  <Feather name="play" size={15} color="#fff" />
                  <Text style={styles.startChipText}>Start</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ══════════════════════════════════════════
          STOP CONFIRM MODAL
      ══════════════════════════════════════════ */}
      <Modal visible={showStop} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowStop(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Stop Work</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.stopScroll} keyboardShouldPersistTaps="handled">
            {/* Summary */}
            <View style={[styles.stopSummary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.stopProject, { color: colors.foreground }]} numberOfLines={1}>
                {activeProject?.name ?? "—"}
              </Text>
              <View style={styles.stopStatsRow}>
                <StopStat label="Started" value={activeLog ? fmtTime(activeLog.clockIn) : "—"} />
                <View style={[styles.stopDivider, { backgroundColor: colors.border }]} />
                <StopStat label="Duration" value={hms(elapsed)} accent={colors.primary} />
                <View style={[styles.stopDivider, { backgroundColor: colors.border }]} />
                <StopStat label="Today Total" value={`${(dailyHours + elapsed / 3600).toFixed(1)}h`} />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.notesBlock}>
              <Text style={[styles.notesLabel, { color: colors.foreground }]}>
                Session notes <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="What did you work on? Any issues or observations?"
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
                {
                  backgroundColor: clockingOut ? colors.destructive + "88" : colors.destructive,
                  marginHorizontal: 0,
                },
              ]}
              onPress={handleStop}
              disabled={clockingOut}
              activeOpacity={0.86}
            >
              {clockingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="square" size={20} color="#fff" />
              )}
              <Text style={styles.primaryBtnText}>
                {clockingOut ? "Saving..." : "Confirm Stop"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════
          ADD NOTE MODAL
      ══════════════════════════════════════════ */}
      <Modal visible={showNote} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowNote(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Observation</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.noteScroll} keyboardShouldPersistTaps="handled">
            {/* Project selector */}
            {myProjects.length > 1 ? (
              <View style={styles.projSelectorBlock}>
                <Text style={[styles.projSelectorLabel, { color: colors.mutedForeground }]}>
                  Project
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {myProjects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.projChip,
                        { backgroundColor: noteProjectId === p.id ? colors.primary : colors.muted },
                      ]}
                      onPress={() => setNoteProjectId(p.id)}
                    >
                      <Text style={[styles.projChipText, { color: noteProjectId === p.id ? "#fff" : colors.mutedForeground }]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : myProjects.length === 1 ? (
              <View style={[styles.singleProjPill, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "35" }]}>
                <Feather name="folder" size={13} color={colors.primary} />
                <Text style={[styles.singleProjText, { color: colors.primary }]} numberOfLines={1}>
                  {myProjects[0].name}
                </Text>
              </View>
            ) : null}

            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Describe what you worked on, issues noticed, materials used..."
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
                  backgroundColor: noteText.trim() && noteProjectId ? colors.primary : colors.muted,
                  marginHorizontal: 0,
                },
              ]}
              onPress={handleSaveNote}
              disabled={!noteText.trim() || !noteProjectId || savingNote}
              activeOpacity={0.86}
            >
              <Feather name="check" size={20} color={noteText.trim() && noteProjectId ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.primaryBtnText, { color: noteText.trim() && noteProjectId ? "#fff" : colors.mutedForeground }]}>
                {savingNote ? "Saving..." : "Save Observation"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StopStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: "500" }}>{label}</Text>
      <Text style={{ fontSize: 17, fontWeight: "700", color: accent ?? colors.foreground }}>{value}</Text>
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
    paddingBottom: 16,
  },
  greetingText: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: "500" },
  userName: { color: "#fff", fontSize: 24, fontWeight: "800" },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontWeight: "700", fontSize: 16 },
  scroll: { gap: 0 },

  // ── Timer block ──────────────────────────────────────────────
  timerBlock: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: "center",
    gap: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: "700" },
  projectInfo: { alignItems: "center", gap: 4 },
  projectName: { color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center", maxWidth: 300 },
  projectAddrRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  projectAddr: { color: "rgba(255,255,255,0.38)", fontSize: 12, maxWidth: 260 },

  // Circle
  circleOuter: { alignItems: "center", justifyContent: "center", marginVertical: 8 },
  ring: { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 3 },
  circle: { width: 182, height: 182, borderRadius: 91, alignItems: "center", justifyContent: "center", gap: 5 },
  timerText: { fontSize: 28, fontWeight: "800", letterSpacing: 1.5 },
  timerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  hoursLarge: { fontSize: 38, fontWeight: "900", letterSpacing: -0.5 },
  hoursLargeSub: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  startedAt: { color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "500" },
  idleHint: { color: "rgba(255,255,255,0.38)", fontSize: 14, textAlign: "center", maxWidth: 240 },

  // Primary button — the only action, impossible to miss
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 22,
    borderRadius: 100,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 19, fontWeight: "800" },

  // Error pill
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  errorPillText: { fontSize: 13, flex: 1 },

  // ── Today hours ──────────────────────────────────────────────
  hoursCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  hoursLeft: { flex: 1, alignItems: "center", gap: 3 },
  hoursNumber: { fontSize: 56, fontWeight: "900", letterSpacing: -2 },
  hoursLabel: { fontSize: 13, fontWeight: "600" },
  hoursDivider: { width: 1, height: 52, marginHorizontal: 20 },
  hoursRight: { flex: 1, alignItems: "center", gap: 3 },
  sessionsNum: { fontSize: 38, fontWeight: "800" },
  sessionsLabel: { fontSize: 13, fontWeight: "600" },

  // ── Quick actions ─────────────────────────────────────────────
  quickRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 14 },
  quickBtn: { flex: 1, alignItems: "center", borderRadius: 18, borderWidth: 1, paddingVertical: 20, gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 15, fontWeight: "700" },
  quickSub: { fontSize: 11 },

  // ── Today's sessions ──────────────────────────────────────────
  sessionsBlock: { marginHorizontal: 16, marginTop: 24, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sessionAccent: { width: 4, alignSelf: "stretch" },
  sessionBody: { flex: 1, paddingVertical: 13, paddingHorizontal: 12 },
  sessionProject: { fontSize: 14, fontWeight: "700" },
  sessionTimes: { fontSize: 12, marginTop: 2 },
  sessionDur: { fontSize: 16, fontWeight: "800", paddingRight: 14 },

  // ── Modals ─────────────────────────────────────────────────────
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

  // Confirm modal
  confirmBody: { padding: 24, gap: 16 },
  confirmCard: { borderRadius: 18, borderWidth: 1, padding: 22, alignItems: "center", gap: 10 },
  confirmIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  confirmProjectName: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  confirmAddrRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  confirmAddr: { fontSize: 13, textAlign: "center", flex: 1 },
  confirmHint: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  cancelLink: { alignItems: "center", paddingVertical: 12 },
  cancelLinkText: { fontSize: 15, fontWeight: "600" },

  // Picker modal
  pickerSubtitle: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, fontSize: 14 },
  pickCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  pickCardBody: { flex: 1, gap: 6 },
  pickCardName: { fontSize: 17, fontWeight: "700" },
  pickCardAddr: { flexDirection: "row", alignItems: "center", gap: 5 },
  pickCardAddrText: { fontSize: 13, flex: 1 },
  startChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
  },
  startChipText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Stop modal
  stopScroll: { padding: 20, gap: 20 },
  stopSummary: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 14 },
  stopProject: { fontSize: 16, fontWeight: "700" },
  stopStatsRow: { flexDirection: "row", alignItems: "center" },
  stopDivider: { width: 1, height: 36, marginHorizontal: 4 },
  notesBlock: { gap: 10 },
  notesLabel: { fontSize: 15, fontWeight: "600" },
  notesInput: { borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 100, fontSize: 15 },

  // Note modal
  noteScroll: { padding: 20, gap: 16 },
  projSelectorBlock: { gap: 8 },
  projSelectorLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  projChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, maxWidth: 220 },
  projChipText: { fontSize: 13, fontWeight: "600" },
  singleProjPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  singleProjText: { fontSize: 13, fontWeight: "600", maxWidth: 260 },
  noteInput: { borderWidth: 1, borderRadius: 14, padding: 16, minHeight: 140, fontSize: 16, lineHeight: 24 },
});
