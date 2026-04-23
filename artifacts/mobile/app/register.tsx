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
import { getApiUrl } from "@/lib/api";

const { width } = Dimensions.get("window");

// ─── Internal auth input field ─────────────────────────────────────────────
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
        { backgroundColor: colors.surface, borderColor },
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
        editable={editable !== false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightElement}
    </Animated.View>
  );
}

// ─── Section header inside card ────────────────────────────────────────────
function SectionLabel({ label, icon, color }: { label: string; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={13} color={color} />
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────
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

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(70, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 10 }),
      Animated.spring(footerAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 10 }),
    ]).start();
  }, []);

  const headerStyle = {
    opacity: headerAnim,
    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };
  const cardStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
  };
  const footerStyle = { opacity: footerAnim };

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

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

  const clearError = () => setError("");

  return (
    <View style={styles.root}>
      {/* ── Dark background ── */}
      <LinearGradient
        colors={["#060914", "#0c1220", "#060914"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowOrb, { backgroundColor: colors.primary, top: topPad - 80 }]} />
      <View style={[styles.glowOrbSecondary, { backgroundColor: colors.accent }]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={isIOS ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 16, paddingBottom: botPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back + Header ── */}
          <Animated.View style={[styles.headerBlock, headerStyle]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Feather name="arrow-left" size={19} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.logoOuter}>
                <LinearGradient
                  colors={[colors.primary, colors.primary + "BB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Feather name="briefcase" size={26} color="#fff" />
                </LinearGradient>
                <View style={[styles.logoGlow, { backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.headerTitle}>Start your free account</Text>
              <Text style={styles.headerSub}>
                Get your painting business organized in minutes
              </Text>
            </View>

            {/* Step indicators */}
            <View style={styles.steps}>
              {["Company", "Account", "Password"].map((step, i) => (
                <View key={step} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      { backgroundColor: i === 0 ? colors.primary : "rgba(255,255,255,0.2)" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Form card ── */}
          <Animated.View style={cardStyle}>
            {isIOS && !isWeb ? (
              <BlurView intensity={24} tint="dark" style={styles.cardBlurWrap}>
                <FormContent
                  colors={colors}
                  companyName={companyName} setCompanyName={setCompanyName}
                  adminName={adminName} setAdminName={setAdminName}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                  showPass={showPass} setShowPass={setShowPass}
                  error={error}
                  loading={loading}
                  onRegister={handleRegister}
                  clearError={clearError}
                  onSignIn={() => router.back()}
                />
              </BlurView>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <FormContent
                  colors={colors}
                  companyName={companyName} setCompanyName={setCompanyName}
                  adminName={adminName} setAdminName={setAdminName}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                  showPass={showPass} setShowPass={setShowPass}
                  error={error}
                  loading={loading}
                  onRegister={handleRegister}
                  clearError={clearError}
                  onSignIn={() => router.back()}
                />
              </View>
            )}
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View style={[styles.footer, footerStyle]}>
            {/* Benefits */}
            <View style={styles.benefitsRow}>
              {[
                { icon: "zap", label: "Free forever" },
                { icon: "shield", label: "Secure & private" },
                { icon: "clock", label: "5 min setup" },
              ].map((b) => (
                <View key={b.label} style={styles.benefitItem}>
                  <Feather name={b.icon as any} size={12} color={colors.primary} />
                  <Text style={styles.benefitText}>{b.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.footnote}>
              By creating an account you agree to our{" "}
              <Text style={{ fontWeight: "700", color: "rgba(255,255,255,0.6)" }}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={{ fontWeight: "700", color: "rgba(255,255,255,0.6)" }}>
                Privacy Policy
              </Text>
              .
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Form content component ────────────────────────────────────────────────
function FormContent({
  colors,
  companyName, setCompanyName,
  adminName, setAdminName,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  showPass, setShowPass,
  error,
  loading,
  onRegister,
  clearError,
  onSignIn,
}: any) {
  return (
    <View style={styles.cardInner}>
      {/* Company section */}
      <SectionLabel label="Company Details" icon="briefcase" color={colors.primary} />

      <AuthField
        icon="home"
        placeholder="e.g. Miller Painting Co."
        value={companyName}
        onChangeText={(t: string) => { setCompanyName(t); clearError(); }}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        editable={!loading}
      />

      {/* Separator */}
      <View style={[styles.sep, { backgroundColor: colors.border }]} />

      {/* Admin account section */}
      <SectionLabel label="Your Account" icon="user" color={colors.primary} />

      <AuthField
        icon="user"
        placeholder="Your full name"
        value={adminName}
        onChangeText={(t: string) => { setAdminName(t); clearError(); }}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        editable={!loading}
      />
      <AuthField
        icon="mail"
        placeholder="admin@company.com"
        value={email}
        onChangeText={(t: string) => { setEmail(t); clearError(); }}
        keyboardType="email-address"
        returnKeyType="next"
        editable={!loading}
      />

      {/* Separator */}
      <View style={[styles.sep, { backgroundColor: colors.border }]} />

      {/* Password section */}
      <SectionLabel label="Set a Password" icon="lock" color={colors.primary} />

      <AuthField
        icon="lock"
        placeholder="At least 8 characters"
        value={password}
        onChangeText={(t: string) => { setPassword(t); clearError(); }}
        secureTextEntry={!showPass}
        returnKeyType="next"
        editable={!loading}
        rightElement={
          <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={12} style={styles.eyeBtn}>
            <Feather name={showPass ? "eye-off" : "eye"} size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        }
      />
      <AuthField
        icon="check-circle"
        placeholder="Re-enter password"
        value={confirmPassword}
        onChangeText={(t: string) => { setConfirmPassword(t); clearError(); }}
        secureTextEntry={!showPass}
        returnKeyType="done"
        onSubmitEditing={onRegister}
        editable={!loading}
      />

      {/* Error */}
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
          <View style={[styles.errorIcon, { backgroundColor: colors.destructive + "20" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
          </View>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {/* Submit */}
      <TouchableOpacity
        onPress={onRegister}
        disabled={loading}
        activeOpacity={0.88}
        style={[styles.submitWrap, { opacity: loading ? 0.75 : 1 }]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primary + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Create Company Account</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity
        style={[styles.loginLink, { borderColor: colors.border, backgroundColor: colors.muted }]}
        onPress={onSignIn}
        activeOpacity={0.8}
      >
        <Text style={[styles.loginLinkText, { color: colors.mutedForeground }]}>
          Already have an account?{" "}
          <Text style={[styles.loginLinkBold, { color: colors.primary }]}>Sign In</Text>
        </Text>
      </TouchableOpacity>

      {/* DEBUG: API URL */}
      <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 4 }}>
        API: {getApiUrl()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

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
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    right: -width * 0.15,
    bottom: 120,
    opacity: 0.06,
  },

  scroll: { paddingHorizontal: 24, gap: 24 },

  // Header block
  headerBlock: { gap: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerCenter: { alignItems: "center", gap: 10 },
  logoOuter: { position: "relative", marginBottom: 2 },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 22,
    top: 6,
    opacity: 0.3,
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  // Step indicators
  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  stepItem: { alignItems: "center", gap: 5 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

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
  cardInner: { padding: 26, gap: 16 },

  // Section label
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },

  sep: { height: 1 },

  // Input fields
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, height: "100%" },
  eyeBtn: { padding: 4 },

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

  // Submit
  submitWrap: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 2,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.1 },

  // Login link
  loginLink: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loginLinkText: { fontSize: 14 },
  loginLinkBold: { fontWeight: "700" },

  // Footer
  footer: { gap: 14, alignItems: "center" },
  benefitsRow: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  benefitText: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  footnote: {
    fontSize: 11,
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
