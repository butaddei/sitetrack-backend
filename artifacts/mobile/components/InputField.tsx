import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function InputField({ label, error, style, ...props }: InputFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.destructive
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          { color: focused ? colors.primary : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            color: colors.foreground,
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  error: { fontSize: 12 },
});
