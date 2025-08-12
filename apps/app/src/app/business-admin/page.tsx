"use client";

import { BusinessProtectedRoute } from "@/components/auth/protected-route";
import { BusinessAdminPanel } from "@/components/business-admin-panel";

export default function BusinessAdminPage() {
  return (
    <BusinessProtectedRoute>
      <BusinessAdminPanel />
    </BusinessProtectedRoute>
  );
}
