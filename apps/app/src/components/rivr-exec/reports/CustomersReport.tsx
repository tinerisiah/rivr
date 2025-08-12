"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedApiRequest } from "@/lib/api";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Users } from "lucide-react";

function exportCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) =>
        headers
          .map((h) => {
            const v = (r as any)[h];
            const s = v == null ? "" : String(v);
            const needsQuote = /[",\n]/.test(s);
            return needsQuote ? `"${s.replaceAll('"', '""')}"` : s;
          })
          .join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CustomersReport() {
  const [q, setQ] = useState("");
  const [businessId, setBusinessId] = useState<string>("all");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (businessId && businessId !== "all")
      params.set("businessId", businessId);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [businessId, start, end]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/analytics/platform/customers", businessId, start, end],
    queryFn: () =>
      authenticatedApiRequest(
        `/api/analytics/platform/customers${queryString}`
      ),
    refetchInterval: 60_000,
  });

  const { data: businessesData } = useQuery({
    queryKey: ["/api/admin/businesses"],
    queryFn: () => authenticatedApiRequest("/api/admin/businesses"),
  });

  const businessOptions = (businessesData as any)?.businesses || [];

  const customers = (data as any)?.customers || [];
  const filtered = useMemo(() => {
    if (!q) return customers;
    const s = q.toLowerCase();
    return customers.filter((c: any) =>
      [c.customerName, c.email, c.businessName]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s))
    );
  }, [q, customers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Customers Report</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(filtered, "customers-report.csv")}
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Card className="p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Business</label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {businessOptions.map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Start</label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End</label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Search</label>
            <Input
              placeholder="Search customers or businesses..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div>Loading…</div>
      ) : isError ? (
        <div className="text-red-600">Failed to load customers</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="py-2 pr-4">Business</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Orders</th>
                <th className="py-2 pr-4">Billed</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr
                  key={`${c.businessId}-${c.customerId}`}
                  className="border-b border-border"
                >
                  <td className="py-2 pr-4">{c.businessName}</td>
                  <td className="py-2 pr-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    {c.customerName}
                  </td>
                  <td className="py-2 pr-4">{c.email}</td>
                  <td className="py-2 pr-4">{c.totalOrders}</td>
                  <td className="py-2 pr-4">{c.billedOrders}</td>
                  <td className="py-2 pr-4">
                    ${(c.totalRevenue || 0).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
