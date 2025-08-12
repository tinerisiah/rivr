"use client";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import React from "react";
import { useRequireAuth, useRequireRole } from "../../lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const requireAuth = useRequireAuth();
  const requireRole = useRequireRole(requiredRoles || []);

  // Show loading state
  if (requireAuth.isLoading || (requireRole && requireRole.isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth.requireAuth) {
    if (fallback) {
      return <>{fallback}</>;
    }

    redirect(`/auth?role=${requiredRoles?.[0]}`);
  }

  // Check if role is required
  if (requiredRoles && requiredRoles.length > 0 && requireRole.requireRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    redirect(`/auth?role=${requiredRoles?.[0]}`);
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
}

// Convenience components for common use cases
export function BusinessProtectedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["business_owner"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function BusinessOwnerRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["business_owner"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function AdminProtectedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["rivr_admin"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function DriverProtectedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["driver"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function AuthenticatedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <ProtectedRoute fallback={fallback}>{children}</ProtectedRoute>;
}
