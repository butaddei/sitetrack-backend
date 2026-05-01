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

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!email.trim()) {
      setError("Insere o teu email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        skipAuth: true,
      });
      setSent(true);
    } catch {
      setError("Erro ao enviar. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: "#060914" }]}>
      <LinearGradient
        colors={["#060914", "#0c1220", "#060914"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="lock" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Insere o teu email e envia-mos um código de recuperação.
            </Text>
          </View>

          {sent ? (
            <View style={[styles.successBox, { backgroundColor: "#16a34a20", borderColor: "#16a34a40" }]}>
              <Feather name="check-circle" size={24} color="#16a34a" />
              <Text style={[styles.successText, { color: "#16a34a" }]}>
                Email enviado! Verifica a tua caixa de entrada e usa o código para redefinir a senha.
              </Text>
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/reset-password")}
              >
                <Text style={styles.continueBtnText}>Inserir código</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }]}>
              <Text style={[styles.label, { color: "rgba(255,255,255,0.6)" }]}>Email</Text>
              <View style={[styles.inputWrap, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: "#fff" }]}
                  placeholder="o.teu@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  editable={!loading}
                />
              </View>

              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary + "CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.sendBtnText}>Enviar código</Text>
                      <Feather name="send" size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/reset-password")}
                style={styles.alreadyHaveCode}
              >
                <Text style={[styles.alreadyHaveCodeText, { color: "rgba(255,255,255,0.5)" }]}>
                  Já tens um código?{" "}
                  <Text style={{ color: colors.primary }}>Inserir código</Text>
                </Text>
              </TouchableOpacity>
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
  scroll: { paddingHorizontal: 24, gap: 28 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  header: { alignItems: "center", gap: 16 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 22 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: "100%" },
  errorText: { fontSize: 13, fontWeight: "500" },
  sendBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  alreadyHaveCode: { alignItems: "center" },
  alreadyHaveCodeText: { fontSize: 13 },
  successBox: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 16 },
  successText: { fontSize: 15, textAlign: "center", lineHeight: 22, fontWeight: "500" },
  continueBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  continueBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
