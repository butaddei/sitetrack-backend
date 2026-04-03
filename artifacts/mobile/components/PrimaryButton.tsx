import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

import { useColors } from "@/hooks/useColors";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "secondary" | "ghost";
  icon?: keyof typeof Feather.glyphMap;
  size?: "sm" | "md" | "lg";
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  size = "md",
}: PrimaryButtonProps) {
  const colors = useColors();

  const bgColor =
    variant === "danger"
      ? colors.destructive
      : variant === "secondary"
      ? colors.accent
      : variant === "ghost"
      ? "transparent"
      : colors.primary;

  const textColor = variant === "ghost" ? colors.primary : "#fff";
  const borderColor = variant === "ghost" ? colors.primary : "transparent";

  const heights = { sm: 42, md: 54, lg: 62 };
  const fontSizes = { sm: 13, md: 15, lg: 17 };
  const radii = { sm: 10, md: 14, lg: 16 };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          opacity: disabled || loading ? 0.55 : 1,
          height: heights[size],
          borderRadius: radii[size],
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor,
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={fontSizes[size] + 1} color={textColor} /> : null}
          <Text style={[styles.label, { color: textColor, fontSize: fontSizes[size] }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
