import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [position, setPosition] = useState(user?.position ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
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
  // Subcontractor fields (employee-only)
  const [abn, setAbn] = useState(user?.abn ?? "");
  const [bizAddress, setBizAddress] = useState(user?.businessAddress ?? "");
  const [invoicePrefix, setInvoicePrefix] = useState(user?.invoicePrefix ?? "");
  const [invoiceNotes, setInvoiceNotes] = useState(user?.invoiceNotes ?? "");
  const [bankName, setBankName] = useState(user?.bankName ?? "");
  const [accountName, setAccountName] = useState(user?.accountName ?? "");
  const [bsb, setBsb] = useState(user?.bsb ?? "");
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber ?? "");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);
  const isEmployee = user?.role !== "admin";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const initials =
    (user?.name ?? "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  async function handlePickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library to upload a profile photo."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUrl = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setAvatarUri(dataUrl);
      setProfileSuccess(false);
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      setProfileError("Name is required");
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      const updated = await apiFetch<{
        name: string;
        phone: string;
        position: string;
        avatarUrl?: string | null;
      }>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          position: position.trim() || null,
          avatarUrl: avatarUri,
        }),
      });
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

  async function handleSaveSubcontractor() {
    setSubLoading(true);
    setSubError("");
    setSubSuccess(false);
    try {
      const updated = await apiFetch<Partial<typeof user>>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          abn: abn.trim() || null,
          businessAddress: bizAddress.trim() || null,
          invoicePrefix: invoicePrefix.trim() || null,
          invoiceNotes: invoiceNotes.trim() || null,
          bankName: bankName.trim() || null,
          accountName: accountName.trim() || null,
          bsb: bsb.trim() || null,
          accountNumber: accountNumber.trim() || null,
        }),
      });
      updateUser(updated as any);
      setSubSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save details";
      setSubError(msg);
    } finally {
      setSubLoading(false);
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
        {/* Hero gradient header */}
        <LinearGradient
          colors={[colors.accent, colors.primary + "AA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 12 }]}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarRing, { borderColor: "rgba(255,255,255,0.5)" }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <LinearGradient
                  colors={[colors.primary, colors.primary + "99"]}
                  style={styles.avatarFallback}
                >
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: colors.primary }]}
              onPress={handlePickAvatar}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{user?.name}</Text>
          {user?.position ? (
            <Text style={styles.heroPosition}>{user.position}</Text>
          ) : null}
          <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={styles.roleText}>
              {user?.role === "admin" ? "Administrator" : "Subcontractor"}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Personal info card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="user" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Personal Information</Text>
            </View>

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
              <View style={[styles.alert, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.alertText, { color: colors.destructive }]}>{profileError}</Text>
              </View>
            ) : null}
            {profileSuccess ? (
              <View style={[styles.alert, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.alertText, { color: colors.success }]}>Profile updated successfully</Text>
              </View>
            ) : null}

            <PrimaryButton label="Save Changes" onPress={handleSaveProfile} loading={profileLoading} />
          </View>

          {/* ── Subcontractor Details (employees only) ── */}
          {isEmployee ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="file-text" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Subcontractor Details</Text>
              </View>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                Used on invoices you generate. Leave blank if not applicable.
              </Text>
              <InputField
                label="ABN"
                value={abn}
                onChangeText={(t) => { setAbn(t); setSubError(""); setSubSuccess(false); }}
                keyboardType="numeric"
                placeholder="e.g. 12 345 678 901"
              />
              <InputField
                label="Business Address (optional)"
                value={bizAddress}
                onChangeText={(t) => { setBizAddress(t); setSubError(""); setSubSuccess(false); }}
                autoCapitalize="words"
                placeholder="Street, Suburb, State"
              />
              <InputField
                label="Invoice Prefix (optional)"
                value={invoicePrefix}
                onChangeText={(t) => { setInvoicePrefix(t); setSubError(""); setSubSuccess(false); }}
                autoCapitalize="characters"
                placeholder="e.g. INV (default)"
              />
              <InputField
                label="Default Invoice Notes (optional)"
                value={invoiceNotes}
                onChangeText={(t) => { setInvoiceNotes(t); setSubError(""); setSubSuccess(false); }}
                placeholder="e.g. Payment due within 14 days"
              />

              {/* Banking & Payment in same card */}
              <View style={[styles.cardDivider, { borderTopColor: colors.border }]} />
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="credit-card" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Banking & Payment</Text>
              </View>
              <InputField
                label="Bank Name"
                value={bankName}
                onChangeText={(t) => { setBankName(t); setSubError(""); setSubSuccess(false); }}
                placeholder="e.g. Commonwealth Bank"
              />
              <InputField
                label="Account Name"
                value={accountName}
                onChangeText={(t) => { setAccountName(t); setSubError(""); setSubSuccess(false); }}
                autoCapitalize="words"
                placeholder="Name on account"
              />
              <InputField
                label="BSB"
                value={bsb}
                onChangeText={(t) => { setBsb(t); setSubError(""); setSubSuccess(false); }}
                keyboardType="numeric"
                placeholder="e.g. 062-000"
              />
              <InputField
                label="Account Number"
                value={accountNumber}
                onChangeText={(t) => { setAccountNumber(t); setSubError(""); setSubSuccess(false); }}
                keyboardType="numeric"
                placeholder="e.g. 12345678"
              />

              {subError ? (
                <View style={[styles.alert, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.alertText, { color: colors.destructive }]}>{subError}</Text>
                </View>
              ) : null}
              {subSuccess ? (
                <View style={[styles.alert, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
                  <Feather name="check-circle" size={14} color={colors.success} />
                  <Text style={[styles.alertText, { color: colors.success }]}>Details saved successfully</Text>
                </View>
              ) : null}

              <PrimaryButton label="Save Details" onPress={handleSaveSubcontractor} loading={subLoading} />
            </View>
          ) : null}

          {/* Change password card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="lock" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Change Password</Text>
            </View>

            <InputField
              label="Current Password"
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setPasswordError(""); setPasswordSuccess(false); }}
              secureTextEntry={!showPass}
              placeholder="Your current password"
            />
            <View>
              <InputField
                label="New Password"
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setPasswordError(""); setPasswordSuccess(false); }}
                secureTextEntry={!showPass}
                placeholder="At least 8 characters"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)} hitSlop={8}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
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
              <View style={[styles.alert, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.alertText, { color: colors.destructive }]}>{passwordError}</Text>
              </View>
            ) : null}
            {passwordSuccess ? (
              <View style={[styles.alert, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.alertText, { color: colors.success }]}>Password changed successfully</Text>
              </View>
            ) : null}

            <PrimaryButton label="Change Password" onPress={handleChangePassword} loading={passwordLoading} />
          </View>

          {/* Account info */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="info" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account Details</Text>
            </View>

            {[
              { label: "Email", value: user?.email ?? "" },
              { label: "Company", value: user?.companyName ?? "" },
              { label: "Role", value: user?.role === "admin" ? "Administrator" : "Subcontractor" },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
              </View>
            ))}

            {/* Early Access */}
            <TouchableOpacity
              style={[styles.billingRow, { borderTopWidth: 1, borderTopColor: colors.border }]}
              onPress={() => router.push("/billing")}
              activeOpacity={0.7}
            >
              <View style={[styles.billingRowLeft, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="zap" size={15} color={colors.primary} />
              </View>
              <View style={styles.billingRowCenter}>
                <Text style={[styles.billingRowTitle, { color: colors.foreground }]}>
                  Early Access
                </Text>
                <Text style={[styles.billingRowSub, { color: colors.mutedForeground }]}>
                  All features included · Free
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Sign out */}
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "25" }]}
            onPress={() =>
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: async () => {
                    await logout();
                    router.replace("/login");
                  },
                },
              ])
            }
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
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
    paddingBottom: 32,
    gap: 10,
  },
  backBtn: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarWrapper: { position: "relative", marginBottom: 4 },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 36, fontWeight: "800", color: "#fff" },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroName: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroPosition: { fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: -4 },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  roleText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.9)" },

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
  cardDivider: { borderTopWidth: 1, marginHorizontal: -4 },

  eyeBtn: { position: "absolute", right: 14, bottom: 14 },

  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 13, flex: 1, fontWeight: "500" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600", maxWidth: "60%" },

  billingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 14,
    marginTop: 2,
  },
  billingRowLeft: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  billingRowCenter: { flex: 1 },
  billingRowTitle: { fontSize: 14, fontWeight: "600" },
  billingRowSub: { fontSize: 12, marginTop: 1 },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
});
