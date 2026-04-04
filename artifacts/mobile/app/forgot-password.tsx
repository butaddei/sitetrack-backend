import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { apiFetch, ApiError } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

type Step = "email" | "code" | "done";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleSendCode() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
        skipAuth: true,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("code");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to send reset code";
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!code.trim() || !newPassword) {
      setError("Please enter the code and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: code.trim(), newPassword }),
        skipAuth: true,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to reset password";
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.accent }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 20, paddingBottom: botPad + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Feather name="lock" size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === "email"
                ? "Enter your email to receive a reset code"
                : step === "code"
                ? "Enter the code sent to your email"
                : "Password reset successfully"}
            </Text>
          </View>

          {step === "done" ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.successRow}>
                <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
                  <Feather name="check-circle" size={40} color={colors.success} />
                </View>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>
                  Password Updated
                </Text>
                <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                  You can now sign in with your new password.
                </Text>
              </View>
              <PrimaryButton label="Back to Sign In" onPress={() => router.replace("/login")} />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {step === "email" ? (
                <>
                  <InputField
                    label="Email Address"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="your@email.com"
                  />
                  {error ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                      <Feather name="alert-circle" size={14} color={colors.destructive} />
                      <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                    </View>
                  ) : null}
                  <PrimaryButton label="Send Reset Code" onPress={handleSendCode} loading={loading} />
                </>
              ) : (
                <>
                  <View style={[styles.infoBox, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="info" size={14} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.primary }]}>
                      Code sent to {email}
                    </Text>
                  </View>
                  <InputField
                    label="Reset Code"
                    value={code}
                    onChangeText={(t) => { setCode(t); setError(""); }}
                    autoCapitalize="none"
                    placeholder="Paste code from email"
                  />
                  <View style={styles.passRow}>
                    <InputField
                      label="New Password"
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); setError(""); }}
                      secureTextEntry={!showPass}
                      placeholder="At least 8 characters"
                      style={styles.flex}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPass(!showPass)}
                    >
                      <Feather
                        name={showPass ? "eye-off" : "eye"}
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  </View>
                  <InputField
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                    secureTextEntry={!showPass}
                    placeholder="Re-enter new password"
                  />
                  {error ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                      <Feather name="alert-circle" size={14} color={colors.destructive} />
                      <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                    </View>
                  ) : null}
                  <PrimaryButton label="Reset Password" onPress={handleResetPassword} loading={loading} />
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  header: { alignItems: "center", gap: 10 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    textAlign: "center",
  },
  card: { borderRadius: 20, padding: 24, gap: 14 },
  passRow: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, bottom: 12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, flex: 1 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  infoText: { fontSize: 13, flex: 1, fontWeight: "500" },
  successRow: { alignItems: "center", gap: 16, paddingVertical: 8 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontWeight: "700" },
  successSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
