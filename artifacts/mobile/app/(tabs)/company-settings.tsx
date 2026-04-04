import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const COLOR_PRESETS = [
  { name: "Orange", primary: "#f97316", secondary: "#0f172a" },
  { name: "Blue", primary: "#3b82f6", secondary: "#1e293b" },
  { name: "Green", primary: "#22c55e", secondary: "#14532d" },
  { name: "Purple", primary: "#a855f7", secondary: "#1e1b4b" },
  { name: "Red", primary: "#ef4444", secondary: "#1c1917" },
  { name: "Teal", primary: "#14b8a6", secondary: "#0f172a" },
  { name: "Indigo", primary: "#6366f1", secondary: "#1e1b4b" },
  { name: "Pink", primary: "#ec4899", secondary: "#1c1917" },
];

export default function CompanySettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuth();

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const router = useRouter();
  const [companyName, setCompanyName] = useState(user.companyName ?? "");
  const [primaryColor, setPrimaryColor] = useState(user.primaryColor ?? "#f97316");
  const [secondaryColor, setSecondaryColor] = useState(user.secondaryColor ?? "#0f172a");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await apiFetch<{
        name: string;
        primaryColor: string;
        secondaryColor: string;
      }>("/company", {
        method: "PATCH",
        body: JSON.stringify({
          name: companyName.trim(),
          primaryColor,
          secondaryColor,
        }),
      });
      updateUser({
        companyName: updated.name,
        primaryColor: updated.primaryColor,
        secondaryColor: updated.secondaryColor,
      });
      setSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update company settings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              paddingTop: topPad + 8,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Company Settings</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Company info */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Company Information</Text>
            <InputField
              label="Company Name"
              value={companyName}
              onChangeText={(t) => { setCompanyName(t); setError(""); setSuccess(false); }}
              autoCapitalize="words"
              placeholder="Your company name"
            />
          </View>

          {/* Brand colors */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Brand Colors</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Choose a color scheme for your company's app experience.
            </Text>

            {/* Preview badge */}
            <View style={styles.previewRow}>
              <View style={[styles.previewBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.previewText}>Primary</Text>
              </View>
              <View style={[styles.previewBadge, { backgroundColor: secondaryColor }]}>
                <Text style={styles.previewText}>Secondary</Text>
              </View>
            </View>

            {/* Color preset grid */}
            <View style={styles.presetGrid}>
              {COLOR_PRESETS.map((preset) => {
                const isSelected =
                  preset.primary === primaryColor && preset.secondary === secondaryColor;
                return (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: isSelected ? primaryColor : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                      setError("");
                      setSuccess(false);
                    }}
                  >
                    <View style={styles.presetSwatch}>
                      <View
                        style={[styles.swatchHalf, { backgroundColor: preset.primary }]}
                      />
                      <View
                        style={[styles.swatchHalf, { backgroundColor: preset.secondary }]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.presetName,
                        { color: isSelected ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      {preset.name}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="check-circle"
                        size={12}
                        color={primaryColor}
                        style={styles.presetCheck}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Company stats (read-only) */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Company Info</Text>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Company ID</Text>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: "monospace" }]}>
                {user.companyId.slice(0, 8)}...
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Your Role</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>Administrator</Text>
            </View>
          </View>

          {error ? (
            <View style={[styles.alertBox, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.alertText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={[styles.alertBox, { backgroundColor: colors.success + "15" }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.alertText, { color: colors.success }]}>
                Company settings saved successfully
              </Text>
            </View>
          ) : null}

          <PrimaryButton label="Save Settings" onPress={handleSave} loading={loading} />

          {/* Account actions */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account</Text>
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/profile-settings")}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="user" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Profile Settings</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                Alert.alert("Sign out?", "You'll need to sign back in to continue.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      logout();
                    },
                  },
                ]);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.destructive + "15" }]}>
                <Feather name="log-out" size={16} color={colors.destructive} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.destructive }]}>Sign Out</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { padding: 16, gap: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  previewRow: { flexDirection: "row", gap: 10 },
  previewBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  previewText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetItem: {
    width: "47%",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: "center",
    position: "relative",
  },
  presetSwatch: {
    flexDirection: "row",
    width: 48,
    height: 24,
    borderRadius: 8,
    overflow: "hidden",
  },
  swatchHalf: { flex: 1 },
  presetName: { fontSize: 12, fontWeight: "600" },
  presetCheck: { position: "absolute", top: 6, right: 6 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  alertText: { fontSize: 13, flex: 1 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "500" },
});
