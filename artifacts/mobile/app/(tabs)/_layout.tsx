import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function hide() {
  return { href: null as any };
}

export default function TabLayout() {
  const colors = useColors();
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  const isAdmin = user.role === "admin";

  const icon = (name: string, sfName?: string) =>
    ({ color }: { color: string }) =>
      isIOS && sfName ? (
        <SymbolView name={sfName} tintColor={color} size={22} />
      ) : (
        <Feather name={name as any} size={22} color={color} />
      );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.1,
          marginBottom: isWeb ? 4 : 0,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          ...(isWeb ? { height: 80 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      {/* ─── ADMIN TABS ─── */}
      <Tabs.Screen
        name="index"
        options={
          isAdmin
            ? { title: "Dashboard", tabBarIcon: icon("home", "house") }
            : hide()
        }
      />
      <Tabs.Screen
        name="projects"
        options={
          isAdmin
            ? { title: "Projects", tabBarIcon: icon("folder", "folder") }
            : hide()
        }
      />
      <Tabs.Screen
        name="employees"
        options={
          isAdmin
            ? { title: "Team", tabBarIcon: icon("users", "person.2") }
            : hide()
        }
      />
      <Tabs.Screen
        name="timesheets"
        options={
          isAdmin
            ? { title: "Timesheets", tabBarIcon: icon("clock", "clock") }
            : hide()
        }
      />
      <Tabs.Screen
        name="reports"
        options={
          isAdmin
            ? { title: "Reports", tabBarIcon: icon("bar-chart-2", "chart.bar") }
            : hide()
        }
      />
      <Tabs.Screen
        name="company-settings"
        options={
          isAdmin
            ? { title: "Settings", tabBarIcon: icon("settings", "gearshape") }
            : hide()
        }
      />

      {/* ─── EMPLOYEE TABS ─── */}
      <Tabs.Screen
        name="emp-home"
        options={
          !isAdmin
            ? { title: "Home", tabBarIcon: icon("home", "house") }
            : hide()
        }
      />
      <Tabs.Screen
        name="emp-projects"
        options={
          !isAdmin
            ? { title: "My Jobs", tabBarIcon: icon("briefcase", "folder") }
            : hide()
        }
      />
      <Tabs.Screen
        name="emp-notes"
        options={
          !isAdmin
            ? { title: "Notes", tabBarIcon: icon("file-text", "doc.text") }
            : hide()
        }
      />
      <Tabs.Screen
        name="emp-profile"
        options={
          !isAdmin
            ? { title: "Profile", tabBarIcon: icon("user", "person") }
            : hide()
        }
      />

      {/* ─── HIDDEN LEGACY SCREENS ─── */}
      <Tabs.Screen name="worklog" options={hide()} />
    </Tabs>
  );
}
