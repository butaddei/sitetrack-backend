import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export function MetricCard({ label, value, subtitle, color, icon }: MetricCardProps) {
  const colors = useColors();
  const accentColor = color ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        {icon ? (
          <View style={[styles.iconBadge, { backgroundColor: accentColor + "18" }]}>
            <Feather name={icon} size={14} color={accentColor} />
          </View>
        ) : (
          <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
        )}
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 6,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});
