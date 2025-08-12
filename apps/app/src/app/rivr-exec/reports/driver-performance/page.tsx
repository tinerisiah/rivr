"use client";

import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authenticatedApiRequest } from "@/lib/api";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function DriverPerformanceReportPage() {
  const [q, setQ] = useState("");
  const [businessId, setBusinessId] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (businessId) params.set("businessId", businessId);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [businessId, start, end]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "/api/analytics/platform/driver-performance",
      businessId,
      start,
      end,
    ],
    queryFn: () =>
      authenticatedApiRequest(
        `/api/analytics/platform/driver-performance${queryString}`
      ),
    refetchInterval: 60_000,
  });

  const { data: businessesData } = useQuery({
    queryKey: ["/api/admin/businesses"],
    queryFn: () => authenticatedApiRequest("/api/admin/businesses"),
  });

  const businessOptions = (businessesData as any)?.businesses || [];

  const drivers = (data as any)?.drivers || [];
  const filtered = useMemo(() => {
    if (!q) return drivers;
    const s = q.toLowerCase();
    return drivers.filter((d: any) =>
      [d.driverName, d.businessName]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s))
    );
  }, [q, drivers]);

  return (
    <AdminProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Driver Performance</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filtered, "driver-performance.csv")}
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
                  <SelectItem value="">All</SelectItem>
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
                placeholder="Search drivers or businesses..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div>Loading…</div>
        ) : isError ? (
          <div className="text-red-600">Failed to load driver performance</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Driver</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Routes</th>
                  <th className="py-2 pr-4">Assigned</th>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2 pr-4">Billed</th>
                  <th className="py-2 pr-4">Avg Mins</th>
                  <th className="py-2 pr-4">Route Minutes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => (
                  <tr
                    key={`${d.businessId}-${d.driverId}`}
                    className="border-b border-border"
                  >
                    <td className="py-2 pr-4">{d.businessName}</td>
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" />
                      {d.driverName}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge
                        className={
                          d.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{d.routes}</td>
                    <td className="py-2 pr-4">{d.pickupsAssigned}</td>
                    <td className="py-2 pr-4">{d.pickupsCompleted}</td>
                    <td className="py-2 pr-4">{d.pickupsBilled}</td>
                    <td className="py-2 pr-4">{d.averageCompletionMinutes}</td>
                    <td className="py-2 pr-4">{d.totalRouteMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminProtectedRoute>
  );
}
