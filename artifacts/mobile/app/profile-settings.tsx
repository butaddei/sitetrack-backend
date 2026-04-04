import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [position, setPosition] = useState(user?.position ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleSaveProfile() {
    if (!name.trim()) {
      setProfileError("Name is required");
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      const updated = await apiFetch<{ name: string; phone: string; position: string }>(
        "/auth/profile",
        {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null, position: position.trim() || null }),
        }
      );
      updateUser(updated);
      setProfileSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update profile";
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      setPasswordError("All password fields are required");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess(false);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to change password";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar placeholder */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitial}>
                {(user?.name ?? "?")[0].toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.avatarName, { color: colors.foreground }]}>{user?.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>
                {user?.role === "admin" ? "Administrator" : "Employee"}
              </Text>
            </View>
          </View>

          {/* Profile info */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Personal Information</Text>
            <InputField
              label="Full Name"
              value={name}
              onChangeText={(t) => { setName(t); setProfileError(""); setProfileSuccess(false); }}
              autoCapitalize="words"
              placeholder="Your full name"
            />
            <InputField
              label="Phone (optional)"
              value={phone}
              onChangeText={(t) => { setPhone(t); setProfileError(""); setProfileSuccess(false); }}
              keyboardType="phone-pad"
              placeholder="(555) 000-0000"
            />
            <InputField
              label="Position / Title (optional)"
              value={position}
              onChangeText={(t) => { setPosition(t); setProfileError(""); setProfileSuccess(false); }}
              autoCapitalize="words"
              placeholder="e.g. Lead Painter"
            />

            {profileError ? (
              <View style={[styles.alertBox, { backgroundColor: colors.destructive + "15" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.alertText, { color: colors.destructive }]}>{profileError}</Text>
              </View>
            ) : null}
            {profileSuccess ? (
              <View style={[styles.alertBox, { backgroundColor: colors.success + "15" }]}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.alertText, { color: colors.success }]}>Profile updated successfully</Text>
              </View>
            ) : null}

            <PrimaryButton label="Save Changes" onPress={handleSaveProfile} loading={profileLoading} />
          </View>

          {/* Change password */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Change Password</Text>
            <InputField
              label="Current Password"
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setPasswordError(""); setPasswordSuccess(false); }}
              secureTextEntry={!showPass}
              placeholder="Your current password"
            />
            <View style={styles.passRow}>
              <InputField
                label="New Password"
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setPasswordError(""); setPasswordSuccess(false); }}
                secureTextEntry={!showPass}
                placeholder="At least 8 characters"
                style={styles.flex}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Feather
                  name={showPass ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
            <InputField
              label="Confirm New Password"
              value={confirmNewPassword}
              onChangeText={(t) => { setConfirmNewPassword(t); setPasswordError(""); setPasswordSuccess(false); }}
              secureTextEntry={!showPass}
              placeholder="Re-enter new password"
            />

            {passwordError ? (
              <View style={[styles.alertBox, { backgroundColor: colors.destructive + "15" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.alertText, { color: colors.destructive }]}>{passwordError}</Text>
              </View>
            ) : null}
            {passwordSuccess ? (
              <View style={[styles.alertBox, { backgroundColor: colors.success + "15" }]}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.alertText, { color: colors.success }]}>Password changed successfully</Text>
              </View>
            ) : null}

            <PrimaryButton label="Change Password" onPress={handleChangePassword} loading={passwordLoading} />
          </View>

          {/* Read-only info */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account Information</Text>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{user?.email}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Company</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{user?.companyName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Role</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {user?.role === "admin" ? "Administrator" : "Employee"}
              </Text>
            </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { padding: 16, gap: 16 },
  avatarSection: { alignItems: "center", gap: 10, paddingVertical: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: "#fff" },
  avatarName: { fontSize: 22, fontWeight: "700" },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 13, fontWeight: "600" },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  passRow: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, bottom: 12 },
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
