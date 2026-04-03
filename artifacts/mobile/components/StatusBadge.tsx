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

export function StatusBadge({ status, size = "md" }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const colors = useColors();

  const bgColor =
    status === "completed"
      ? colors.success
      : status === "in_progress"
      ? colors.primary
      : status === "on_hold"
      ? colors.warning
      : colors.mutedForeground;

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor + "22",
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: bgColor, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6 }]} />
      <Text style={[styles.label, { color: bgColor, fontSize: isSmall ? 10 : 12 }]}>
        {labels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 100,
    gap: 4,
    alignSelf: "flex-start",
  },
  dot: {
    borderRadius: 3,
  },
  label: {
    fontWeight: "600",
  },
});
