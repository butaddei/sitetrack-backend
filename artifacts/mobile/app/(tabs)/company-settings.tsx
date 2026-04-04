import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
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
  { name: "Ember",    primary: "#f97316", secondary: "#1c0a00", hex: "#f97316" },
  { name: "Ocean",    primary: "#3b82f6", secondary: "#0f1e3c", hex: "#3b82f6" },
  { name: "Forest",   primary: "#22c55e", secondary: "#0a1f12", hex: "#22c55e" },
  { name: "Grape",    primary: "#a855f7", secondary: "#1a0a2e", hex: "#a855f7" },
  { name: "Crimson",  primary: "#ef4444", secondary: "#1c0a0a", hex: "#ef4444" },
  { name: "Teal",     primary: "#14b8a6", secondary: "#031a18", hex: "#14b8a6" },
  { name: "Indigo",   primary: "#6366f1", secondary: "#0f0e24", hex: "#6366f1" },
  { name: "Rose",     primary: "#ec4899", secondary: "#1c0a13", hex: "#ec4899" },
  { name: "Amber",    primary: "#f59e0b", secondary: "#1c1200", hex: "#f59e0b" },
  { name: "Slate",    primary: "#64748b", secondary: "#0f172a", hex: "#64748b" },
  { name: "Lime",     primary: "#84cc16", secondary: "#0d1a00", hex: "#84cc16" },
  { name: "Sky",      primary: "#0ea5e9", secondary: "#031626", hex: "#0ea5e9" },
];

export default function CompanySettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();

  const [companyName, setCompanyName] = useState(user?.companyName ?? "");
  const [primaryColor, setPrimaryColor] = useState(user?.primaryColor ?? "#f97316");
  const [secondaryColor, setSecondaryColor] = useState(user?.secondaryColor ?? "#0f172a");
  const [logoUri, setLogoUri] = useState<string | null>(user?.logoUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (user?.role !== "admin") return <Redirect href="/(tabs)/emp-home" />;

  const companyInitial = (companyName || user?.companyName || "C")[0].toUpperCase();

  async function handlePickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library to upload a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUrl = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setLogoUri(dataUrl);
      setSuccess(false);
    }
  }

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
        logoUrl?: string | null;
      }>("/company", {
        method: "PATCH",
        body: JSON.stringify({
          name: companyName.trim(),
          primaryColor,
          secondaryColor,
          logoUrl: logoUri,
        }),
      });
      updateUser({
        companyName: updated.name,
        primaryColor: updated.primaryColor,
        secondaryColor: updated.secondaryColor,
        logoUrl: updated.logoUrl,
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

  const selectedPreset = COLOR_PRESETS.find(
    (p) => p.primary === primaryColor && p.secondary === secondaryColor
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.accent, colors.primary + "99"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 16 }]}
        >
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <View style={[styles.logoFrame, { borderColor: "rgba(255,255,255,0.4)" }]}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImg} />
              ) : (
                <View style={[styles.logoFallback, { backgroundColor: primaryColor }]}>
                  <Text style={styles.logoInitial}>{companyInitial}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: primaryColor }]}
              onPress={handlePickLogo}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroCompany}>{user?.companyName}</Text>
          <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="settings" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroBadgeText}>Company Settings</Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Company name card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="briefcase" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Company Information</Text>
            </View>
            <InputField
              label="Company Name"
              value={companyName}
              onChangeText={(t) => { setCompanyName(t); setError(""); setSuccess(false); }}
              autoCapitalize="words"
              placeholder="Your company name"
            />
          </View>

          {/* Brand colors card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="droplet" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Brand Colors</Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Your colors will be applied across the entire app experience.
            </Text>

            {/* Live preview */}
            <View style={[styles.preview, { backgroundColor: secondaryColor, borderColor: colors.border }]}>
              <View style={styles.previewLeft}>
                <View style={[styles.previewLogoSmall, { backgroundColor: primaryColor }]}>
                  <Text style={styles.previewLogoText}>{companyInitial}</Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={[styles.previewCompany, { color: "#fff" }]} numberOfLines={1}>
                    {companyName || "Company Name"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Preview</Text>
                </View>
              </View>
              <View style={[styles.previewBtn, { backgroundColor: primaryColor }]}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Action</Text>
              </View>
            </View>

            {/* Color name label */}
            {selectedPreset && (
              <View style={styles.selectedRow}>
                <View style={[styles.selectedSwatch, { backgroundColor: primaryColor }]} />
                <Text style={[styles.selectedLabel, { color: colors.foreground }]}>
                  {selectedPreset.name}
                </Text>
                <Feather name="check-circle" size={14} color={colors.success} />
              </View>
            )}

            {/* Preset grid */}
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
                        backgroundColor: preset.secondary,
                        borderColor: isSelected ? preset.primary : "transparent",
                        borderWidth: isSelected ? 2.5 : 1.5,
                      },
                    ]}
                    onPress={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                      setError("");
                      setSuccess(false);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.presetCircle, { backgroundColor: preset.primary }]} />
                    <Text
                      style={[
                        styles.presetName,
                        { color: isSelected ? preset.primary : "rgba(255,255,255,0.5)" },
                      ]}
                    >
                      {preset.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: preset.primary }]}>
                        <Feather name="check" size={9} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {error ? (
            <View style={[styles.alert, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.alertText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={[styles.alert, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.alertText, { color: colors.success }]}>
                Company settings saved — theme updated!
              </Text>
            </View>
          ) : null}

          <PrimaryButton label="Save Settings" onPress={handleSave} loading={loading} />

          {/* Account actions */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="user" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/profile-settings")}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="edit-2" size={15} color={colors.primary} />
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
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.destructive + "12" }]}>
                <Feather name="log-out" size={15} color={colors.destructive} />
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

  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 10,
  },
  logoWrapper: { position: "relative" },
  logoFrame: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 2.5,
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  logoFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: { fontSize: 36, fontWeight: "900", color: "#fff" },
  cameraBtn: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroCompany: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginTop: 4 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },

  scroll: { padding: 16, gap: 14 },

  card: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 13, lineHeight: 18, marginTop: -8 },

  preview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  previewLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLogoText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  previewInfo: { gap: 2 },
  previewCompany: { fontSize: 14, fontWeight: "700", maxWidth: 160 },
  previewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },

  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  selectedSwatch: { width: 16, height: 16, borderRadius: 8 },
  selectedLabel: { fontSize: 14, fontWeight: "600", flex: 1 },

  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetItem: {
    width: "30%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  presetCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  presetName: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 13, flex: 1, fontWeight: "500" },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
});
