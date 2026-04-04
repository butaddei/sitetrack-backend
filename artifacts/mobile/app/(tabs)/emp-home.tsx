import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hms(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function EmployeeHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, clockIn, clockOut, getActiveTimeLog, getEmployeeDailyHours } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const myProjects = projects.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));
  const activeProject = projects.find((p) => p.id === activeLog?.projectId);
  const dailyHours = user ? getEmployeeDailyHours(user.id) : 0;
  const isWorking = !!activeLog;
  const noProjects = myProjects.length === 0;

  // ── Live timer ──
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeLog) {
      const tick = () =>
        setElapsed(Math.floor((Date.now() - new Date(activeLog.clockIn).getTime()) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
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

  // ── Pulse ring animation when working ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isWorking) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isWorking]);

  // ── State ──
  const [showPicker, setShowPicker] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [clockInError, setClockInError] = useState("");
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState("");

  // ── Clock in ──
  function handleStartPress() {
    setClockInError("");
    if (noProjects) return;
    if (myProjects.length === 1) {
      doClockIn(myProjects[0].id);
    } else {
      setShowPicker(true);
    }
  }

  async function doClockIn(projectId: string) {
    if (!user || clockingIn) return;
    setClockingIn(true);
    setClockInError("");
    try {
      const result = await clockIn(user.id, projectId);
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowPicker(false);
      } else {
        setClockInError(result.error ?? "Could not start timer");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setClockingIn(false);
    }
  }

  // ── Clock out ──
  async function doClockOut() {
    if (!activeLog || clockingOut) return;
    setClockingOut(true);
    try {
      await clockOut(activeLog.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowStopConfirm(false);
    } finally {
      setClockingOut(false);
    }
  }

  // ── Photo action ──
  async function handlePhoto() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        setPhotoFeedback("Camera or photo access required");
        setTimeout(() => setPhotoFeedback(""), 3000);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        setPhotoFeedback("Photo attached");
        setTimeout(() => setPhotoFeedback(""), 2500);
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled) {
      setPhotoFeedback("Photo captured");
      setTimeout(() => setPhotoFeedback(""), 2500);
    }
  }

  // ── Note action ──
  async function handleNote() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/emp-notes");
  }

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // ── Derived display values ──
  const displayProject = isWorking
    ? activeProject
    : myProjects.length === 1
    ? myProjects[0]
    : null;

  const btnColor = isWorking ? colors.destructive : noProjects ? colors.mutedForeground : colors.success;
  const btnDisabled = (noProjects && !isWorking) || clockingIn || clockingOut;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={true}
    >

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerName, { color: colors.foreground }]}>
            {user?.name?.split(" ")[0]}
          </Text>
          <Text style={[styles.headerRole, { color: colors.mutedForeground }]}>
            Field Worker
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/emp-profile")}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Current Project ─────────────────────────────────────────────── */}
      <View style={styles.projectSection}>
        {displayProject ? (
          <View style={[styles.projectPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.projectDot, { backgroundColor: isWorking ? colors.success : colors.primary }]} />
            <Text style={[styles.projectName, { color: colors.foreground }]} numberOfLines={1}>
              {displayProject.name}
            </Text>
            {displayProject.address ? (
              <Text style={[styles.projectAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                · {displayProject.address}
              </Text>
            ) : null}
          </View>
        ) : myProjects.length > 1 ? (
          <View style={[styles.projectPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.projectDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.projectName, { color: colors.foreground }]}>
              {myProjects.length} projects assigned
            </Text>
          </View>
        ) : (
          <View style={[styles.projectPill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={[styles.projectDot, { backgroundColor: colors.mutedForeground }]} />
            <Text style={[styles.projectName, { color: colors.mutedForeground }]}>
              No project assigned — contact your manager
            </Text>
          </View>
        )}
      </View>

      {/* ─── Center content: timer + button ─────────────────────────────── */}
      <View style={styles.center}>

        {/* Status label */}
        <View style={[styles.statusPill, {
          backgroundColor: isWorking
            ? colors.success + "18"
            : dailyHours > 0 ? colors.primary + "14" : colors.muted,
          borderColor: isWorking
            ? colors.success + "40"
            : dailyHours > 0 ? colors.primary + "30" : colors.border,
        }]}>
          <View style={[styles.statusDot, {
            backgroundColor: isWorking ? colors.success
              : dailyHours > 0 ? colors.primary : colors.mutedForeground,
          }]} />
          <Text style={[styles.statusText, {
            color: isWorking ? colors.success
              : dailyHours > 0 ? colors.primary : colors.mutedForeground,
          }]}>
            {isWorking
              ? "Working now"
              : dailyHours > 0
              ? "Session paused"
              : noProjects ? "No project assigned" : "Ready to start"}
          </Text>
        </View>

        {/* Timer */}
        <Text style={[styles.timer, {
          color: isWorking ? colors.foreground : colors.mutedForeground,
        }]}>
          {isWorking ? hms(elapsed) : "00:00:00"}
        </Text>

        {/* Big action button */}
        <View style={styles.btnWrap}>
          {isWorking && (
            <Animated.View
              style={[
                styles.pulseRing,
                { borderColor: btnColor + "30", transform: [{ scale: pulseAnim }] },
              ]}
            />
          )}
          <TouchableOpacity
            style={[styles.bigBtn, { backgroundColor: btnColor, opacity: btnDisabled ? 0.55 : 1 }]}
            onPress={isWorking ? () => setShowStopConfirm(true) : handleStartPress}
            activeOpacity={0.88}
            disabled={btnDisabled}
          >
            {clockingIn || clockingOut ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : isWorking ? (
              <Feather name="square" size={44} color="#fff" />
            ) : (
              <Feather name="play" size={44} color="#fff" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.btnLabel, { color: colors.mutedForeground }]}>
          {clockingIn ? "Starting…" : clockingOut ? "Stopping…" : isWorking ? "TAP TO STOP" : noProjects ? "NO PROJECT" : "TAP TO START"}
        </Text>

        {/* Error message */}
        {clockInError ? (
          <View style={[styles.errorPill, { backgroundColor: colors.destructive + "14", borderColor: colors.destructive + "35" }]}>
            <Feather name="alert-circle" size={13} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
          </View>
        ) : null}

        {/* Hours today */}
        <View style={[styles.hoursRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.hoursText, { color: colors.foreground }]}>
            <Text style={{ fontWeight: "800" }}>{dailyHours.toFixed(1)}h</Text>
            <Text style={{ color: colors.mutedForeground }}> worked today</Text>
          </Text>
        </View>
      </View>

      {/* ─── Quick Actions ───────────────────────────────────────────────── */}
      <View style={[styles.quickActions, { paddingBottom: botPad + 12 }]}>
        {photoFeedback ? (
          <View style={[styles.feedbackPill, { backgroundColor: colors.success + "18", borderColor: colors.success + "40" }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.feedbackText, { color: colors.success }]}>{photoFeedback}</Text>
          </View>
        ) : null}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handlePhoto}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + "14" }]}>
              <Feather name="camera" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>Upload Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleNote}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.accent + "14" }]}>
              <Feather name="edit-3" size={18} color={colors.foreground} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Project picker modal ─────────────────────────────────────────── */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Project</Text>
            <View style={{ width: 22 }} />
          </View>
          {clockInError ? (
            <View style={[styles.modalError, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
            </View>
          ) : null}
          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => doClockIn(item.id)}
                activeOpacity={0.82}
                disabled={clockingIn}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="briefcase" size={20} color={colors.primary} />
                </View>
                <View style={styles.pickerInfo}>
                  <Text style={[styles.pickerName, { color: colors.foreground }]}>{item.name}</Text>
                  {item.address ? (
                    <Text style={[styles.pickerAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
                {clockingIn ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ─── Stop confirm modal ───────────────────────────────────────────── */}
      <Modal
        visible={showStopConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowStopConfirm(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="square" size={26} color={colors.destructive} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>End session?</Text>
            <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
              You've been on site for{" "}
              <Text style={{ fontWeight: "800", color: colors.foreground }}>{hms(elapsed)}</Text>
              . This session will be saved automatically.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmSecondary, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setShowStopConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmSecondaryText, { color: colors.foreground }]}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmPrimary, { backgroundColor: colors.destructive, opacity: clockingOut ? 0.7 : 1 }]}
                onPress={doClockOut}
                activeOpacity={0.88}
                disabled={clockingOut}
              >
                {clockingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmPrimaryText}>Stop Work</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  // flexGrow: 1 lets the content fill the full screen on large devices,
  // while still allowing overflow + scroll on small iPhones.
  scrollContent: { flexGrow: 1 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerLeft: { gap: 2 },
  headerName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  headerRole: { fontSize: 12, fontWeight: "500" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Project strip
  projectSection: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  projectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  projectDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  projectName: { fontSize: 15, fontWeight: "700", flex: 1 },
  projectAddr: { fontSize: 13, flexShrink: 1, maxWidth: "45%" as any },

  // Center area
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
  },

  // Status
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1 },

  // Timer
  timer: {
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: -3,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  // Big button
  btnWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 3,
  },
  bigBtn: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: -4,
  },

  // Error
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  // Hours today
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  hoursText: { fontSize: 15 },

  // Quick actions
  quickActions: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 4,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackText: { fontSize: 13, fontWeight: "600" },
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 14, fontWeight: "700" },

  // Project picker modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerList: { padding: 16, gap: 10 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 16, fontWeight: "700" },
  pickerAddr: { fontSize: 13, marginTop: 2 },

  // Confirm modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  confirmTitle: { fontSize: 22, fontWeight: "800" },
  confirmSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  confirmSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSecondaryText: { fontSize: 15, fontWeight: "600" },
  confirmPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
