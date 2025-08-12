"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Truck,
  Package,
  MapPin,
  Clock,
  Users,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Route as RouteIcon,
} from "lucide-react";
import Link from "next/link";
import { RivrLogo } from "@/components/rivr-logo";
import { useAuth } from "@/lib/auth";

export function BusinessPortal() {
  const router = useRouter();

  const { user } = useAuth();

  console.log(user);

  const handleAdminAccess = () => {
    router.push("/business-admin");
  };

  const handleDriverAccess = () => {
    router.push("/driver");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Link href="/">
            <Button
              variant="outline"
              className="mb-6 border-border text-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center justify-center mb-6">
            <RivrLogo size="lg" />
            <div className="ml-6">
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                BUSINESS PORTAL
              </h1>
              <p className="text-lg text-blue-500 font-medium">
                Choose your role to continue
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Admin Access */}
          <Card className="bg-card/80 backdrop-blur border border-border hover:border-cyan-500 transition-all duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-card-foreground mb-4">
                Business Admin
              </h3>
              <p className="text-muted-foreground mb-6">
                Manage customers, drivers, routes, and business operations
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2 text-cyan-400" />
                  Customer management
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Truck className="w-4 h-4 mr-2 text-cyan-400" />
                  Driver & fleet oversight
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <RouteIcon className="w-4 h-4 mr-2 text-cyan-400" />
                  Route optimization
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Settings className="w-4 h-4 mr-2 text-cyan-400" />
                  System configuration
                </div>
              </div>
              <Button
                onClick={handleAdminAccess}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold"
              >
                Admin Login
              </Button>
            </div>
          </Card>

          {/* Driver Access */}
          <Card className="bg-card/80 backdrop-blur border border-border hover:border-cyan-500 transition-all duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-card-foreground mb-4">
                Driver Dashboard
              </h3>
              <p className="text-muted-foreground mb-6">
                Access your assigned routes, navigation, and delivery tracking
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-muted-foreground">
                  <RouteIcon className="w-4 h-4 mr-2 text-cyan-400" />
                  View assigned routes
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Settings className="w-4 h-4 mr-2 text-cyan-400" />
                  GPS navigation
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2 text-cyan-400" />
                  Customer information
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Truck className="w-4 h-4 mr-2 text-cyan-400" />
                  Real-time location tracking
                </div>
              </div>
              <Button
                onClick={handleDriverAccess}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold"
              >
                Driver Login
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick Admin Link */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground text-sm mb-4">
            Business owner? Access admin panel directly
          </p>
          <Link href="/business-admin">
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings className="w-4 h-4 mr-2" />
              Direct Admin Access
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
