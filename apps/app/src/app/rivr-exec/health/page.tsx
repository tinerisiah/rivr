"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { authenticatedApiRequest } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, Database, Globe, Radio } from "lucide-react";

export default function PlatformHealthPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/health"],
    queryFn: () => authenticatedApiRequest("/api/admin/health"),
    refetchInterval: 60_000,
  });

  return (
    <AdminProtectedRoute>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Platform Health</h1>
        {isLoading ? (
          <div>Loading health…</div>
        ) : isError ? (
          <div className="text-red-600">Failed to load health</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold">Database</h3>
                </div>
                <Badge
                  className={
                    data?.checks?.db?.ok ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {data?.checks?.db?.ok ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Latency: {data?.checks?.db?.latencyMs ?? "-"}ms • Businesses:{" "}
                {data?.checks?.db?.businessCount ?? "-"}
              </p>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold">Auth</h3>
                </div>
                <Badge
                  className={
                    data?.checks?.auth?.ok ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {data?.checks?.auth?.ok ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Token verified</p>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold">WebSocket</h3>
                </div>
                <Badge
                  className={
                    data?.checks?.websocket?.isRunning
                      ? "bg-green-500"
                      : "bg-red-500"
                  }
                >
                  {data?.checks?.websocket?.isRunning ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Clients: {data?.checks?.websocket?.totalClients ?? 0}
              </p>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold">Email</h3>
                </div>
                <Badge
                  className={
                    data?.checks?.email?.ok ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {data?.checks?.email?.ok ? "OK" : "DOWN"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Provider reachable
              </p>
            </Card>
          </div>
        )}
      </div>
    </AdminProtectedRoute>
  );
}
