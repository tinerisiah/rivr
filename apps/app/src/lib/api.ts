// API configuration and utilities
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001";

// Helper function to build full API URLs
export function buildApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

// Enhanced API request function with base URL
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = buildApiUrl(endpoint);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  // Forward tenant subdomain for multi-tenant routing (works in dev and prod)
  if (typeof window !== "undefined") {
    const baseDomain = (
      process.env.NEXT_PUBLIC_BASE_DOMAIN || ""
    ).toLowerCase();
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

    // Only infer from host when baseDomain is configured and matches
    if (!tenant && baseDomain && host.endsWith(`.${baseDomain}`)) {
      const withoutBase = host.slice(0, -`.${baseDomain}`.length);
      tenant = withoutBase || "";
    }

    if (tenant && tenant !== "www" && tenant !== "localhost") {
      headers["X-Tenant-Subdomain"] = tenant;
    }
  }

  const optionHeaders = options.headers as Record<string, string>;

  delete options.headers;

  const config: RequestInit = {
    headers: {
      ...headers,
      ...optionHeaders,
    },
    credentials: "include",
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return response;
}

// Enhanced API request function with authentication
export async function authenticatedApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await apiRequest(endpoint, config);
  const data = await response.json();

  return data;
}
