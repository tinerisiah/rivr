"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authenticatedApiRequest } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Download, DollarSign, FileText } from "lucide-react";

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

export function ExecutiveRevenueReport() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/analytics/platform/summary"],
    queryFn: () => authenticatedApiRequest("/api/analytics/platform/summary"),
    refetchInterval: 60_000,
  });

  const businesses = (data as any)?.businesses || [];
  const totals = (data as any)?.totals || {};

  const rows = businesses.map((b: any) => ({
    businessId: b.businessId,
    businessName: b.businessName,
    status: b.status,
    subscriptionStatus: b.subscriptionStatus,
    totalPickups: b.totals.totalPickups,
    completedPickups: b.totals.completedPickups,
    billed: b.totals.billed,
    activeDrivers: b.activeDrivers,
    averageCompletionMinutes: b.averageCompletionMinutes,
    revenueTotal: b.revenueTotal || 0,
  }));

  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold">Revenue Report</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(rows, "revenue-report.csv")}
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div>Loading report…</div>
      ) : isError ? (
        <div className="text-red-600">Failed to load report</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Revenue
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ${(totals.totalRevenue || 0).toLocaleString()}
                  </div>
                </div>
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </Card>
            <Card className="p-4 border border-border">
              <div className="text-sm text-muted-foreground">Businesses</div>
              <div className="text-2xl font-bold">{totals.businesses || 0}</div>
            </Card>
            <Card className="p-4 border border-border">
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-2xl font-bold">
                {totals.activeBusinesses || 0}
              </div>
            </Card>
            <Card className="p-4 border border-border">
              <div className="text-sm text-muted-foreground">
                Billed Pickups
              </div>
              <div className="text-2xl font-bold">{totals.billed || 0}</div>
            </Card>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Pickups</th>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2 pr-4">Billed</th>
                  <th className="py-2 pr-4">Active Drivers</th>
                  <th className="py-2 pr-4">Avg Mins</th>
                  <th className="py-2 pr-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b: any) => (
                  <tr key={b.businessId} className="border-b border-border">
                    <td className="py-2 pr-4">{b.businessName}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary">{b.status}</Badge>
                    </td>
                    <td className="py-2 pr-4">{b.totals.totalPickups}</td>
                    <td className="py-2 pr-4">{b.totals.completedPickups}</td>
                    <td className="py-2 pr-4">{b.totals.billed}</td>
                    <td className="py-2 pr-4">{b.activeDrivers}</td>
                    <td className="py-2 pr-4">{b.averageCompletionMinutes}</td>
                    <td className="py-2 pr-4">
                      ${(b.revenueTotal || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
