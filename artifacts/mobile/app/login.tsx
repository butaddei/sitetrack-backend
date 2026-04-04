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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Login failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError("");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.accent }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 40, paddingBottom: botPad + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Feather name="tool" size={32} color="#fff" />
            </View>
            <Text style={styles.appName}>PaintPro</Text>
            <Text style={styles.tagline}>Field & Project Management</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome back</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Sign in to continue
            </Text>

            <View style={styles.fields}>
              <InputField
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="your@email.com"
              />
              <View style={styles.passRow}>
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPass}
                  placeholder="••••••••"
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
            </View>

            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton label="Sign In" onPress={handleLogin} loading={loading} />

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/register")}
            >
              <Feather name="briefcase" size={16} color={colors.foreground} />
              <Text style={[styles.registerText, { color: colors.foreground }]}>
                Create Company Account
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.demoCard, { backgroundColor: colors.card + "33" }]}>
            <Text style={[styles.demoTitle, { color: "#fff" }]}>Demo Accounts</Text>
            <TouchableOpacity
              style={styles.demoRow}
              onPress={() => fillDemo("admin@paintpro.com", "admin123")}
            >
              <View style={[styles.roleTag, { backgroundColor: colors.primary }]}>
                <Text style={styles.roleText}>Admin</Text>
              </View>
              <Text style={styles.demoEmail}>admin@paintpro.com</Text>
              <Text style={styles.demoPass}>admin123</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoRow}
              onPress={() => fillDemo("carlos@paintpro.com", "employee123")}
            >
              <View style={[styles.roleTag, { backgroundColor: colors.success }]}>
                <Text style={styles.roleText}>Employee</Text>
              </View>
              <Text style={styles.demoEmail}>carlos@paintpro.com</Text>
              <Text style={styles.demoPass}>employee123</Text>
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
  scroll: { paddingHorizontal: 24, gap: 24 },
  logoContainer: { alignItems: "center", gap: 10 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  card: { borderRadius: 20, padding: 24, gap: 16 },
  cardTitle: { fontSize: 22, fontWeight: "700" },
  cardSub: { fontSize: 14, marginTop: -8 },
  fields: { gap: 14 },
  passRow: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, bottom: 12 },
  forgotRow: { alignSelf: "flex-end", marginTop: -6 },
  forgotText: { fontSize: 13, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, flex: 1 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  registerText: { fontSize: 14, fontWeight: "600" },
  demoCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  demoTitle: { fontSize: 13, fontWeight: "700", opacity: 0.8 },
  demoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  roleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  demoEmail: { color: "rgba(255,255,255,0.85)", fontSize: 13, flex: 1 },
  demoPass: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
});
