import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { RivrExecPortal } from "@/components/rivr-exec-portal";

export default function RivrExecPage() {
  return (
    <AdminProtectedRoute>
      <RivrExecPortal />
    </AdminProtectedRoute>
  );
}
