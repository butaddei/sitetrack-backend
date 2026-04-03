import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
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

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function WorkLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { projects, timeLogs, clockIn, clockOut, getActiveTimeLog } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;
  const myProjects = projects.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));
  const myLogs = timeLogs
    .filter((l) => l.employeeId === user?.id)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const [elapsed, setElapsed] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const intervalRef = useRef<any>(null);

  const pulse = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    if (activeLog) {
      pulse.value = withRepeat(withTiming(1.08, { duration: 800 }), -1, true);
      intervalRef.current = setInterval(() => {
        const secs = Math.floor(
          (Date.now() - new Date(activeLog.clockIn).getTime()) / 1000
        );
        setElapsed(secs);
      }, 1000);
    } else {
      pulse.value = 1;
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeLog]);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleClockOut = async () => {
    if (!activeLog) return;
    setShowNotes(true);
  };

  const confirmClockOut = async () => {
    if (!activeLog) return;
    await clockOut(activeLog.id, notes);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowNotes(false);
    setNotes("");
  };

  const handleClockIn = async (projectId: string) => {
    if (!user) return;
    await clockIn(user.id, projectId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProjectPicker(false);
  };

  const activeProject = projects.find((p) => p.id === activeLog?.projectId);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>My Work Log</Text>
      </View>

      <View style={[styles.clockSection, { backgroundColor: colors.accent }]}>
        {activeLog ? (
          <View style={styles.clockActive}>
            <Text style={styles.clockLabel}>Working on</Text>
            <Text style={styles.clockProject} numberOfLines={1}>
              {activeProject?.name ?? "Unknown"}
            </Text>
            <Animated.View style={[styles.timerCircle, { backgroundColor: colors.primary }, animStyle]}>
              <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
            </Animated.View>
            <TouchableOpacity
              style={[styles.clockBtn, { backgroundColor: colors.destructive }]}
              onPress={handleClockOut}
              activeOpacity={0.85}
            >
              <Feather name="square" size={18} color="#fff" />
              <Text style={styles.clockBtnText}>Clock Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.clockIdle}>
            <View style={[styles.timerCircle, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Feather name="clock" size={36} color="rgba(255,255,255,0.6)" />
            </View>
            <Text style={styles.idleText}>Not working</Text>
            {myProjects.length > 0 ? (
              <TouchableOpacity
                style={[styles.clockBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowProjectPicker(true)}
                activeOpacity={0.85}
              >
                <Feather name="play" size={18} color="#fff" />
                <Text style={styles.clockBtnText}>Clock In</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noProjectsText}>No projects assigned</Text>
            )}
          </View>
        )}
      </View>

      <Text style={[styles.historyTitle, { color: colors.foreground, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, fontWeight: "700", fontSize: 17 }]}>
        Recent Sessions
      </Text>
      <FlatList
        data={myLogs.slice(0, 20)}
        keyExtractor={(l) => l.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 24 },
          myLogs.length === 0 && styles.emptyFlex,
        ]}
        ListEmptyComponent={
          <EmptyState icon="clock" title="No sessions yet" subtitle="Clock in to start tracking your work" />
        }
        renderItem={({ item }) => {
          const proj = projects.find((p) => p.id === item.projectId);
          const hours = item.totalMinutes ? (item.totalMinutes / 60).toFixed(2) : null;
          const isActive = !item.clockOut;
          return (
            <View
              style={[
                styles.logCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderLeftWidth: isActive ? 3 : 1,
                  borderLeftColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.logTop}>
                <View>
                  <Text style={[styles.logProject, { color: colors.foreground }]} numberOfLines={1}>
                    {proj?.name ?? "Unknown"}
                  </Text>
                  <Text style={[styles.logDate, { color: colors.mutedForeground }]}>
                    {formatDate(item.clockIn)}
                  </Text>
                </View>
                {isActive ? (
                  <View style={[styles.livePill, { backgroundColor: colors.primary + "20" }]}>
                    <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.liveText, { color: colors.primary }]}>Live</Text>
                  </View>
                ) : hours ? (
                  <Text style={[styles.hoursText, { color: colors.foreground }]}>{hours}h</Text>
                ) : null}
              </View>
              <View style={styles.logTimes}>
                <TimeChip icon="log-in" time={formatTime(item.clockIn)} color={colors.success} />
                {item.clockOut ? (
                  <TimeChip icon="log-out" time={formatTime(item.clockOut)} color={colors.destructive} />
                ) : null}
              </View>
              {item.notes ? (
                <Text style={[styles.logNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={showProjectPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Project</Text>
            <View style={{ width: 22 }} />
          </View>
          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.projOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleClockIn(item.id)}
              >
                <View>
                  <Text style={[styles.projOptionName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.projOptionAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal visible={showNotes} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowNotes(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Clock Out</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={{ padding: 20, gap: 16 }}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>
              Add notes for this session (optional)
            </Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="What did you work on?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <TouchableOpacity
              style={[styles.clockBtn, { backgroundColor: colors.destructive }]}
              onPress={confirmClockOut}
            >
              <Text style={styles.clockBtnText}>Confirm Clock Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TimeChip({ icon, time, color }: { icon: string; time: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.timeChip}>
      <Feather name={icon as any} size={11} color={color} />
      <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  clockSection: { padding: 20, paddingBottom: 32 },
  clockActive: { alignItems: "center", gap: 8 },
  clockIdle: { alignItems: "center", gap: 12 },
  clockLabel: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "500" },
  clockProject: { color: "#fff", fontSize: 18, fontWeight: "700" },
  timerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  timerText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 1 },
  clockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 100,
  },
  clockBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  idleText: { color: "rgba(255,255,255,0.65)", fontSize: 16, fontWeight: "500" },
  noProjectsText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  historyTitle: {},
  list: { paddingHorizontal: 16, gap: 10 },
  emptyFlex: { flex: 1 },
  logCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logProject: { fontSize: 14, fontWeight: "700" },
  logDate: { fontSize: 12, marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: "600" },
  hoursText: { fontSize: 16, fontWeight: "700" },
  logTimes: { flexDirection: "row", gap: 12 },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12 },
  logNotes: { fontSize: 12, fontStyle: "italic" },
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
  projOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 14, borderWidth: 1 },
  projOptionName: { fontSize: 15, fontWeight: "600" },
  projOptionAddr: { fontSize: 12, marginTop: 2 },
  notesLabel: { fontSize: 14 },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 100, fontSize: 15, textAlignVertical: "top" },
});
