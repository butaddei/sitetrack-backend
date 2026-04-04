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
      router.replace("/onboarding");
    } else {
      setError(result.error ?? "Registration failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

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
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
              <Feather name="briefcase" size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Create Your Company</Text>
            <Text style={styles.subtitle}>
              Start managing your painting business today
            </Text>
          </View>

          {/* Company section */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                COMPANY
              </Text>
            </View>
            <InputField
              label="Company Name"
              value={companyName}
              onChangeText={(t) => { setCompanyName(t); setError(""); }}
              placeholder="e.g. Miller Painting Co."
              autoCapitalize="words"
            />

            <View style={[styles.sep, { backgroundColor: colors.border }]} />

            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                ADMIN ACCOUNT
              </Text>
            </View>
            <InputField
              label="Your Name"
              value={adminName}
              onChangeText={(t) => { setAdminName(t); setError(""); }}
              placeholder="Full name"
              autoCapitalize="words"
            />
            <InputField
              label="Email Address"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="admin@company.com"
            />
            <View>
              <InputField
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry={!showPass}
                placeholder="At least 8 characters"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(!showPass)}
                hitSlop={8}
              >
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
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
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton label="Create Company Account" onPress={handleRegister} loading={loading} />
          </View>

          <Text style={styles.footnote}>
            By creating an account you agree to the{" "}
            <Text style={{ fontWeight: "700" }}>Terms of Service</Text> and{" "}
            <Text style={{ fontWeight: "700" }}>Privacy Policy</Text>.
          </Text>
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
  title: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 20 },

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

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  sep: { height: 1, marginVertical: 4 },

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

  footnote: {
    fontSize: 12,
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
