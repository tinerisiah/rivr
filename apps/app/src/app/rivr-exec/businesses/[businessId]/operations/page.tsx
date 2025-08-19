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
import { Calendar, CheckCircle, Clock, Package, Settings } from "lucide-react";

export default function TenantOperationsPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = Number(params.businessId);
  const [q, setQ] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/tenants/requests", businessId],
    queryFn: () =>
      authenticatedApiRequest(
        `/api/admin/tenants/${businessId}/pickup-requests`
      ),
    enabled: Number.isFinite(businessId),
  });

  const requests = (data as any)?.requests ?? [];
  const filtered = useMemo(() => {
    if (!q) return requests;
    const s = q.toLowerCase();
    return requests.filter((r: any) =>
      [r.firstName, r.lastName, r.email, r.productionStatus]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s))
    );
  }, [q, requests]);

  return (
    <AdminProtectedRoute>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
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
          <span>Operations</span>
        </div>

        <h1 className="text-2xl font-bold">Operations</h1>

        <div className="max-w-md">
          <Input
            placeholder="Search requests..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div>Loading requests…</div>
        ) : isError ? (
          <div className="text-red-600">Failed to load requests</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">No requests found.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r: any) => (
              <Card key={r.id} className="p-4 border border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {r.lastName}, {r.firstName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {r.productionStatus === "pending" ||
                      !r.productionStatus ? (
                        <>
                          <Clock className="w-4 h-4 text-red-500" /> Pending
                        </>
                      ) : r.productionStatus === "in_process" ? (
                        <>
                          <Settings className="w-4 h-4 text-yellow-500" />{" "}
                          Processing
                        </>
                      ) : r.productionStatus === "ready_for_delivery" ? (
                        <>
                          <Package className="w-4 h-4 text-orange-500" /> Ready
                          for delivery
                        </>
                      ) : r.productionStatus === "billed" ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />{" "}
                          Completed
                        </>
                      ) : (
                        <Badge variant="secondary">{r.productionStatus}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(
                        r.pickupDate || r.createdAt
                      ).toLocaleDateString()}
                    </div>
                    {typeof r.billedAmount === "number" && (
                      <div className="mt-1">
                        ${(r.billedAmount || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminProtectedRoute>
  );
}
