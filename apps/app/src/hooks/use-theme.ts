"use client";
import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then default to system
    const stored = localStorage.getItem("rivr-theme");
    return (stored as Theme) || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Function to get system theme preference
  const getSystemTheme = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  // Update resolved theme whenever theme changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      const newResolvedTheme = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(newResolvedTheme);

      // Apply theme to document
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newResolvedTheme);
    };

    updateResolvedTheme();

    // Listen for system theme changes when using system theme
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateResolvedTheme();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("rivr-theme", theme);
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    isSystemTheme: theme === "system",
  };
}
