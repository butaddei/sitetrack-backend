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

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@paintpro.com", password: "admin123", color: "#f97316" },
  { label: "Carlos", email: "carlos@paintpro.com", password: "carlos123", color: "#22c55e" },
  { label: "James", email: "james@paintpro.com", password: "james123", color: "#3b82f6" },
  { label: "Sofia", email: "sofia@paintpro.com", password: "sofia123", color: "#a855f7" },
];

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
    if (!email || !password) { setError("Please enter your email and password"); return; }
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Login failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); setError(""); };

  return (
    <View style={[styles.root, { backgroundColor: "#0f172a" }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 32, paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand ── */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <View style={[styles.logoBg, { backgroundColor: "#f97316" }]}>
                <Feather name="tool" size={30} color="#fff" />
              </View>
              <View style={styles.logoAccent} />
            </View>
            <Text style={styles.appName}>PaintPro</Text>
            <Text style={styles.tagline}>Field & Project Management</Text>
          </View>

          {/* ── Login card ── */}
          <View style={[styles.card, { backgroundColor: "#fff" }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: "#0f172a" }]}>Welcome back</Text>
              <Text style={[styles.cardSub, { color: "#64748b" }]}>Sign in to your account</Text>
            </View>

            <View style={styles.fields}>
              <InputField
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="your@email.com"
              />

              <View>
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPass}
                  placeholder="••••••••"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton label="Sign In" onPress={handleLogin} loading={loading} size="lg" />
          </View>

          {/* ── Demo accounts ── */}
          <View style={styles.demoSection}>
            <Text style={styles.demoHeading}>Demo Accounts</Text>
            <View style={styles.demoGrid}>
              {DEMO_ACCOUNTS.map((a) => (
                <TouchableOpacity
                  key={a.email}
                  style={[
                    styles.demoBtn,
                    {
                      backgroundColor: "rgba(255,255,255,0.07)",
                      borderColor: email === a.email ? a.color : "rgba(255,255,255,0.12)",
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => fill(a.email, a.password)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.demoRoleDot, { backgroundColor: a.color }]} />
                  <Text style={styles.demoLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {email ? (
              <View style={styles.selectedAccount}>
                <Feather name="user" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.selectedAccountText}>{email}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 28 },

  // Brand
  brand: { alignItems: "center", gap: 12 },
  logoWrap: { position: "relative" },
  logoBg: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoAccent: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "#1e293b",
    borderWidth: 3,
    borderColor: "#0f172a",
  },
  appName: { fontSize: 34, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: "500" },

  // Card
  card: { borderRadius: 24, padding: 24, gap: 20 },
  cardHeader: { gap: 4 },
  cardTitle: { fontSize: 22, fontWeight: "800" },
  cardSub: { fontSize: 14 },
  fields: { gap: 16 },
  eyeBtn: { position: "absolute", right: 14, bottom: 13 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
  },
  errorText: { fontSize: 13, color: "#ef4444", flex: 1 },

  // Demo
  demoSection: { gap: 10 },
  demoHeading: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  demoGrid: { flexDirection: "row", gap: 8 },
  demoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  demoRoleDot: { width: 7, height: 7, borderRadius: 4 },
  demoLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" },
  selectedAccount: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  selectedAccountText: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
});
