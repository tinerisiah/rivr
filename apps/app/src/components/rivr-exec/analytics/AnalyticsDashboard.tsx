"use client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { authenticatedApiRequest } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Clock, Users } from "lucide-react";

export function AnalyticsDashboard() {
  const { isAuthenticated } = useAuth();

  const { data: platform } = useQuery({
    queryKey: ["/api/analytics/platform/summary"],
    queryFn: () => authenticatedApiRequest("/api/analytics/platform/summary"),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 border border-border shadow-sm">
        <h3 className="text-lg font-bold mb-4">Platform Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Businesses</span>
            <span className="text-xl font-semibold">
              {platform?.totals?.businesses ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Active</span>
            <span className="text-xl font-semibold">
              {platform?.totals?.activeBusinesses ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Monthly Revenue</span>
            <span className="text-xl font-semibold">
              ${(platform?.totals?.totalMonthlyRevenue || 0) / 100}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Pickups</span>
            <span className="text-xl font-semibold">
              {platform?.totals?.totalPickups ?? 0}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6 border border-border shadow-sm">
        <h3 className="text-lg font-bold mb-4">Businesses</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {(platform?.businesses || []).map((b: any) => (
            <div
              key={b.businessId}
              className="flex items-center justify-between p-3 rounded border border-border"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-medium">{b.businessName}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.status} • {b.subscriptionStatus}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>{b.activeDrivers}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span>
                    {b.totals.completedPickups ?? 0}/{b.totals.totalPickups}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>{b.averageCompletionMinutes}m</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default AnalyticsDashboard;
