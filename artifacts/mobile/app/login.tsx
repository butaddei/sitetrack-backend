import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

// ─── Internal auth input field with leading icon ──────────────────────────────
function AuthField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
  rightElement,
  editable,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  rightElement?: React.ReactNode;
  editable?: boolean;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const animBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animBorder, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  }, [focused]);

  const borderColor = animBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const iconColor = focused ? colors.primary : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        styles.fieldWrap,
        {
          backgroundColor: colors.surface,
          borderColor,
        },
      ]}
    >
      <Feather name={icon as any} size={17} color={iconColor} style={styles.fieldIcon} />
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={autoCorrect ?? false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightElement}
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Entrance animations
  const brandAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.spring(brandAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 10 }),
      Animated.spring(footerAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 10 }),
    ]).start();
  }, []);

  const brandStyle = {
    opacity: brandAnim,
    transform: [{ translateY: brandAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
  const cardStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
  };
  const footerStyle = {
    opacity: footerAnim,
  };

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === "admin" ? "/(tabs)" : "/(tabs)/emp-home");
    }
  }, [user, authLoading]);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (result.success && result.user) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(result.user.role === "admin" ? "/(tabs)" : "/(tabs)/emp-home");
    } else {
      setError(result.error ?? "Login failed. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError("");
  };

  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <View style={styles.root}>
      {/* ── Rich dark background ── */}
      <LinearGradient
        colors={["#060914", "#0c1220", "#060914"]}
        style={StyleSheet.absoluteFill}
      />
      {/* Primary color glow orb */}
      <View
        style={[
          styles.glowOrb,
          { backgroundColor: colors.primary, top: topPad - 60 },
        ]}
      />
      {/* Secondary subtle orb */}
      <View
        style={[
          styles.glowOrbSecondary,
          { backgroundColor: colors.accent },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 40, paddingBottom: botPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand ── */}
          <Animated.View style={[styles.brand, brandStyle]}>
            <View style={styles.logoOuter}>
              <LinearGradient
                colors={[colors.primary, colors.primary + "BB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Feather name="tool" size={30} color="#fff" />
              </LinearGradient>
              <View style={[styles.logoGlow, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.appName}>PaintPro</Text>
            <Text style={styles.tagline}>Field & Project Management</Text>

            {/* Trust signals */}
            <View style={styles.trustRow}>
              {["Secure", "Multi-team", "Real-time"].map((t) => (
                <View key={t} style={styles.trustBadge}>
                  <View style={[styles.trustDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.trustText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Auth card ── */}
          <Animated.View style={cardStyle}>
            {isIOS && !isWeb ? (
              <BlurView intensity={24} tint="dark" style={styles.cardBlurWrap}>
                <CardContent
                  colors={colors}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  showPass={showPass}
                  setShowPass={setShowPass}
                  error={error}
                  setError={setError}
                  loading={loading}
                  onLogin={handleLogin}
                  onForgot={() => router.push("/forgot-password")}
                  onRegister={() => router.push("/register")}
                />
              </BlurView>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <CardContent
                  colors={colors}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  showPass={showPass}
                  setShowPass={setShowPass}
                  error={error}
                  setError={setError}
                  loading={loading}
                  onLogin={handleLogin}
                  onForgot={() => router.push("/forgot-password")}
                  onRegister={() => router.push("/register")}
                />
              </View>
            )}
          </Animated.View>

          {/* ── Demo accounts ── */}
          <Animated.View style={[styles.demoCard, footerStyle]}>
            <View style={styles.demoHeader}>
              <View style={[styles.demoPill, { backgroundColor: colors.primary + "25", borderColor: colors.primary + "40" }]}>
                <View style={[styles.demoDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.demoTitle, { color: colors.primary }]}>Demo Accounts</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.demoRow}
              onPress={() => fillDemo("admin@paintpro.com", "admin123")}
              activeOpacity={0.75}
            >
              <View style={[styles.roleChip, { backgroundColor: colors.primary }]}>
                <Feather name="shield" size={10} color="#fff" />
                <Text style={styles.roleChipText}>Admin</Text>
              </View>
              <Text style={styles.demoEmail}>admin@paintpro.com</Text>
              <Text style={styles.demoPass}>admin123</Text>
            </TouchableOpacity>
            <View style={styles.demoDivider} />
            <TouchableOpacity
              style={styles.demoRow}
              onPress={() => fillDemo("carlos@paintpro.com", "employee123")}
              activeOpacity={0.75}
            >
              <View style={[styles.roleChip, { backgroundColor: "#22c55e" }]}>
                <Feather name="user" size={10} color="#fff" />
                <Text style={styles.roleChipText}>Field</Text>
              </View>
              <Text style={styles.demoEmail}>carlos@paintpro.com</Text>
              <Text style={styles.demoPass}>employee123</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Card content (shared between BlurView and plain card) ───────────────────
function CardContent({
  colors,
  email, setEmail,
  password, setPassword,
  showPass, setShowPass,
  error, setError,
  loading,
  onLogin,
  onForgot,
  onRegister,
}: any) {
  return (
    <View style={styles.cardInner}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          Sign in to your PaintPro account
        </Text>
      </View>

      <View style={styles.fields}>
        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email address</Text>
          <AuthField
            icon="mail"
            placeholder="you@company.com"
            value={email}
            onChangeText={(t: string) => { setEmail(t); setError(""); }}
            keyboardType="email-address"
            returnKeyType="next"
          />
        </View>
        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Password</Text>
          <AuthField
            icon="lock"
            placeholder="••••••••"
            value={password}
            onChangeText={(t: string) => { setPassword(t); setError(""); }}
            secureTextEntry={!showPass}
            returnKeyType="done"
            onSubmitEditing={onLogin}
            editable={!loading}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                hitSlop={12}
                style={styles.eyeBtn}
              >
                <Feather
                  name={showPass ? "eye-off" : "eye"}
                  size={17}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            }
          />
        </View>
      </View>

      <TouchableOpacity onPress={onForgot} style={styles.forgotRow} activeOpacity={0.75}>
        <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
      </TouchableOpacity>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
          <View style={[styles.errorIcon, { backgroundColor: colors.destructive + "20" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
          </View>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {/* Sign in button */}
      <TouchableOpacity
        onPress={onLogin}
        disabled={loading}
        activeOpacity={0.88}
        style={[styles.signInBtnWrap, { opacity: loading ? 0.75 : 1 }]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primary + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.signInBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.signInBtnText}>Sign In</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.divLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.divText, { color: colors.mutedForeground }]}>or</Text>
        <View style={[styles.divLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Create account */}
      <TouchableOpacity
        style={[styles.createBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
        onPress={onRegister}
        activeOpacity={0.8}
      >
        <Feather name="briefcase" size={15} color={colors.foreground} />
        <Text style={[styles.createBtnText, { color: colors.foreground }]}>
          Create Company Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Background FX
  glowOrb: {
    position: "absolute",
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    left: -width * 0.05,
    opacity: 0.12,
  },
  glowOrbSecondary: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    right: -width * 0.2,
    bottom: 80,
    opacity: 0.06,
  },

  scroll: { paddingHorizontal: 24, gap: 28, alignItems: "stretch" },

  // Brand
  brand: { alignItems: "center", gap: 14, paddingHorizontal: 8 },
  logoOuter: { position: "relative", marginBottom: 4 },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 24,
    top: 6,
    opacity: 0.3,
    zIndex: -1,
  },
  appName: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1.2,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
    letterSpacing: 0.2,
    marginTop: -6,
  },
  trustRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  trustDot: { width: 5, height: 5, borderRadius: 3 },
  trustText: { fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600" },

  // Card
  cardBlurWrap: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 12,
  },
  cardInner: { padding: 28, gap: 20 },
  cardHead: { gap: 5 },
  cardTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  cardSub: { fontSize: 14 },

  // Fields
  fields: { gap: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3, marginBottom: 7 },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  eyeBtn: { padding: 4 },

  forgotRow: { alignSelf: "flex-end", marginTop: -8 },
  forgotText: { fontSize: 13, fontWeight: "600" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500", lineHeight: 18 },

  // Sign in button
  signInBtnWrap: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  signInBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  signInBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.1 },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12, fontWeight: "500" },

  // Create account
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  createBtnText: { fontSize: 15, fontWeight: "600" },

  // Demo
  demoCard: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  demoHeader: { alignItems: "flex-start" },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  demoDot: { width: 6, height: 6, borderRadius: 3 },
  demoTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  demoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  demoDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleChipText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  demoEmail: { color: "rgba(255,255,255,0.75)", fontSize: 13, flex: 1 },
  demoPass: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: "500" },
});
