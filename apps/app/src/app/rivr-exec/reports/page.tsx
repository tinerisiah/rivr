"use client";

import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutiveRevenueReport } from "@/components/rivr-exec/reports/ExecutiveRevenueReport";
import { CustomersReport } from "@/components/rivr-exec/reports/CustomersReport";
import { DriverPerformanceReport } from "@/components/rivr-exec/reports/DriverPerformanceReport";

export default function RivrExecReportsPage() {
  return (
    <AdminProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Executive Reports</h1>
        </div>

        <Card className="p-4 border border-border">
          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-background border border-border">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="drivers">Driver Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="revenue" className="mt-4">
              <ExecutiveRevenueReport />
            </TabsContent>
            <TabsContent value="customers" className="mt-4">
              <CustomersReport />
            </TabsContent>
            <TabsContent value="drivers" className="mt-4">
              <DriverPerformanceReport />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AdminProtectedRoute>
  );
}
