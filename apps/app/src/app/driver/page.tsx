"use client";

import { DriverProtectedRoute } from "@/components/auth/protected-route";
import { DriverDashboard } from "@/components/driver-dashboard";

export default function DriverPage() {
  return (
    <DriverProtectedRoute>
      <DriverDashboard />
    </DriverProtectedRoute>
  );
}
