"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { authenticatedApiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck } from "lucide-react";

export default function TenantDriversPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = Number(params.businessId);
  const [q, setQ] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/tenants/drivers", businessId],
    queryFn: () =>
      authenticatedApiRequest(`/api/admin/tenants/${businessId}/drivers`),
    enabled: Number.isFinite(businessId),
  });

  const drivers = (data as any)?.drivers ?? [];
  const filtered = useMemo(() => {
    if (!q) return drivers;
    const s = q.toLowerCase();
    return drivers.filter((d: any) =>
      [d.name, d.email, d.phone]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s))
    );
  }, [q, drivers]);

  return (
    <AdminProtectedRoute>
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          <Link href="/rivr-exec/businesses" className="hover:underline">
            Businesses
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/rivr-exec/businesses/${businessId}`}
            className="hover:underline"
          >
            {businessId}
          </Link>
          <span className="mx-2">/</span>
          <span>Drivers</span>
        </div>

        <h1 className="text-2xl font-bold">Drivers</h1>
        <div className="max-w-md">
          <Input
            placeholder="Search drivers..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div>Loading drivers…</div>
        ) : isError ? (
          <div className="text-red-600">Failed to load drivers</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">No drivers found.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((d: any) => (
              <Card key={d.id} className="p-4 border border-border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" />
                      <div className="font-medium">{d.name}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{d.email}</span>
                    </div>
                  </div>
                  <Badge
                    className={
                      d.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {d.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminProtectedRoute>
  );
}
