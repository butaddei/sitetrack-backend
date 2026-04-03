import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Project, ProjectStatus, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: (ProjectStatus | "all")[] = ["all", "in_progress", "pending", "completed", "on_hold"];
const STATUS_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  in_progress: "Active",
  completed: "Done",
  on_hold: "On Hold",
};

// Hex color map for paint color swatches
const PAINT_COLOR_MAP: Record<string, string> = {
  "White Dove": "#F8F5EE",
  "Naval": "#1B2A4A",
  "Ultra Pure White": "#FFFFFF",
  "Steel Blue": "#4A7FA5",
  "Elephant Breath": "#9D9185",
  "Off-Black": "#2B2B2B",
};

function getColorHex(colorName: string): string {
  for (const [key, hex] of Object.entries(PAINT_COLOR_MAP)) {
    if (colorName.toLowerCase().includes(key.toLowerCase())) return hex;
  }
  return "#94a3b8"; // fallback gray
}

export default function EmployeeProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, getActiveTimeLog } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">("all");

  const myProjects = projects
    .filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""))
    .filter((p) => filterStatus === "all" || p.status === filterStatus);

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;

  const activeCount = projects.filter(
    (p) => p.assignedEmployeeIds.includes(user?.id ?? "") && p.status === "in_progress"
  ).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.headerTitle}>My Projects</Text>
          <Text style={styles.headerSub}>
            {activeCount} active job{activeCount !== 1 ? "s" : ""}
          </Text>
        </View>
        {activeLog ? (
          <View style={[styles.onSitePill, { backgroundColor: colors.success + "30" }]}>
            <View style={[styles.onSiteDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.onSiteText, { color: colors.success }]}>On Site</Text>
          </View>
        ) : null}
      </View>

      {/* Status filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, backgroundColor: colors.background }}
        contentContainerStyle={styles.filters}
      >
        {STATUS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterChip,
              { backgroundColor: filterStatus === s ? colors.primary : colors.muted },
            ]}
            onPress={() => setFilterStatus(s)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterStatus === s ? "#fff" : colors.mutedForeground },
              ]}
            >
              {STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={myProjects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 24 },
          myProjects.length === 0 && styles.emptyFlex,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="folder"
            title="No projects found"
            subtitle={
              filterStatus === "all"
                ? "You haven't been assigned to any projects yet"
                : "No projects with this status"
            }
          />
        }
        renderItem={({ item }) => (
          <ProjectJobCard
            project={item}
            isCurrentJob={activeLog?.projectId === item.id}
            onPress={() => router.push({ pathname: "/project/[id]", params: { id: item.id } })}
            onStart={() => router.push("/(tabs)/emp-home")}
          />
        )}
      />
    </View>
  );
}

function ProjectJobCard({
  project,
  isCurrentJob,
  onPress,
  onStart,
}: {
  project: Project;
  isCurrentJob: boolean;
  onPress: () => void;
  onStart: () => void;
}) {
  const colors = useColors();

  const dueDate = project.expectedEndDate
    ? new Date(project.expectedEndDate + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })
    : null;

  const startDate = project.startDate
    ? new Date(project.startDate + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isCurrentJob ? colors.primary + "60" : colors.border,
          borderLeftColor: isCurrentJob ? colors.primary : colors.border,
          borderLeftWidth: isCurrentJob ? 4 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row: name + status */}
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          {isCurrentJob ? (
            <View style={[styles.activeChip, { backgroundColor: colors.primary + "18" }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.activeChipText, { color: colors.primary }]}>Working Now</Text>
            </View>
          ) : null}
        </View>
        <StatusBadge status={project.status} />
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
        <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={2}>
          {project.address}
        </Text>
      </View>

      {/* Dates */}
      {(startDate || dueDate) ? (
        <View style={styles.datesRow}>
          {startDate ? (
            <View style={styles.dateItem}>
              <Feather name="calendar" size={11} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>Start: {startDate}</Text>
            </View>
          ) : null}
          {dueDate ? (
            <View style={styles.dateItem}>
              <Feather name="flag" size={11} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>Due: {dueDate}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Paint colors */}
      {project.paintColors.length > 0 ? (
        <View style={[styles.colorsSection, { borderTopColor: colors.border }]}>
          <View style={styles.colorsRow}>
            <Feather name="droplet" size={12} color={colors.mutedForeground} />
            <Text style={[styles.colorsLabel, { color: colors.mutedForeground }]}>Paint Colors</Text>
          </View>
          <View style={styles.swatchRow}>
            {project.paintColors.map((c, i) => (
              <View key={i} style={styles.swatchItem}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: getColorHex(c),
                      borderColor: colors.border,
                    },
                  ]}
                />
                <Text style={[styles.swatchName, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {c.split(" ").slice(-2).join(" ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Project notes if any */}
      {project.notes ? (
        <View style={[styles.notesRow, { borderTopColor: colors.border }]}>
          <Feather name="file-text" size={12} color={colors.mutedForeground} />
          <Text style={[styles.notesText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {project.notes}
          </Text>
        </View>
      ) : null}

      {/* Footer: tap indicator */}
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerTap, { color: colors.mutedForeground }]}>
          Tap for full details
        </Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
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
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 1 },
  onSitePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  onSiteDot: { width: 7, height: 7, borderRadius: 4 },
  onSiteText: { fontSize: 12, fontWeight: "700" },
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, gap: 14 },
  emptyFlex: { flex: 1 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 8,
  },
  cardTitleBlock: { flex: 1, marginRight: 10, gap: 5 },
  cardName: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  activeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, alignSelf: "flex-start" },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeChipText: { fontSize: 11, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  addressText: { flex: 1, fontSize: 13, lineHeight: 18 },
  datesRow: { flexDirection: "row", gap: 16, paddingHorizontal: 14, paddingBottom: 10 },
  dateItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 12 },
  colorsSection: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 8 },
  colorsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  colorsLabel: { fontSize: 12, fontWeight: "600" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatchItem: { alignItems: "center", gap: 4, maxWidth: 70 },
  swatch: { width: 36, height: 36, borderRadius: 8, borderWidth: 1 },
  swatchName: { fontSize: 10, textAlign: "center" },
  notesRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  notesText: { flex: 1, fontSize: 12, lineHeight: 17, fontStyle: "italic" },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  footerTap: { fontSize: 12 },
});
