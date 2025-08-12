"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { authenticatedApiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Mail, Phone, User } from "lucide-react";

export default function TenantCustomersPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = Number(params.businessId);
  const [q, setQ] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/tenants/customers", businessId],
    queryFn: () =>
      authenticatedApiRequest(`/api/admin/tenants/${businessId}/customers`),
    enabled: Number.isFinite(businessId),
  });

  const customers = (data as any)?.customers ?? [];
  const filtered = useMemo(() => {
    if (!q) return customers;
    const s = q.toLowerCase();
    return customers.filter((c: any) =>
      [c.firstName, c.lastName, c.email, c.businessName, c.phone]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s))
    );
  }, [q, customers]);

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
          <span>Customers</span>
        </div>

        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="max-w-md">
          <Input
            placeholder="Search customers..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div>Loading customers…</div>
        ) : isError ? (
          <div className="text-red-600">Failed to load customers</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">No customers found.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c: any) => (
              <Card key={c.id} className="p-4 border border-border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <div className="font-medium">
                        {c.lastName}, {c.firstName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" /> {c.email}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.businessName}
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
