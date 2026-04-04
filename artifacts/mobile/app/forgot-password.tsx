import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

  const steps: Step[] = ["email", "code", "done"];
  const stepIndex = steps.indexOf(step);

  return (
    <LinearGradient
      colors={[colors.accent, colors.accent + "F2", colors.accent]}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 20, paddingBottom: botPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: step === "done" ? colors.success : colors.primary }]}>
              <Feather name={step === "done" ? "check" : "lock"} size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === "email"
                ? "Enter your email to receive a reset code"
                : step === "code"
                ? "Enter the code sent to your email"
                : "Your password has been reset"}
            </Text>
          </View>

          {/* Step progress */}
          <View style={styles.stepRow}>
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: i <= stepIndex ? colors.primary : "rgba(255,255,255,0.25)",
                      width: i === stepIndex ? 28 : 8,
                    },
                  ]}
                />
                {i < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: i < stepIndex ? colors.primary : "rgba(255,255,255,0.2)" },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Content card */}
          {step === "done" ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.successWrap}>
                <View style={[styles.successCircle, { backgroundColor: colors.success + "18" }]}>
                  <Feather name="check-circle" size={48} color={colors.success} />
                </View>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>All done!</Text>
                <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                  Your password has been updated. Sign in with your new credentials.
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
                    autoCorrect={false}
                    placeholder="you@company.com"
                  />
                  {error ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                      <Feather name="alert-circle" size={14} color={colors.destructive} />
                      <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                    </View>
                  ) : null}
                  <PrimaryButton label="Send Reset Code" onPress={handleSendCode} loading={loading} />
                </>
              ) : (
                <>
                  <View style={[styles.infoBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                    <Feather name="mail" size={14} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.primary }]}>
                      Code sent to <Text style={{ fontWeight: "700" }}>{email}</Text>
                    </Text>
                  </View>
                  <InputField
                    label="Reset Code"
                    value={code}
                    onChangeText={(t) => { setCode(t); setError(""); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Paste code from email"
                  />
                  <View>
                    <InputField
                      label="New Password"
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); setError(""); }}
                      secureTextEntry={!showPass}
                      placeholder="At least 8 characters"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)} hitSlop={8}>
                      <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
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
                    <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 24 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  header: { alignItems: "center", gap: 12 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 20 },

  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  stepDot: { height: 8, borderRadius: 4 },
  stepLine: { flex: 1, height: 2, borderRadius: 1, maxWidth: 32 },

  card: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },

  eyeBtn: { position: "absolute", right: 14, bottom: 14 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, flex: 1 },

  successWrap: { alignItems: "center", gap: 16, paddingVertical: 8 },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  successSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
