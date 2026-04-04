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
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const STEPS = [
  { id: 1, title: "Welcome", icon: "zap" },
  { id: 2, title: "Project", icon: "folder" },
  { id: 3, title: "Team", icon: "users" },
  { id: 4, title: "Done", icon: "check-circle" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { addProject, addEmployee } = useData();

  const [step, setStep] = useState(1);

  // Step 2 – project
  const [projectName, setProjectName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectDone, setProjectDone] = useState(false);

  // Step 3 – employee
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empRate, setEmpRate] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState("");
  const [empDone, setEmpDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleCreateProject() {
    if (!projectName.trim()) {
      setProjectError("Project name is required.");
      return;
    }
    setProjectLoading(true);
    setProjectError("");
    try {
      await addProject({
        name: projectName.trim(),
        address: projectAddress.trim() || "TBD",
        status: "pending",
        paintColors: [],
        notes: "",
        photos: [],
        documents: [],
        assignedEmployeeIds: [],
        startDate: null,
        expectedEndDate: null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProjectDone(true);
      setTimeout(() => setStep(3), 800);
    } catch (e: any) {
      setProjectError(e?.message ?? "Failed to create project. Please try again.");
    } finally {
      setProjectLoading(false);
    }
  }

  async function handleAddEmployee() {
    if (!empName.trim() || !empEmail.trim()) {
      setEmpError("Name and email are required.");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(empEmail.trim())) {
      setEmpError("Please enter a valid email address.");
      return;
    }
    setEmpLoading(true);
    setEmpError("");
    try {
      await addEmployee({
        name: empName.trim(),
        email: empEmail.trim().toLowerCase(),
        phone: null,
        role: "employee",
        hourlyRate: empRate ? String(Number(empRate)) : "0",
        position: null,
        startDate: null,
        isActive: true,
        avatarUrl: null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmpDone(true);
      setTimeout(() => setStep(4), 800);
    } catch (e: any) {
      setEmpError(e?.message ?? "Failed to add employee. Try a different email.");
    } finally {
      setEmpLoading(false);
    }
  }

  function goToDashboard() {
    router.replace("/(tabs)");
  }

  return (
    <LinearGradient
      colors={[colors.accent, colors.accent + "F0", colors.accent]}
      locations={[0, 0.55, 1]}
      style={styles.root}
    >
      {/* Progress bar */}
      <View style={[styles.progressWrap, { paddingTop: topPad + 12 }]}>
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <React.Fragment key={s.id}>
                {i > 0 && (
                  <View
                    style={[
                      styles.progressLine,
                      { backgroundColor: done ? colors.primary : "rgba(255,255,255,0.2)" },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: done
                        ? colors.primary
                        : active
                        ? "#fff"
                        : "rgba(255,255,255,0.25)",
                      borderWidth: active ? 2 : 0,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  {done ? (
                    <Feather name="check" size={10} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.progressNum,
                        { color: active ? colors.primary : "rgba(255,255,255,0.6)" },
                      ]}
                    >
                      {s.id}
                    </Text>
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>
        <Text style={styles.progressLabel}>
          Step {step} of {STEPS.length}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: botPad + 32, paddingTop: 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── STEP 1: Welcome ─────────────────────────────────────────── */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroSection}>
                <View style={[styles.bigIcon, { backgroundColor: colors.primary }]}>
                  <Feather name="zap" size={38} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>
                  Welcome to PaintPro!
                </Text>
                <Text style={styles.heroCompany}>{user?.companyName ?? "Your Company"}</Text>
                <Text style={styles.heroSub}>
                  Let's take 2 minutes to set up your workspace. You can always skip any step.
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  What you can do with PaintPro
                </Text>
                {[
                  { icon: "folder", text: "Manage projects & track progress" },
                  { icon: "users", text: "Add crew members & assign jobs" },
                  { icon: "clock", text: "Track time & automate payroll" },
                  { icon: "bar-chart-2", text: "Run financial reports instantly" },
                ].map((item) => (
                  <View key={item.text} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15" }]}>
                      <Feather name={item.icon as any} size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <PrimaryButton
                label="Let's Get Started"
                onPress={() => setStep(2)}
              />
              <TouchableOpacity onPress={goToDashboard} style={styles.skipLink}>
                <Text style={styles.skipText}>Skip setup, go to dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEP 2: First Project ────────────────────────────────────── */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroSection}>
                <View style={[styles.bigIcon, { backgroundColor: colors.primary }]}>
                  <Feather name="folder-plus" size={36} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>Add Your First Project</Text>
                <Text style={styles.heroSub}>
                  Get a job on the board so your team knows where to show up.
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <InputField
                  label="Project Name"
                  value={projectName}
                  onChangeText={(t) => { setProjectName(t); setProjectError(""); }}
                  placeholder="e.g. Johnson Residence Exterior"
                  autoCapitalize="words"
                />
                <InputField
                  label="Address (optional)"
                  value={projectAddress}
                  onChangeText={(t) => { setProjectAddress(t); setProjectError(""); }}
                  placeholder="123 Main St, City"
                  autoCapitalize="words"
                />

                {projectError ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                    <Feather name="alert-circle" size={14} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive }]}>{projectError}</Text>
                  </View>
                ) : null}

                {projectDone ? (
                  <View style={[styles.successBox, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
                    <Feather name="check-circle" size={14} color={colors.success} />
                    <Text style={[styles.errorText, { color: colors.success }]}>Project created! Moving on...</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  label="Create Project & Continue"
                  onPress={handleCreateProject}
                  loading={projectLoading}
                />
              </View>

              <TouchableOpacity onPress={() => setStep(3)} style={styles.skipLink}>
                <Text style={styles.skipText}>Skip for now</Text>
                <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEP 3: First Employee ───────────────────────────────────── */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroSection}>
                <View style={[styles.bigIcon, { backgroundColor: colors.primary }]}>
                  <Feather name="user-plus" size={36} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>Add a Team Member</Text>
                <Text style={styles.heroSub}>
                  Invite your first crew member. They'll get a login to clock in and view jobs.
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <InputField
                  label="Full Name"
                  value={empName}
                  onChangeText={(t) => { setEmpName(t); setEmpError(""); }}
                  placeholder="e.g. Carlos Rivera"
                  autoCapitalize="words"
                />
                <InputField
                  label="Email Address"
                  value={empEmail}
                  onChangeText={(t) => { setEmpEmail(t); setEmpError(""); }}
                  placeholder="carlos@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <InputField
                  label="Hourly Rate (optional)"
                  value={empRate}
                  onChangeText={(t) => { setEmpRate(t.replace(/[^0-9.]/g, "")); setEmpError(""); }}
                  placeholder="e.g. 25"
                  keyboardType="decimal-pad"
                />

                <View style={[styles.infoHint, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
                  <Feather name="info" size={13} color={colors.primary} />
                  <Text style={[styles.infoHintText, { color: colors.primary }]}>
                    Their temporary password will be <Text style={{ fontWeight: "700" }}>employee123</Text>. They can change it after logging in.
                  </Text>
                </View>

                {empError ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                    <Feather name="alert-circle" size={14} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive }]}>{empError}</Text>
                  </View>
                ) : null}

                {empDone ? (
                  <View style={[styles.successBox, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
                    <Feather name="check-circle" size={14} color={colors.success} />
                    <Text style={[styles.errorText, { color: colors.success }]}>Team member added! Almost done...</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  label="Add Team Member & Continue"
                  onPress={handleAddEmployee}
                  loading={empLoading}
                />
              </View>

              <TouchableOpacity onPress={() => setStep(4)} style={styles.skipLink}>
                <Text style={styles.skipText}>Skip for now</Text>
                <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEP 4: Done ─────────────────────────────────────────────── */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroSection}>
                <View style={[styles.bigIconSuccess, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={42} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>You're All Set!</Text>
                <Text style={styles.heroSub}>
                  Your workspace is ready. Start managing projects, tracking time, and growing your business.
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>What's next</Text>
                {[
                  { icon: "folder", text: "Create more projects from the Projects tab" },
                  { icon: "users", text: "Add your full crew in the Team tab" },
                  { icon: "clock", text: "Employees can clock in from their phones" },
                  { icon: "settings", text: "Customize your branding in Settings" },
                ].map((item) => (
                  <View key={item.text} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: colors.success + "15" }]}>
                      <Feather name={item.icon as any} size={16} color={colors.success} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <PrimaryButton
                label="Open Dashboard"
                onPress={goToDashboard}
              />
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

  progressWrap: {
    alignItems: "center",
    paddingBottom: 4,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressNum: { fontSize: 11, fontWeight: "800" },
  progressLine: { flex: 1, height: 2, minWidth: 40, maxWidth: 60 },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  scroll: { paddingHorizontal: 20, gap: 20 },

  stepContainer: { gap: 20 },

  heroSection: { alignItems: "center", gap: 12, paddingTop: 8 },
  bigIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  bigIconSuccess: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  heroCompany: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  heroSub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },

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
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 14, fontWeight: "500", flex: 1, lineHeight: 20 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  infoHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoHintText: { fontSize: 13, flex: 1, lineHeight: 18 },

  skipLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
  },
  skipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
});
