import React, { createContext, useContext } from "react";
import { useAuth } from "@/context/AuthContext";

interface ThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: "#f97316",
  secondaryColor: "#0f172a",
  companyName: "SiteTrack",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <ThemeContext.Provider
      value={{
        primaryColor: user?.primaryColor ?? "#f97316",
        secondaryColor: user?.secondaryColor ?? "#0f172a",
        companyName: user?.companyName ?? "SiteTrack",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
