import { useEffect, useState } from "react";

/**
 * A hook that returns whether a media query matches
 * @param query - The media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Create a media query list
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener function
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup function
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Predefined media query hooks for common breakpoints
 */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () =>
  useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const useIsLargeDesktop = () => useMediaQuery("(min-width: 1440px)");

/**
 * Hook for checking if the device supports hover
 */
export const useSupportsHover = () => useMediaQuery("(hover: hover)");

/**
 * Hook for checking if the device is in dark mode preference
 */
export const usePrefersDarkMode = () =>
  useMediaQuery("(prefers-color-scheme: dark)");

/**
 * Hook for checking if the device is in reduced motion preference
 */
export const usePrefersReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");
