import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleReset() {
    if (!code.trim()) { setError("Insere o código recebido por email."); return; }
    if (newPassword.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: code.trim().toUpperCase(), newPassword }),
        skipAuth: true,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Código inválido ou expirado. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.root, { backgroundColor: "#060914" }]}>
        <LinearGradient colors={["#060914", "#0c1220", "#060914"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.centered, { paddingTop: insets.top + 40 }]}>
          <View style={[styles.iconWrap, { backgroundColor: "#16a34a20" }]}>
            <Feather name="check-circle" size={40} color="#16a34a" />
          </View>
          <Text style={styles.doneTitle}>Senha redefinida!</Text>
          <Text style={styles.doneSubtitle}>Já podes entrar com a tua nova senha.</Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.doneBtnText}>Ir para o login</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#060914" }]}>
      <LinearGradient colors={["#060914", "#0c1220", "#060914"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="key" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Nova senha</Text>
            <Text style={styles.subtitle}>Insere o código recebido no email e define uma nova senha.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: "rgba(255,255,255,0.6)" }]}>Código de recuperação</Text>
              <View style={[styles.inputWrap, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="hash" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: "#fff", letterSpacing: 4, fontWeight: "700" }]}
                  placeholder="XXXXXXXX"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={code}
                  onChangeText={(t) => { setCode(t.toUpperCase()); setError(""); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: "rgba(255,255,255,0.6)" }]}>Nova senha</Text>
              <View style={[styles.inputWrap, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: "#fff" }]}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setError(""); }}
                  secureTextEntry={!showPass}
                  returnKeyType="next"
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={12}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: "rgba(255,255,255,0.6)" }]}>Confirmar senha</Text>
              <View style={[styles.inputWrap, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: "#fff" }]}
                  placeholder="Repete a nova senha"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  editable={!loading}
                />
              </View>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            ) : null}

            <TouchableOpacity onPress={handleReset} disabled={loading} activeOpacity={0.85} style={{ opacity: loading ? 0.7 : 1 }}>
              <LinearGradient
                colors={[colors.primary, colors.primary + "CC"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.sendBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.sendBtnText}>Redefinir senha</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
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
  scroll: { paddingHorizontal: 24, gap: 28 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  header: { alignItems: "center", gap: 16 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 22 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: "100%" },
  errorText: { fontSize: 13, fontWeight: "500" },
  sendBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 20 },
  doneTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  doneSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 22 },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16 },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
