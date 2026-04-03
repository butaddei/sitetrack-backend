import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { Project, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeNotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    projects,
    employeeNotes,
    addEmployeeNote,
    deleteEmployeeNote,
    getProjectNotes,
    addProjectPhoto,
  } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myProjects = projects.filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""));

  const [selectedProjectId, setSelectedProjectId] = useState<string>(myProjects[0]?.id ?? "");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "photos">("notes");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectNotes = selectedProjectId
    ? getProjectNotes(selectedProjectId, user?.id)
    : [];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toISOString().split("T")[0];
    const date = iso.split("T")[0];
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (date === today) return `Today ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedProjectId || !user) return;
    setSaving(true);
    try {
      await addEmployeeNote(selectedProjectId, user.id, noteText);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNoteText("");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert("Delete Note", "Remove this observation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEmployeeNote(noteId);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handlePickPhoto = async () => {
    if (!selectedProjectId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photo library to upload site photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      await addProjectPhoto(selectedProjectId, result.assets[0].uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleTakePhoto = async () => {
    if (!selectedProjectId) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take site photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      await addProjectPhoto(selectedProjectId, result.assets[0].uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (myProjects.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
          <Text style={styles.headerTitle}>Notes & Photos</Text>
        </View>
        <EmptyState icon="file-text" title="No projects assigned" subtitle="Your notes will appear here once you're assigned to a project" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <Text style={styles.headerTitle}>Notes & Photos</Text>
      </View>

      {/* Project selector */}
      <TouchableOpacity
        style={[styles.projectSelector, { backgroundColor: colors.accent, borderBottomColor: "rgba(255,255,255,0.1)" }]}
        onPress={() => setShowProjectPicker(true)}
        activeOpacity={0.85}
      >
        <View style={styles.projectSelectorLeft}>
          <Text style={styles.projectSelectorLabel}>Project</Text>
          <Text style={styles.projectSelectorName} numberOfLines={1}>
            {selectedProject?.name ?? "Select a project"}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      {/* Tab toggle */}
      <View style={[styles.tabToggle, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {(["notes", "photos"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              { borderBottomColor: activeTab === tab ? colors.primary : "transparent", borderBottomWidth: 2.5 },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Feather
              name={tab === "notes" ? "file-text" : "camera"}
              size={15}
              color={activeTab === tab ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab === "notes" ? "Observations" : "Site Photos"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "notes" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.notesScroll, { paddingBottom: botPad + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Add note */}
          <View style={[styles.addNoteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.addNoteHeader}>
              <Feather name="edit-3" size={15} color={colors.primary} />
              <Text style={[styles.addNoteTitle, { color: colors.foreground }]}>Add Observation</Text>
            </View>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Describe what you worked on, any issues, materials used..."
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
              onPress={handleSaveNote}
              disabled={!noteText.trim() || saving}
              activeOpacity={0.85}
            >
              <Feather name="check" size={15} color={noteText.trim() ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.saveBtnText, { color: noteText.trim() ? "#fff" : colors.mutedForeground }]}>
                {saving ? "Saving..." : "Save Observation"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes list */}
          {projectNotes.length === 0 ? (
            <View style={styles.emptyNotes}>
              <Feather name="file-text" size={36} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyNotesTitle, { color: colors.foreground }]}>No observations yet</Text>
              <Text style={[styles.emptyNotesSub, { color: colors.mutedForeground }]}>
                Add your first note above
              </Text>
            </View>
          ) : (
            <View style={styles.notesList}>
              <Text style={[styles.notesCount, { color: colors.mutedForeground }]}>
                {projectNotes.length} observation{projectNotes.length !== 1 ? "s" : ""}
              </Text>
              {projectNotes.map((note) => (
                <View
                  key={note.id}
                  style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.noteCardTop}>
                    <Text style={[styles.noteTime, { color: colors.mutedForeground }]}>
                      {formatDateTime(note.createdAt)}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteNote(note.id)} hitSlop={10}>
                      <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.noteText, { color: colors.foreground }]}>{note.text}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        /* Photos tab */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.photosScroll, { paddingBottom: botPad + 32 }]}
        >
          {/* Add photo buttons */}
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[styles.photoActionBtn, { backgroundColor: colors.primary }]}
              onPress={handleTakePhoto}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={18} color="#fff" />
              <Text style={styles.photoActionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoActionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={handlePickPhoto}
              activeOpacity={0.85}
            >
              <Feather name="image" size={18} color={colors.foreground} />
              <Text style={[styles.photoActionText, { color: colors.foreground }]}>From Library</Text>
            </TouchableOpacity>
          </View>

          {/* Paint colors reference */}
          {selectedProject?.paintColors && selectedProject.paintColors.length > 0 ? (
            <View style={[styles.colorsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.colorsCardHeader}>
                <Feather name="droplet" size={14} color={colors.primary} />
                <Text style={[styles.colorsCardTitle, { color: colors.foreground }]}>Paint Colors</Text>
              </View>
              {selectedProject.paintColors.map((c, i) => (
                <View key={i} style={[styles.colorRow, { borderTopColor: colors.border }]}>
                  <View
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: getColorHex(c),
                        borderColor: colors.border,
                      },
                    ]}
                  />
                  <Text style={[styles.colorName, { color: colors.foreground }]}>{c}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Photo grid */}
          {selectedProject?.photos && selectedProject.photos.length > 0 ? (
            <View style={styles.photoSection}>
              <Text style={[styles.photoSectionTitle, { color: colors.foreground }]}>
                Site Photos ({selectedProject.photos.length})
              </Text>
              <View style={styles.photoGrid}>
                {selectedProject.photos.map((uri, i) => (
                  <View key={i} style={[styles.photoThumb, { borderColor: colors.border }]}>
                    <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyPhotos}>
              <Feather name="camera" size={36} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyPhotosTitle, { color: colors.foreground }]}>No photos yet</Text>
              <Text style={[styles.emptyPhotosSub, { color: colors.mutedForeground }]}>
                Take a photo or upload from your library
              </Text>
            </View>
          )}

          {/* Documents */}
          {selectedProject?.documents && selectedProject.documents.length > 0 ? (
            <View style={[styles.docsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.docsHeader}>
                <Feather name="paperclip" size={14} color={colors.primary} />
                <Text style={[styles.docsTitle, { color: colors.foreground }]}>Floor Plans & Documents</Text>
              </View>
              {selectedProject.documents.map((doc, i) => (
                <View key={i} style={[styles.docRow, { borderTopColor: colors.border }]}>
                  <Feather name="file" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1}>{doc}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
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
          <FlatList
            data={myProjects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.projPickRow,
                  {
                    backgroundColor: item.id === selectedProjectId ? colors.primary + "15" : colors.card,
                    borderColor: item.id === selectedProjectId ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedProjectId(item.id);
                  setShowProjectPicker(false);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.projPickInfo}>
                  <Text style={[styles.projPickName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.projPickAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                {item.id === selectedProjectId ? (
                  <Feather name="check-circle" size={18} color={colors.primary} />
                ) : (
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    "White Dove": "#F8F5EE",
    "Naval": "#1B2A4A",
    "Ultra Pure White": "#FFFFFF",
    "Steel Blue": "#4A7FA5",
    "Elephant Breath": "#9D9185",
    "Off-Black": "#2B2B2B",
  };
  for (const [key, hex] of Object.entries(map)) {
    if (colorName.toLowerCase().includes(key.toLowerCase())) return hex;
  }
  return "#94a3b8";
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  projectSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  projectSelectorLeft: { flex: 1 },
  projectSelectorLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  projectSelectorName: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 2 },
  tabToggle: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: "600" },
  notesScroll: { padding: 16, gap: 16 },
  addNoteBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  addNoteHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  addNoteTitle: { fontSize: 14, fontWeight: "700" },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    lineHeight: 22,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 100,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700" },
  emptyNotes: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyNotesTitle: { fontSize: 16, fontWeight: "700" },
  emptyNotesSub: { fontSize: 13, textAlign: "center" },
  notesList: { gap: 10 },
  notesCount: { fontSize: 12, fontWeight: "600" },
  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  noteCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteTime: { fontSize: 11, fontWeight: "500" },
  noteText: { fontSize: 14, lineHeight: 21 },
  photosScroll: { padding: 16, gap: 16 },
  photoActions: { flexDirection: "row", gap: 12 },
  photoActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  photoActionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  colorsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  colorsCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  colorsCardTitle: { fontSize: 14, fontWeight: "700" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  colorSwatch: { width: 32, height: 32, borderRadius: 8, borderWidth: 1 },
  colorName: { flex: 1, fontSize: 13 },
  photoSection: { gap: 10 },
  photoSectionTitle: { fontSize: 14, fontWeight: "700" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: "31%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", borderWidth: 1 },
  photoImg: { width: "100%", height: "100%" },
  emptyPhotos: { alignItems: "center", paddingTop: 32, gap: 8 },
  emptyPhotosTitle: { fontSize: 16, fontWeight: "700" },
  emptyPhotosSub: { fontSize: 13, textAlign: "center" },
  docsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  docsHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  docsTitle: { fontSize: 14, fontWeight: "700" },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  docName: { flex: 1, fontSize: 13 },
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
  projPickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 14, borderWidth: 1 },
  projPickInfo: { flex: 1, gap: 3 },
  projPickName: { fontSize: 15, fontWeight: "600" },
  projPickAddr: { fontSize: 12 },
});
