import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
          Animated.timing(pulseAnim, { toValue: 1.14, duration: 950, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
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

  const greeting = getGreeting();

  // ── Derived display values ──
  const displayProject = isWorking
    ? activeProject
    : myProjects.length === 1
    ? myProjects[0]
    : null;

  const btnDisabled = (noProjects && !isWorking) || clockingIn || clockingOut;
  const hourlyRateDisplay = `$${Number(user?.hourlyRate ?? 0).toFixed(0)}/hr`;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={true}
    >

      {/* ─── Gradient header ──────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.accent, colors.accent + "cc"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user?.name?.split(" ")[0]}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push("/(tabs)/emp-profile")}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.headerStatusBadge, {
          backgroundColor: isWorking
            ? "rgba(34,197,94,0.18)"
            : "rgba(255,255,255,0.10)",
          borderColor: isWorking
            ? "rgba(34,197,94,0.35)"
            : "rgba(255,255,255,0.18)",
        }]}>
          <View style={[styles.headerStatusDot, {
            backgroundColor: isWorking ? "#22c55e" : "rgba(255,255,255,0.45)",
          }]} />
          <Text style={[styles.headerStatusText, {
            color: isWorking ? "#4ade80" : "rgba(255,255,255,0.65)",
          }]}>
            {isWorking
              ? "Currently on site"
              : dailyHours > 0
              ? `${dailyHours.toFixed(1)}h logged today`
              : "Ready to start"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>

        {/* ─── Project card ────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="briefcase" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.cardSectionTitle, { color: colors.mutedForeground }]}>
              CURRENT PROJECT
            </Text>
          </View>

          {displayProject ? (
            <View style={styles.projectContent}>
              <View style={[styles.projectIndicator, {
                backgroundColor: isWorking ? colors.success : colors.primary,
              }]} />
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.foreground }]} numberOfLines={1}>
                  {displayProject.name}
                </Text>
                {displayProject.address ? (
                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.projectAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {displayProject.address}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : myProjects.length > 1 ? (
            <View style={styles.projectContent}>
              <View style={[styles.projectIndicator, { backgroundColor: colors.primary }]} />
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.foreground }]}>
                  {myProjects.length} projects available
                </Text>
                <Text style={[styles.projectAddr, { color: colors.mutedForeground }]}>
                  Tap Start to select one
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.projectContent}>
              <View style={[styles.projectIndicator, { backgroundColor: colors.mutedForeground }]} />
              <View style={styles.projectText}>
                <Text style={[styles.projectName, { color: colors.mutedForeground }]}>
                  No project assigned yet
                </Text>
                <Text style={[styles.projectAddr, { color: colors.mutedForeground }]}>
                  Contact your manager
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ─── Timer card ──────────────────────────────────────────────────── */}
        <View style={[styles.timerCard, {
          backgroundColor: isWorking ? colors.primary : colors.card,
          borderColor: isWorking ? colors.primary : colors.border,
          shadowColor: isWorking ? colors.primary : "#000",
        }]}>

          {/* Status pill */}
          <View style={[styles.timerStatusPill, {
            backgroundColor: isWorking
              ? "rgba(255,255,255,0.15)"
              : dailyHours > 0 ? colors.primary + "14" : colors.muted,
            borderColor: isWorking
              ? "rgba(255,255,255,0.25)"
              : dailyHours > 0 ? colors.primary + "30" : colors.border,
          }]}>
            <View style={[styles.timerStatusDot, {
              backgroundColor: isWorking ? "#fff"
                : dailyHours > 0 ? colors.primary : colors.mutedForeground,
            }]} />
            <Text style={[styles.timerStatusText, {
              color: isWorking ? "rgba(255,255,255,0.9)"
                : dailyHours > 0 ? colors.primary : colors.mutedForeground,
            }]}>
              {isWorking
                ? "Working now"
                : dailyHours > 0
                ? "Session paused"
                : noProjects ? "No project assigned" : "Ready to start"}
            </Text>
          </View>

          {/* Timer display */}
          <Text style={[styles.timer, {
            color: isWorking ? "#fff" : colors.mutedForeground,
          }]}>
            {isWorking ? hms(elapsed) : "00:00:00"}
          </Text>

          {/* Big action button */}
          <View style={styles.btnWrap}>
            {isWorking && (
              <Animated.View style={[styles.pulseRing, {
                borderColor: "rgba(255,255,255,0.22)",
                transform: [{ scale: pulseAnim }],
              }]} />
            )}
            <TouchableOpacity
              style={[styles.bigBtn, {
                backgroundColor: isWorking
                  ? "#ffffff"
                  : noProjects ? colors.muted : colors.success,
                opacity: btnDisabled ? 0.55 : 1,
                shadowColor: isWorking ? "#fff" : colors.success,
              }]}
              onPress={isWorking ? () => setShowStopConfirm(true) : handleStartPress}
              activeOpacity={0.88}
              disabled={btnDisabled}
            >
              {clockingIn || clockingOut ? (
                <ActivityIndicator
                  color={isWorking ? colors.primary : "#fff"}
                  size="large"
                />
              ) : isWorking ? (
                <Feather name="square" size={40} color={colors.primary} />
              ) : (
                <Feather name="play" size={40} color="#fff" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.btnLabel, {
            color: isWorking ? "rgba(255,255,255,0.55)" : colors.mutedForeground,
          }]}>
            {clockingIn ? "STARTING…"
              : clockingOut ? "STOPPING…"
              : isWorking ? "TAP TO STOP"
              : noProjects ? "NO PROJECT"
              : "TAP TO START"}
          </Text>

          {/* Clock-in error */}
          {clockInError ? (
            <View style={[styles.errorPill, {
              backgroundColor: colors.destructive + "18",
              borderColor: colors.destructive + "40",
            }]}>
              <Feather name="alert-circle" size={13} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{clockInError}</Text>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={[styles.statsRow, {
            borderTopColor: isWorking ? "rgba(255,255,255,0.15)" : colors.border,
          }]}>
            <View style={styles.statItem}>
              <Feather
                name="clock"
                size={14}
                color={isWorking ? "rgba(255,255,255,0.55)" : colors.mutedForeground}
              />
              <Text style={[styles.statValue, {
                color: isWorking ? "#fff" : colors.foreground,
              }]}>
                {dailyHours.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, {
                color: isWorking ? "rgba(255,255,255,0.55)" : colors.mutedForeground,
              }]}>
                today
              </Text>
            </View>
            <View style={[styles.statDivider, {
              backgroundColor: isWorking ? "rgba(255,255,255,0.15)" : colors.border,
            }]} />
            <View style={styles.statItem}>
              <Feather
                name="dollar-sign"
                size={14}
                color={isWorking ? "rgba(255,255,255,0.55)" : colors.mutedForeground}
              />
              <Text style={[styles.statValue, {
                color: isWorking ? "#fff" : colors.foreground,
              }]}>
                {hourlyRateDisplay}
              </Text>
              <Text style={[styles.statLabel, {
                color: isWorking ? "rgba(255,255,255,0.55)" : colors.mutedForeground,
              }]}>
                rate
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Quick Actions ───────────────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            QUICK ACTIONS
          </Text>

          {photoFeedback ? (
            <View style={[styles.feedbackPill, {
              backgroundColor: colors.success + "18",
              borderColor: colors.success + "40",
            }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.feedbackText, { color: colors.success }]}>{photoFeedback}</Text>
            </View>
          ) : null}

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handlePhoto}
              activeOpacity={0.78}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Photo</Text>
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>Upload site photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleNote}
              activeOpacity={0.78}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.foreground + "0e" }]}>
                <Feather name="edit-3" size={22} color={colors.foreground} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Note</Text>
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>Add work note</Text>
            </TouchableOpacity>
          </View>
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
            <View style={[styles.modalError, {
              backgroundColor: colors.destructive + "12",
              borderColor: colors.destructive + "30",
            }]}>
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
  scrollContent: { flexGrow: 1 },

  // Gradient header
  gradientHeader: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: { gap: 2 },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  userName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  avatarButton: {
    marginTop: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  headerStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  headerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Body
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },

  // Generic card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // Project card
  projectContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  projectIndicator: {
    width: 4,
    height: 44,
    borderRadius: 2,
    flexShrink: 0,
  },
  projectText: { flex: 1, gap: 4 },
  projectName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  projectAddr: {
    fontSize: 13,
    flex: 1,
  },

  // Timer card
  timerCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 0,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
    gap: 18,
    overflow: "hidden",
  },
  timerStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
  },
  timerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  timerStatusText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  timer: {
    fontSize: 70,
    fontWeight: "900",
    letterSpacing: -3,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    marginTop: -4,
  },
  btnWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pulseRing: {
    position: "absolute",
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 3,
  },
  bigBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginTop: -8,
  },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  // Stats row at bottom of timer card
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    width: "100%",
    paddingVertical: 18,
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  // Quick actions
  actionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    paddingLeft: 2,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackText: { fontSize: 13, fontWeight: "600" },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.045,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  actionSub: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },

  // ── Modals ──
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
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerList: { padding: 16, gap: 10 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerInfo: { flex: 1, gap: 3 },
  pickerName: { fontSize: 16, fontWeight: "700" },
  pickerAddr: { fontSize: 13 },

  // Stop confirm modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: { fontSize: 20, fontWeight: "800" },
  confirmSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  confirmBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 4,
  },
  confirmSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmSecondaryText: { fontSize: 15, fontWeight: "700" },
  confirmPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  confirmPrimaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
