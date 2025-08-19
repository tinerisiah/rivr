import { BusinessProtectedRoute } from "@/components/auth/protected-route";
import { BusinessAdminPanel } from "@/components/business-admin-panel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Admin",
  description: "Business Admin",
};

export default function BusinessAdminPage() {
  return (
    <BusinessProtectedRoute>
      <BusinessAdminPanel />
    </BusinessProtectedRoute>
  );
}
