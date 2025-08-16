"use client";
import { useEffect, useState } from "react";
import { useTenant } from "@/lib/tenant-context";
import { getPublicBusinessSettings } from "@/lib/api";

interface BusinessSettings {
  id: number;
  businessId: number;
  customLogo: string | null;
  customBranding: string | null;
  emailSettings: string | null;
  notificationSettings: string | null;
  createdAt: string;
  updatedAt: string;
  businessName?: string; // Add business name from API response
}

interface PublicBusinessSettings {
  success: boolean;
  business: {
    id: number;
    businessName: string;
    subdomain: string;
    status: string;
  };
  settings: {
    customLogo: string | null;
    customBranding: string | null;
  } | null;
}

export function useBusinessSettings() {
  const { subdomain } = useTenant();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      // Only fetch if we have a subdomain and it's not the exec subdomain
      if (
        !subdomain ||
        subdomain === (process.env.NEXT_PUBLIC_EXEC_SUBDOMAIN || "exec")
      ) {
        console.log(
          "No subdomain or exec subdomain, skipping business settings fetch"
        );
        setSettings(null);
        return;
      }

      console.log("Fetching business settings for subdomain:", subdomain);
      setIsLoading(true);
      setError(null);

      try {
        // Use the public endpoint
        const data: PublicBusinessSettings =
          await getPublicBusinessSettings(subdomain);
        console.log("Public business settings response:", data);

        if (data.success && data.settings) {
          // Convert public response to internal format
          setSettings({
            id: data.settings.customLogo ? 1 : 0, // Dummy ID for public endpoint
            businessId: data.business.id,
            customLogo: data.settings.customLogo,
            customBranding: data.settings.customBranding,
            emailSettings: null,
            notificationSettings: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            businessName: data.business.businessName, // Add business name
          });
        } else {
          setSettings(null);
        }
      } catch (err) {
        console.error("Failed to fetch business settings:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch settings"
        );

        // Fallback to localStorage if API fails
        if (typeof window !== "undefined") {
          const savedLogo = localStorage.getItem("customLogo");
          console.log(
            "Fallback to localStorage, saved logo:",
            savedLogo ? "found" : "not found"
          );
          if (savedLogo) {
            setSettings({
              id: 0,
              businessId: 0,
              customLogo: savedLogo,
              customBranding: null,
              emailSettings: null,
              notificationSettings: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            setSettings(null);
          }
        } else {
          setSettings(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [subdomain]);

  return {
    settings,
    isLoading,
    error,
    hasCustomLogo: !!settings?.customLogo,
    customLogo: settings?.customLogo,
    businessInfo: settings
      ? {
          id: settings.businessId,
          name: settings.businessName,
        }
      : null,
  };
}
