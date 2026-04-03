import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
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

const PAINT_HEX: Record<string, string> = {
  "white dove": "#F8F5EE",
  naval: "#1B2A4A",
  "ultra pure white": "#FFFFFF",
  "steel blue": "#4A7FA5",
  "elephant breath": "#9D9185",
  "off-black": "#2B2B2B",
};
function paintHex(name: string) {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(PAINT_HEX)) {
    if (key.includes(k)) return v;
  }
  return "#94a3b8";
}

const STATUS_LABEL: Record<string, string> = {
  in_progress: "Active",
  pending: "Pending",
  completed: "Completed",
  on_hold: "On Hold",
};
const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  in_progress: { bg: "#22c55e22", fg: "#16a34a" },
  pending: { bg: "#eab30822", fg: "#ca8a04" },
  completed: { bg: "#3b82f622", fg: "#2563eb" },
  on_hold: { bg: "#94a3b822", fg: "#64748b" },
};

export default function EmployeeJobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, getActiveTimeLog } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeLog = user ? getActiveTimeLog(user.id) : undefined;

  // My projects, active-first
  const myProjects = projects
    .filter((p) => p.assignedEmployeeIds.includes(user?.id ?? ""))
    .sort((a, b) => {
      if (a.id === activeLog?.projectId) return -1;
      if (b.id === activeLog?.projectId) return 1;
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      return 0;
    });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.headerTitle}>My Jobs</Text>
          <Text style={styles.headerSub}>
            {myProjects.length} assigned · {myProjects.filter((p) => p.status === "in_progress").length} active
          </Text>
        </View>
        {activeLog ? (
          <View style={[styles.onSiteBadge, { backgroundColor: colors.success + "28" }]}>
            <View style={[styles.onSiteDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.onSiteText, { color: colors.success }]}>On Site</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={myProjects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 32 },
          myProjects.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="briefcase" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No jobs assigned</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Your supervisor will assign you to projects
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <JobCard
            project={item}
            isCurrent={item.id === activeLog?.projectId}
            onPress={() => router.push({ pathname: "/project/[id]", params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

function JobCard({
  project,
  isCurrent,
  onPress,
}: {
  project: Project;
  isCurrent: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const sc = STATUS_COLOR[project.status] ?? STATUS_COLOR.pending;
  const dueDate = project.expectedEndDate
    ? new Date(project.expectedEndDate + "T12:00:00").toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isCurrent ? colors.primary + "50" : colors.border,
          borderLeftColor: isCurrent ? colors.primary : colors.border,
          borderLeftWidth: isCurrent ? 4 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      {/* Top: name + status */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          {isCurrent ? (
            <View style={[styles.activeNow, { backgroundColor: colors.primary + "16" }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.activeNowText, { color: colors.primary }]}>Working Now</Text>
            </View>
          ) : null}
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>
            {project.name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusBadgeText, { color: sc.fg }]}>
            {STATUS_LABEL[project.status] ?? project.status}
          </Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.addrRow}>
        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
        <Text style={[styles.addrText, { color: colors.mutedForeground }]} numberOfLines={2}>
          {project.address}
        </Text>
      </View>

      {/* Due date */}
      {dueDate ? (
        <View style={styles.dueDateRow}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={[styles.dueDateText, { color: colors.mutedForeground }]}>Due {dueDate}</Text>
        </View>
      ) : null}

      {/* Paint colors — compact swatches inline */}
      {project.paintColors.length > 0 ? (
        <View style={[styles.swatchBar, { borderTopColor: colors.border }]}>
          <Feather name="droplet" size={12} color={colors.mutedForeground} />
          <View style={styles.swatches}>
            {project.paintColors.map((c, i) => (
              <View
                key={i}
                style={[
                  styles.swatch,
                  { backgroundColor: paintHex(c), borderColor: colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.swatchLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
            {project.paintColors.join(" · ")}
          </Text>
        </View>
      ) : null}

      {/* Tap hint */}
      <View style={[styles.tapRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.tapText, { color: colors.mutedForeground }]}>View details</Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  onSiteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 100,
  },
  onSiteDot: { width: 7, height: 7, borderRadius: 4 },
  onSiteText: { fontSize: 12, fontWeight: "700" },
  list: { padding: 16, gap: 14 },
  listEmpty: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", maxWidth: 240 },
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
    paddingBottom: 6,
    gap: 10,
  },
  cardTopLeft: { flex: 1, gap: 5 },
  activeNow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeNowText: { fontSize: 11, fontWeight: "700" },
  cardName: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  addrRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  addrText: { flex: 1, fontSize: 13, lineHeight: 18 },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  dueDateText: { fontSize: 12 },
  swatchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  swatches: { flexDirection: "row", gap: 4 },
  swatch: { width: 18, height: 18, borderRadius: 5, borderWidth: 1 },
  swatchLabel: { flex: 1, fontSize: 11 },
  tapRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 3,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tapText: { fontSize: 12 },
});
