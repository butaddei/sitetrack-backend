import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeFieldLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    projects,
    getActiveTimeLog,
    addEmployeeNote,
    deleteEmployeeNote,
    getProjectNotes,
    addProjectPhoto,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myProjects = projects.filter((p) =>
    p.assignedEmployeeIds.includes(user?.id ?? "")
  );
  const activeLog = user ? getActiveTimeLog(user.id) : undefined;

  // Auto-select: active project first, then first assigned
  const [selectedId, setSelectedId] = useState(
    activeLog?.projectId ?? myProjects[0]?.id ?? ""
  );
  // Sync when activeLog changes
  useEffect(() => {
    if (activeLog?.projectId && activeLog.projectId !== selectedId) {
      setSelectedId(activeLog.projectId);
    }
  }, [activeLog?.projectId]);

  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const selectedProject = projects.find((p) => p.id === selectedId);
  const notes = selectedId ? getProjectNotes(selectedId, user?.id) : [];
  const photos = selectedProject?.photos ?? [];

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toISOString().split("T")[0];
    const dateStr = iso.split("T")[0];
    const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (dateStr === today) return `Today, ${t}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${t}`;
  };

  const handleSave = async () => {
    if (!noteText.trim() || !selectedId || !user) return;
    setSaving(true);
    try {
      await addEmployeeNote(selectedId, user.id, noteText.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNoteText("");
      inputRef.current?.blur();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete note?", "This observation will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEmployeeNote(id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleCamera = async () => {
    if (!selectedId) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera needed", "Allow camera access to take site photos.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!res.canceled && res.assets.length > 0) {
      await addProjectPhoto(selectedId, res.assets[0].uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleLibrary = async () => {
    if (!selectedId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
    });
    if (!res.canceled && res.assets.length > 0) {
      await addProjectPhoto(selectedId, res.assets[0].uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (myProjects.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.accent }]}>
          <Text style={styles.headerTitle}>Field Log</Text>
        </View>
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="book-open" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No projects assigned</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Notes will appear once you're assigned to a project
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Field Log</Text>
        {activeLog && selectedProject ? (
          <View style={[styles.liveChip, { backgroundColor: colors.success + "28" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.liveText, { color: colors.success }]} numberOfLines={1}>
              {selectedProject.name}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Project switcher — only if multiple projects */}
      {myProjects.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.projScroll, { backgroundColor: colors.accent }]}
          contentContainerStyle={styles.projScrollContent}
        >
          {myProjects.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.projChip,
                {
                  backgroundColor:
                    selectedId === p.id ? colors.primary : "rgba(255,255,255,0.12)",
                },
              ]}
              onPress={() => setSelectedId(p.id)}
            >
              {activeLog?.projectId === p.id ? (
                <View style={[styles.projChipDot, { backgroundColor: selectedId === p.id ? "#fff" : colors.success }]} />
              ) : null}
              <Text
                style={[
                  styles.projChipText,
                  { color: selectedId === p.id ? "#fff" : "rgba(255,255,255,0.7)" },
                ]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Write note ── */}
        <View style={[styles.writeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="What did you work on? Any issues or observations..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={noteText}
            onChangeText={setNoteText}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: noteText.trim() ? colors.primary : colors.muted },
            ]}
            onPress={handleSave}
            disabled={!noteText.trim() || saving}
            activeOpacity={0.86}
          >
            <Feather name="check" size={16} color={noteText.trim() ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.saveBtnText, { color: noteText.trim() ? "#fff" : colors.mutedForeground }]}>
              {saving ? "Saving..." : "Save Note"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Photo buttons ── */}
        <View style={styles.photoRow}>
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.primary }]}
            onPress={handleCamera}
            activeOpacity={0.86}
          >
            <Feather name="camera" size={18} color="#fff" />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleLibrary}
            activeOpacity={0.86}
          >
            <Feather name="image" size={18} color={colors.foreground} />
            <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Library</Text>
          </TouchableOpacity>
        </View>

        {/* ── Photos ── */}
        {photos.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </Text>
            <View style={styles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={[styles.photoThumb, { borderColor: colors.border }]}>
                  <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Notes list ── */}
        <View style={styles.section}>
          {notes.length === 0 ? (
            <View style={styles.emptyNotes}>
              <Feather name="edit-3" size={24} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyNotesText, { color: colors.mutedForeground }]}>
                No notes for this project yet
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                {notes.length} observation{notes.length !== 1 ? "s" : ""}
              </Text>
              {notes.map((note) => (
                <View
                  key={note.id}
                  style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.noteAccent, { backgroundColor: colors.primary }]} />
                  <View style={styles.noteBody}>
                    <View style={styles.noteMeta}>
                      <Text style={[styles.noteTime, { color: colors.mutedForeground }]}>
                        {fmtTime(note.createdAt)}
                      </Text>
                      <TouchableOpacity onPress={() => handleDelete(note.id)} hitSlop={12}>
                        <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.noteText, { color: colors.foreground }]}>{note.text}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 100,
    maxWidth: 160,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: "700" },
  projScroll: { maxHeight: 50 },
  projScrollContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: "center" },
  projChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    maxWidth: 200,
  },
  projChipDot: { width: 5, height: 5, borderRadius: 3 },
  projChipText: { fontSize: 13, fontWeight: "600" },
  scroll: { padding: 16, gap: 14 },

  // Write box
  writeBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 90,
    fontSize: 15,
    lineHeight: 22,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 100,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700" },

  // Photo buttons
  photoRow: { flexDirection: "row", gap: 12 },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  photoBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  photoThumb: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  photoImg: { width: "100%", height: "100%" },

  // Sections
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  emptyNotes: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyNotesText: { fontSize: 14 },

  // Note cards
  noteCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  noteAccent: { width: 3, alignSelf: "stretch" },
  noteBody: { flex: 1, padding: 12, gap: 6 },
  noteMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteTime: { fontSize: 11, fontWeight: "500" },
  noteText: { fontSize: 14, lineHeight: 21 },

  // Empty state
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", maxWidth: 240 },
});
