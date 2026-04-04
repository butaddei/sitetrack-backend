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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleRegister() {
    if (!companyName.trim() || !adminName.trim() || !email.trim() || !password) {
      setError("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register(companyName.trim(), adminName.trim(), email.trim(), password);
    setLoading(false);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Registration failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Feather name="briefcase" size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Create Your Company</Text>
            <Text style={styles.subtitle}>Start managing your painting business</Text>
          </View>

          {/* Form */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>COMPANY</Text>
            <InputField
              label="Company Name"
              value={companyName}
              onChangeText={(t) => { setCompanyName(t); setError(""); }}
              placeholder="e.g. Miller Painting Co."
              autoCapitalize="words"
            />

            <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}>
              ADMIN ACCOUNT
            </Text>
            <InputField
              label="Your Name"
              value={adminName}
              onChangeText={(t) => { setAdminName(t); setError(""); }}
              placeholder="Full name"
              autoCapitalize="words"
            />
            <InputField
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="admin@company.com"
            />
            <View style={styles.passRow}>
              <InputField
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
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
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
              secureTextEntry={!showPass}
              placeholder="Re-enter password"
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Create Company"
              onPress={handleRegister}
              loading={loading}
            />
          </View>

          <Text style={[styles.footnote, { color: "rgba(255,255,255,0.6)" }]}>
            By creating an account you agree to the Terms of Service and Privacy Policy.
          </Text>
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
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: -4,
  },
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
  footnote: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
