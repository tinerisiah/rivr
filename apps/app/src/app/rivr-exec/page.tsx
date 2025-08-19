import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { RivrExecPortal } from "@/components/rivr-exec-portal";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RIVR Exec Portal",
  description: "RIVR Exec Portal for managing your businesses",
};

export default function RivrExecPage() {
  return (
    <AdminProtectedRoute>
      <RivrExecPortal />
    </AdminProtectedRoute>
  );
}
