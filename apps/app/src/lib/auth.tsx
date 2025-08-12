"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "./api";

// Types
export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  subdomain?: string;
  role: "business_owner" | "rivr_admin" | "driver";
  tenantId?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterBusinessData {
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
  subdomain: string;
  password: string;
}

// Authentication context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    credentials: LoginCredentials,
    type: "business" | "rivr_admin" | "driver"
  ) => Promise<AuthResponse>;
  registerBusiness: (data: RegisterBusinessData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthResponse>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API functions - now using the centralized API configuration
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  return authenticatedApiRequest(endpoint, options);
};

// Authentication provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check if user is authenticated on mount
  const {
    data: profileData,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => apiRequest("/api/auth/profile"),
    retry: false,
    enabled: false, // Always disabled, we'll manually trigger it
  });

  // Check for existing token on mount and fetch profile if available
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
          try {
            await refetchProfile();
          } catch (error) {
            // Token is invalid, clear it
            localStorage.removeItem("accessToken");
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [refetchProfile]);

  useEffect(() => {
    if (profileData?.success && profileData.user) {
      setUser(profileData.user);
    } else if (profileError) {
      // Token is invalid, clear it
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      setUser(null);
    }
  }, [profileData, profileError]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({
      credentials,
      type,
    }: {
      credentials: LoginCredentials;
      type: "business" | "rivr_admin" | "driver";
    }) => {
      let endpoint;
      switch (type) {
        case "business":
          endpoint = "/api/auth/business/login";
          break;
        case "rivr_admin":
          endpoint = "/api/auth/admin/login";
          break;
        case "driver":
          endpoint = "/api/auth/driver/login";
          break;
        default:
          throw new Error("Invalid login type");
      }
      return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data: AuthResponse) => {
      if (data.success && data.user && data.accessToken) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", data.accessToken);
        }
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        // Refetch profile to ensure we have the latest user data
        refetchProfile();
      }
    },
  });

  // Register business mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterBusinessData) => {
      return apiRequest("/api/auth/business/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/auth/logout", {
        method: "POST",
      });
    },
  });

  // Refresh token mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/auth/refresh", {
        method: "POST",
      });
    },
    onSuccess: (data: AuthResponse) => {
      if (data.success && data.accessToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", data.accessToken);
        }
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        // Refetch profile to ensure we have the latest user data
        refetchProfile();
      }
    },
  });

  const login = async (
    credentials: LoginCredentials,
    type: "business" | "rivr_admin" | "driver"
  ): Promise<AuthResponse> => {
    try {
      const result = await loginMutation.mutateAsync({ credentials, type });
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const registerBusiness = async (
    data: RegisterBusinessData
  ): Promise<AuthResponse> => {
    try {
      const result = await registerMutation.mutateAsync(data);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Registration failed",
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync();
      // Always clear auth state after successful logout
      clearAuth();
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Even if logout fails, clear local auth state
      clearAuth();
    }
  };

  const refreshToken = async (): Promise<AuthResponse> => {
    try {
      const result = await refreshMutation.mutateAsync();
      return result;
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Token refresh failed",
      };
    }
  };

  const clearAuth = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    queryClient.clear();
  };

  const value: AuthContextType = {
    user,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    isAuthenticated: !!user,
    login,
    registerBusiness,
    logout,
    refreshToken,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();

  return {
    user,
    isLoading,
    isAuthenticated,
    requireAuth: !isLoading && !isAuthenticated,
  };
}

// Hook for role-based access control
export function useRequireRole(allowedRoles: string[]) {
  const { user, isLoading, isAuthenticated } = useAuth();

  const hasRequiredRole = user && allowedRoles.includes(user.role);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRequiredRole,
    requireAuth: !isLoading && !isAuthenticated,
    requireRole: !isLoading && (!isAuthenticated || !hasRequiredRole),
  };
}
