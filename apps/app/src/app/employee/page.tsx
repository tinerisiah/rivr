import { EmployeeProtectedRoute } from "@/components/auth/protected-route";
import { BusinessAdminPanel } from "@/components/business-admin-panel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employee",
  description: "Employee",
};

export default function EmployeePage() {
  return (
    <EmployeeProtectedRoute>
      <BusinessAdminPanel />
    </EmployeeProtectedRoute>
  );
}
