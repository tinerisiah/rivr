"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { authenticatedApiRequest } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export default function TenantHealthPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = Number(params.businessId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/health/tenant", businessId],
    queryFn: () =>
      authenticatedApiRequest(`/api/admin/health/tenant/${businessId}`),
    enabled: Number.isFinite(businessId),
    refetchInterval: 60_000,
  });

  return (
    <AdminProtectedRoute>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Tenant Health</h1>
        {isLoading ? (
          <div>Loading tenant health…</div>
        ) : isError ? (
          <div className="text-red-600">Failed to load tenant health</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Customers</h3>
                <Badge
                  className={
                    data?.checks?.customers?.ok ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {data?.checks?.customers?.ok ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Latency: {data?.checks?.customers?.latencyMs ?? "-"}ms
              </p>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Drivers</h3>
                <Badge
                  className={
                    data?.checks?.drivers?.ok ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {data?.checks?.drivers?.ok ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Latency: {data?.checks?.drivers?.latencyMs ?? "-"}ms
              </p>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Requests</h3>
                <Badge
                  className={
                    data?.checks?.requests?.ok ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {data?.checks?.requests?.ok ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Latency: {data?.checks?.requests?.latencyMs ?? "-"}ms
              </p>
            </Card>
          </div>
        )}
      </div>
    </AdminProtectedRoute>
  );
}
