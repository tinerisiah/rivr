"use client";

import { Header } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LoginForm } from "../../components/auth/login-form";
import { RegisterForm } from "../../components/auth/register-form";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useAuth } from "../../lib/auth";

export function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [type, setType] = useState<"business" | "rivr_admin" | "driver">(
    "business"
  );

  // Handle role parameter from URL for direct access
  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "rivr_admin") {
      setType("rivr_admin");
      return;
    } else if (role === "driver") {
      setType("driver");
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
        <Header />

        {/* Authentication Forms */}
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

        {/* Authentication Forms */}
        <div className="flex justify-center">
          {!showRegister ? (
            <LoginForm
              type={type}
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setShowRegister(true)}
            />
          ) : (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setShowRegister(false)}
            />
          )}
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <CardTitle className="text-lg">Fast & Efficient</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Streamlined pickup and delivery operations with real-time
                tracking
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <svg
                  className="h-6 w-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <CardTitle className="text-lg">Multi-Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Isolated business environments with custom subdomains and
                branding
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <svg
                  className="h-6 w-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <CardTitle className="text-lg">Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enterprise-grade security with JWT authentication and role-based
                access
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>&copy; 2024 RIVR. All rights reserved.</p>
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
