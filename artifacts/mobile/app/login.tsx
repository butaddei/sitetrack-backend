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
            { paddingTop: topPad + 44, paddingBottom: botPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <View style={styles.brand}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
              <Feather name="tool" size={30} color="#fff" />
            </View>
            <Text style={styles.appName}>PaintPro</Text>
            <Text style={styles.tagline}>Field & Project Management</Text>
          </View>

          {/* Sign in card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHead}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome back</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                Sign in to your account
              </Text>
            </View>

            <View style={styles.fields}>
              <InputField
                label="Email address"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@company.com"
              />
              <View>
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPass}
                  placeholder="••••••••"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(!showPass)}
                  hitSlop={8}
                >
                  <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
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
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton label="Sign In" onPress={handleLogin} loading={loading} />

            <View style={styles.divider}>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.divText, { color: colors.mutedForeground }]}>or</Text>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/register")}
              activeOpacity={0.75}
            >
              <Feather name="briefcase" size={15} color={colors.foreground} />
              <Text style={[styles.registerText, { color: colors.foreground }]}>
                Create Company Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Demo accounts */}
          <View style={[styles.demoCard, { borderColor: "rgba(255,255,255,0.15)" }]}>
            <View style={styles.demoHeader}>
              <View style={[styles.demoDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.demoTitle}>Demo Accounts</Text>
            </View>
            <TouchableOpacity
              style={styles.demoRow}
              onPress={() => fillDemo("admin@paintpro.com", "admin123")}
              activeOpacity={0.7}
            >
              <View style={[styles.roleChip, { backgroundColor: colors.primary }]}>
                <Text style={styles.roleChipText}>Admin</Text>
              </View>
              <Text style={styles.demoEmail}>admin@paintpro.com</Text>
              <Text style={styles.demoPass}>admin123</Text>
            </TouchableOpacity>
            <View style={[styles.demoDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
            <TouchableOpacity
              style={styles.demoRow}
              onPress={() => fillDemo("carlos@paintpro.com", "employee123")}
              activeOpacity={0.7}
            >
              <View style={[styles.roleChip, { backgroundColor: colors.success }]}>
                <Text style={styles.roleChipText}>Field</Text>
              </View>
              <Text style={styles.demoEmail}>carlos@paintpro.com</Text>
              <Text style={styles.demoPass}>employee123</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 28 },

  brand: { alignItems: "center", gap: 12 },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: { fontSize: 34, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: "500", letterSpacing: 0.2 },

  card: {
    borderRadius: 24,
    padding: 28,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  cardHead: { gap: 4 },
  cardTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  cardSub: { fontSize: 14, fontWeight: "400" },
  fields: { gap: 16 },
  eyeBtn: { position: "absolute", right: 14, bottom: 14 },
  forgotRow: { alignSelf: "flex-end", marginTop: -6 },
  forgotText: { fontSize: 13, fontWeight: "600" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12, fontWeight: "500" },

  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  registerText: { fontSize: 14, fontWeight: "600" },

  demoCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  demoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  demoDot: { width: 6, height: 6, borderRadius: 3 },
  demoTitle: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase" },
  demoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  demoDivider: { height: 1, marginVertical: 2 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleChipText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  demoEmail: { color: "rgba(255,255,255,0.8)", fontSize: 13, flex: 1 },
  demoPass: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "500" },
});
