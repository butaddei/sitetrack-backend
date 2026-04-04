import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export function useColors() {
  const scheme = useColorScheme();
  const { user } = useAuth();

  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;

  const primary = user?.primaryColor ?? palette.primary;
  const secondary = user?.secondaryColor ?? palette.secondary;
  const accent = user?.secondaryColor ?? palette.accent;

  return { ...palette, primary, secondary, accent, radius: colors.radius };
}
