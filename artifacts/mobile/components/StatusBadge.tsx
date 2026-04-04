import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { ProjectStatus } from "@/context/DataContext";

const labels: Record<ProjectStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const colors = useColors();

  const bgColor =
    status === "completed"
      ? colors.success
      : status === "in_progress"
      ? colors.primary
      : status === "on_hold"
      ? colors.warning
      : colors.mutedForeground;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor + "14", borderColor: bgColor + "40" }]}>
      <View style={[styles.dot, { backgroundColor: bgColor }]} />
      <Text style={[styles.label, { color: bgColor }]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
