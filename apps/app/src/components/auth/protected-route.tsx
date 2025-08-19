"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo } from "react";
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
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const requireRole = useRequireRole(requiredRoles || []);

  // Determine if we should redirect and to where
  const redirectPath = useMemo(() => {
    console.log("requiredRoles", requiredRoles);
    const roleParam = requiredRoles?.[0];
    const base = "/auth";
    return roleParam ? `${base}?role=${roleParam}` : base;
  }, [requiredRoles]);

  const shouldRedirect = useMemo(() => {
    if (requireAuth.requireAuth) return true;
    if (requiredRoles && requiredRoles.length > 0 && requireRole.requireRole)
      return true;
    return false;
  }, [requireAuth.requireAuth, requiredRoles, requireRole.requireRole]);

  useEffect(() => {
    if (shouldRedirect) {
      // Use replace to prevent adding a back entry to a protected page
      router.replace(redirectPath);
    }
  }, [shouldRedirect, router, redirectPath]);

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

  if (shouldRedirect) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting…</p>
        </div>
      </div>
    );
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
    <ProtectedRoute
      requiredRoles={["business_owner", "employee_viewer"]}
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
}

export function EmployeeProtectedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["employee_viewer"]} fallback={fallback}>
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
