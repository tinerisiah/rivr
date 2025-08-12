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

import { DriverPerformanceReport } from "@/components/rivr-exec/reports/DriverPerformanceReport";

export default function DriverPerformanceReportPage() {
  return (
    <AdminProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Driver Performance</h1>
        </div>
        <Card className="p-4 border border-border">
          <DriverPerformanceReport />
        </Card>
      </div>
    </AdminProtectedRoute>
  );
}
