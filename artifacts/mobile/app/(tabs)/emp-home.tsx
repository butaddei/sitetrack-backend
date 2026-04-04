import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { Project, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hms(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
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

  // ── State ──
  const [showPicker, setShowPicker] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [clockInError, setClockInError] = useState("");
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // ── Start ──
  function handleStartPress() {
    setClockInError("");
    if (myProjects.length === 0) return;
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

  // ── Stop ──
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

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const noProjects = myProjects.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.greetText, { color: colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[styles.nameText, { color: colors.foreground }]}>
            {user?.name?.split(" ")[0]}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/emp-profile")}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main content ── */}
      <View style={[styles.main, { paddingBottom: botPad + 24 }]}>

        {/* Current project card */}
        <View style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isWorking && activeProject ? (
            <>
              <View style={[styles.projectIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="briefcase" size={18} color={colors.primary} />
              </View>
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.foreground }]} numberOfLines={1}>
                  {activeProject.name}
                </Text>
                {activeProject.address ? (
                  <Text style={[styles.projectAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {activeProject.address}
                  </Text>
                ) : null}
              </View>
            </>
          ) : noProjects ? (
            <>
              <View style={[styles.projectIconWrap, { backgroundColor: colors.muted }]}>
                <Feather name="inbox" size={18} color={colors.mutedForeground} />
              </View>
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.mutedForeground }]}>
                  No projects assigned
                </Text>
                <Text style={[styles.projectAddr, { color: colors.mutedForeground }]}>
                  Contact your manager
                </Text>
              </View>
            </>
          ) : myProjects.length === 1 ? (
            <>
              <View style={[styles.projectIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="briefcase" size={18} color={colors.primary} />
              </View>
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.foreground }]} numberOfLines={1}>
                  {myProjects[0].name}
                </Text>
                {myProjects[0].address ? (
                  <Text style={[styles.projectAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {myProjects[0].address}
                  </Text>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={[styles.projectIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="layers" size={18} color={colors.primary} />
              </View>
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.foreground }]}>
                  {myProjects.length} projects assigned
                </Text>
                <Text style={[styles.projectAddr, { color: colors.mutedForeground }]}>
                  Select one to start
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Status label */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isWorking
                  ? colors.success
                  : dailyHours > 0
                  ? colors.primary
                  : colors.mutedForeground,
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {isWorking
              ? "Currently working"
              : dailyHours > 0
              ? "Session ended"
              : noProjects
              ? "No project assigned"
              : "Ready to start"}
          </Text>
        </View>

        {/* ── TIMER ── */}
        <Text
          style={[
            styles.timerDisplay,
            {
              color: isWorking
                ? colors.foreground
                : colors.mutedForeground,
            },
          ]}
        >
          {isWorking ? hms(elapsed) : "00:00:00"}
        </Text>

        {/* ── ACTION BUTTON ── */}
        {isWorking ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.destructive, opacity: clockingOut ? 0.7 : 1 }]}
            onPress={() => setShowStopConfirm(true)}
            activeOpacity={0.88}
            disabled={clockingOut}
          >
            {clockingOut ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="square" size={26} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>
              {clockingOut ? "Stopping…" : "Stop Work"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: noProjects ? colors.muted : colors.primary,
                opacity: noProjects || clockingIn ? 0.7 : 1,
              },
            ]}
            onPress={handleStartPress}
            activeOpacity={0.88}
            disabled={noProjects || clockingIn}
          >
            {clockingIn ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="play" size={26} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>
              {clockingIn ? "Starting…" : dailyHours > 0 ? "Start Another" : "Start Work"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Clock-in error */}
        {clockInError ? (
          <View style={[styles.errorPill, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "35" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
          </View>
        ) : null}

        {/* ── HOURS TODAY ── */}
        <LinearGradient
          colors={[colors.primary + "18", colors.primary + "08"]}
          style={[styles.hoursCard, { borderColor: colors.primary + "25" }]}
        >
          <Text style={[styles.hoursNumber, { color: dailyHours > 0 ? colors.primary : colors.mutedForeground }]}>
            {dailyHours.toFixed(1)}
          </Text>
          <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>hours today</Text>
        </LinearGradient>
      </View>

      {/* ── Project picker modal ── */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowPicker(false)}>
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
                <View style={[styles.pickerIcon, { backgroundColor: colors.primary + "18" }]}>
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

      {/* ── Stop confirmation modal ── */}
      <Modal visible={showStopConfirm} animationType="fade" transparent onRequestClose={() => setShowStopConfirm(false)}>
        <View style={styles.overlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="square" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>End session?</Text>
            <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
              You've been working for{" "}
              <Text style={{ fontWeight: "700", color: colors.foreground }}>{hms(elapsed)}</Text>
              . Your time will be saved automatically.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmBtnSecondary, { borderColor: colors.border, backgroundColor: colors.muted }]}
                onPress={() => setShowStopConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmBtnSecondaryText, { color: colors.foreground }]}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtnPrimary, { backgroundColor: colors.destructive, opacity: clockingOut ? 0.7 : 1 }]}
                onPress={doClockOut}
                activeOpacity={0.88}
                disabled={clockingOut}
              >
                {clockingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnPrimaryText}>Stop Work</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  greetText: { fontSize: 13, fontWeight: "500" },
  nameText: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 1 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Main
  main: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 20,
  },

  // Project card
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  projectIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  projectText: { flex: 1 },
  projectName: { fontSize: 16, fontWeight: "700" },
  projectAddr: { fontSize: 13, marginTop: 2 },

  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: "500" },

  // Timer
  timerDisplay: {
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: -2,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  // Action button
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 72,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // Error
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  // Hours today
  hoursCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 20,
    alignItems: "center",
    gap: 4,
  },
  hoursNumber: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  hoursLabel: { fontSize: 14, fontWeight: "500" },

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
  pickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 16, fontWeight: "700" },
  pickerAddr: { fontSize: 13, marginTop: 2 },

  // Stop confirm modal
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
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  confirmTitle: { fontSize: 22, fontWeight: "800" },
  confirmSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  confirmBtnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnSecondaryText: { fontSize: 15, fontWeight: "600" },
  confirmBtnPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
