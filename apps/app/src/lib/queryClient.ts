"use client";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { debugApiRequest, debugApiResponse } from "./debug";
import { buildApiUrl } from "./api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function computeTenantSubdomain(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || "").toLowerCase();
  const host = window.location.host.toLowerCase();

  const getCookie = (name: string): string | null => {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  };

  const params = new URLSearchParams(window.location.search);
  const qsTenant = params.get("subdomain") || params.get("tenant");
  const lsTenant = window.localStorage.getItem("tenant_subdomain");
  const cookieTenant = getCookie("tenant_subdomain");

  let tenant = (qsTenant || lsTenant || cookieTenant || "").toLowerCase();

  // Infer from host when baseDomain is configured and matches
  if (!tenant && baseDomain && host.endsWith(`.${baseDomain}`)) {
    const withoutBase = host.slice(0, -`.${baseDomain}`.length);
    tenant = withoutBase || "";
  }

  if (tenant && tenant !== "www" && tenant !== "localhost") {
    return tenant;
  }
  return undefined;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  // Build full URL if it's a relative path
  const fullUrl = url.startsWith("http") ? url : buildApiUrl(url);
  debugApiRequest(method, fullUrl, data);

  const tenant = computeTenantSubdomain();
  const authToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("accessToken") || undefined
      : undefined;

  const headers: Record<string, string> = {};
  if (tenant) headers["X-Tenant-Subdomain"] = tenant;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (data !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  debugApiResponse(method, fullUrl, res, data);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith("http") ? url : buildApiUrl(url);

    const tenant = computeTenantSubdomain();
    const authToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem("accessToken") || undefined
        : undefined;
    const headers: Record<string, string> = {};
    if (tenant) headers["X-Tenant-Subdomain"] = tenant;
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
