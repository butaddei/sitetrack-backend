import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const scheme = useColorScheme();
  const { primaryColor, secondaryColor } = useTheme();

  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;

  const primary = primaryColor ?? palette.primary;
  const secondary = secondaryColor ?? palette.secondary;
  const accent = secondaryColor ?? palette.accent;

  return { ...palette, primary, secondary, accent, radius: colors.radius };
}
