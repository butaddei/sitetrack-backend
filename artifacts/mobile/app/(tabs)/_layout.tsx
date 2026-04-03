import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ isAdmin }: { isAdmin: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="projects">
        <Icon sf={{ default: "folder", selected: "folder.fill" }} />
        <Label>Projects</Label>
      </NativeTabs.Trigger>
      {isAdmin ? (
        <NativeTabs.Trigger name="employees">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Employees</Label>
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="worklog">
          <Icon sf={{ default: "clock", selected: "clock.fill" }} />
          <Label>Work Log</Label>
        </NativeTabs.Trigger>
      )}
      {isAdmin ? (
        <NativeTabs.Trigger name="timesheets">
          <Icon sf={{ default: "clock", selected: "clock.fill" }} />
          <Label>Timesheets</Label>
        </NativeTabs.Trigger>
      ) : null}
      {isAdmin ? (
        <NativeTabs.Trigger name="reports">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Reports</Label>
        </NativeTabs.Trigger>
      ) : null}
    </NativeTabs>
  );
}

function ClassicTabLayout({ isAdmin }: { isAdmin: boolean }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="folder" tintColor={color} size={22} />
            ) : (
              <Feather name="folder" size={22} color={color} />
            ),
        }}
      />
      {isAdmin ? (
        <Tabs.Screen
          name="employees"
          options={{
            title: "Employees",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person.2" tintColor={color} size={22} />
              ) : (
                <Feather name="users" size={22} color={color} />
              ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="employees"
          options={{ href: null }}
        />
      )}
      {isAdmin ? (
        <Tabs.Screen
          name="timesheets"
          options={{
            title: "Time",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="clock" tintColor={color} size={22} />
              ) : (
                <Feather name="clock" size={22} color={color} />
              ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="timesheets"
          options={{ href: null }}
        />
      )}
      {isAdmin ? (
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="chart.bar" tintColor={color} size={22} />
              ) : (
                <Feather name="bar-chart-2" size={22} color={color} />
              ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="reports"
          options={{ href: null }}
        />
      )}
      {!isAdmin ? (
        <Tabs.Screen
          name="worklog"
          options={{
            title: "Work Log",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="clock" tintColor={color} size={22} />
              ) : (
                <Feather name="play-circle" size={22} color={color} />
              ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="worklog"
          options={{ href: null }}
        />
      )}
    </Tabs>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  const isAdmin = user.role === "admin";

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isAdmin={isAdmin} />;
  }
  return <ClassicTabLayout isAdmin={isAdmin} />;
}
