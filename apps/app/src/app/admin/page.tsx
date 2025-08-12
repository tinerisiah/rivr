"use client";

import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { AdminPanelRefactored } from "@/components/admin-panel-refactored";

export default function AdminPage() {
  return (
    <AdminProtectedRoute>
      <AdminPanelRefactored />
    </AdminProtectedRoute>
  );
}
