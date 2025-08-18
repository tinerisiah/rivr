"use client";

import { Header } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LoginForm } from "../../components/auth/login-form";
import { DriverRegister } from "../../components/auth/driver-register";
import { RegisterForm } from "../../components/auth/register-form";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../lib/auth";
import { useTenant } from "@/lib/tenant-context";

export function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [type, setType] = useState<
    "business" | "rivr_admin" | "driver" | "employee"
  >("business");

  const { subdomain } = useTenant();

  // Handle role parameter from URL for direct access
  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "rivr_admin") {
      setType("rivr_admin");
      return;
    } else if (role === "driver") {
      setType("driver");
      return;
    } else if (role === "employee_viewer") {
      setType("employee");
      return;
    }
  }, [searchParams, router]);

  // Redirect if already authenticated based on role
  React.useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case "business_owner":
          router.push("/business-admin");
          break;
        case "rivr_admin":
          router.push("/rivr-exec");
          break;
        case "driver":
          router.push("/driver");
          break;
        case "employee_viewer":
          router.push("/business-admin");
          break;
        default:
          router.push("/");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleLoginSuccess = () => {
    // Navigation will be handled by the useEffect above
  };

  const handleRegisterSuccess = () => {
    // Show success message and switch to login
    setShowRegister(false);
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Header minimal />

        {/* Authentication Forms */}
        {(!subdomain || type === "driver") && (
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              <Button
                variant={!showRegister ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowRegister(false)}
              >
                Login
              </Button>
              <Button
                variant={showRegister ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowRegister(true)}
              >
                Register
              </Button>
            </div>
          </div>
        )}

        {/* Authentication Forms */}
        <div className="flex justify-center">
          {!showRegister ? (
            <LoginForm
              type={type}
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setShowRegister(true)}
            />
          ) : type === "driver" ? (
            <DriverRegister />
          ) : (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setShowRegister(false)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} RIVR. All rights reserved.</p>
          <p className="mt-1">
            <a href="#" className="hover:text-foreground">
              Privacy Policy
            </a>
            {" • "}
            <a href="#" className="hover:text-foreground">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
