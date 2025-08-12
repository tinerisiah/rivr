"use client";
import React, { createContext, useContext, useMemo } from "react";

type TenantInfo = {
  subdomain?: string | null;
  baseDomain: string;
  isExec: boolean;
  businessName?: string;
};

const TenantContext = createContext<TenantInfo | undefined>(undefined);

function parseTenantFromLocation(baseDomain: string): TenantInfo {
  if (typeof window === "undefined") {
    return { subdomain: undefined, baseDomain, isExec: false };
  }
  const host = window.location.host.toLowerCase();
  const isBase = host === baseDomain;
  let sub: string | null = null;
  if (!isBase && host.endsWith(`.${baseDomain}`)) {
    sub = host.slice(0, -`.${baseDomain}`.length);
  }
  const isExec = sub === (process.env.NEXT_PUBLIC_EXEC_SUBDOMAIN || "exec");

  // For now, use subdomain as business name (can be enhanced later with API call)
  const businessName =
    sub && !isExec
      ? sub.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      : undefined;

  return { subdomain: sub, baseDomain, isExec, businessName };
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost";
  const value = useMemo(
    () => parseTenantFromLocation(baseDomain),
    [baseDomain]
  );
  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantInfo {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    // Fallback if provider is not mounted
    return {
      subdomain: undefined,
      baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost",
      isExec: false,
    };
  }
  return ctx;
}
