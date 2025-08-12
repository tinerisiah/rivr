import { BusinessProtectedRoute } from "@/components/auth/protected-route";
import { BusinessPortal } from "@/components/business-portal";

export default function BusinessPage() {
  return (
    <BusinessProtectedRoute>
      <BusinessPortal />
    </BusinessProtectedRoute>
  );
}
