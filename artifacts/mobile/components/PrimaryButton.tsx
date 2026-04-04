import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "secondary" | "ghost";
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: PrimaryButtonProps) {
  const colors = useColors();

  const isDisabled = disabled || loading;

  if (variant === "ghost") {
    return (
      <TouchableOpacity
        style={[styles.button, styles.ghost, { borderColor: colors.border, opacity: isDisabled ? 0.5 : 1 }]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={[styles.ghostLabel, { color: colors.foreground }]}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  const bgColor =
    variant === "danger"
      ? colors.destructive
      : variant === "secondary"
      ? colors.secondary
      : colors.primary;

  const gradientEnd = variant === "primary" ? colors.primary + "CC" : bgColor;

  return (
    <TouchableOpacity
      style={[styles.wrapper, { opacity: isDisabled ? 0.55 : 1 }]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      <LinearGradient
        colors={[bgColor, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ghost: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  ghostLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
