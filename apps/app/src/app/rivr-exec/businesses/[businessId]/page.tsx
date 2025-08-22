"use client";

import { useMemo, useState } from "react";
import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authenticatedApiRequest } from "@/lib/api";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle, Database, Radio, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";

export default function RivrExecBusinessDetailPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = Number(params.businessId);
  const { toast } = useToast();
  const [resetOwnerDialogOpen, setResetOwnerDialogOpen] = useState(false);

  const { data: businessesData, isLoading: loadingBusinesses } = useQuery({
    queryKey: ["/api/admin/businesses"],
    queryFn: () => authenticatedApiRequest("/api/admin/businesses"),
  });

  const { data: platformSummary } = useQuery({
    queryKey: ["/api/analytics/platform/summary"],
    queryFn: () => authenticatedApiRequest("/api/analytics/platform/summary"),
  });

  const { data: tenantHealth } = useQuery({
    queryKey: ["/api/admin/health/tenant", businessId],
    queryFn: () =>
      authenticatedApiRequest(`/api/admin/health/tenant/${businessId}`),
    enabled: Number.isFinite(businessId),
    refetchInterval: 60_000,
  });

  const business = useMemo(() => {
    const list = (businessesData as any)?.businesses || [];
    return list.find((b: any) => b.id === businessId);
  }, [businessesData, businessId]);

  const platformEntry = useMemo(() => {
    const list = (platformSummary as any)?.businesses || [];
    return list.find((b: any) => b.businessId === businessId);
  }, [platformSummary, businessId]);

  const updateBusinessStatusMutation = useMutation({
    mutationFn: async ({
      status,
    }: {
      status: "pending" | "active" | "suspended" | "canceled";
    }) => {
      const data = await authenticatedApiRequest(
        `/api/admin/businesses/${businessId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/businesses"] });
      toast({
        title: "Business Status Updated",
        description: "Business status updated successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive",
      });
    },
  });

  const resetOwnerPasswordMutation = useMutation({
    mutationFn: async ({
      newPassword,
      confirmPassword,
    }: {
      newPassword: string;
      confirmPassword: string;
    }) => {
      const data = await authenticatedApiRequest(
        `/api/admin/businesses/${businessId}/reset-owner-password`,
        {
          method: "POST",
          body: JSON.stringify({ newPassword, confirmPassword }),
        }
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: "Owner password reset" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset owner password",
        variant: "destructive",
      });
    },
  });

  const statusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "suspended":
        return (
          <Badge className="bg-orange-100 text-orange-800">Suspended</Badge>
        );
      case "canceled":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      default:
        return status ? <Badge variant="secondary">{status}</Badge> : null;
    }
  };

  const handleResetOwnerPassword = () => {
    setResetOwnerDialogOpen(true);
  };

  const handleResetOwnerSubmit = async (newPassword: string) => {
    resetOwnerPasswordMutation.mutate({
      newPassword,
      confirmPassword: newPassword,
    });
  };

  return (
    <AdminProtectedRoute>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">
              <Link href="/rivr-exec/businesses" className="hover:underline">
                Businesses
              </Link>
              <span className="mx-2">/</span>
              <span>{businessId}</span>
            </div>
            <h1 className="text-2xl font-bold mt-1">
              {loadingBusinesses ? "Loading…" : business?.businessName || "-"}
            </h1>
            <div className="flex gap-2 mt-2">
              {statusBadge(business?.status)}
              {business?.subscriptionStatus && (
                <Badge variant="outline">{business.subscriptionStatus}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/rivr-exec/reports">
              <Button variant="outline">Reports</Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleResetOwnerPassword}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              title="Reset business owner password"
            >
              <KeyRound className="w-4 h-4 mr-1" /> Reset Owner Password
            </Button>
            {business?.status === "pending" && (
              <Button
                onClick={() =>
                  updateBusinessStatusMutation.mutate({ status: "active" })
                }
                className="bg-green-500 hover:bg-green-600"
              >
                Activate
              </Button>
            )}
            {business?.status === "active" && (
              <Button
                variant="outline"
                onClick={() =>
                  updateBusinessStatusMutation.mutate({ status: "suspended" })
                }
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                Suspend
              </Button>
            )}
            {business?.status === "suspended" && (
              <Button
                onClick={() =>
                  updateBusinessStatusMutation.mutate({ status: "active" })
                }
                className="bg-green-500 hover:bg-green-600"
              >
                Reactivate
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                updateBusinessStatusMutation.mutate({ status: "canceled" })
              }
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Cancel
            </Button>
          </div>
        </div>

        <Card className="p-3 border border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Tenant pages</h3>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/rivr-exec/businesses/${businessId}/customers`}>
                <Button variant="outline" size="sm">
                  Customers
                </Button>
              </Link>
              <Link href={`/rivr-exec/businesses/${businessId}/drivers`}>
                <Button variant="outline" size="sm">
                  Drivers
                </Button>
              </Link>
              <Link href={`/rivr-exec/businesses/${businessId}/operations`}>
                <Button variant="outline" size="sm">
                  Operations
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 border border-border">
            <h3 className="font-semibold mb-2">Overview</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Subdomain: </span>
                {business?.subdomain
                  ? `${business.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
                  : "-"}
              </div>
              <div>
                <span className="font-medium text-foreground">Owner: </span>
                {business
                  ? `${business.ownerFirstName} ${business.ownerLastName}`
                  : "-"}
              </div>
              <div>
                <span className="font-medium text-foreground">Email: </span>
                {business?.ownerEmail || "-"}
              </div>
              <div>
                <span className="font-medium text-foreground">Plan: </span>
                {business?.subscriptionPlan || "-"}
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border">
            <h3 className="font-semibold mb-2">Health</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-3 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Customers</span>
                  </div>
                  <Badge
                    className={
                      tenantHealth?.checks?.customers?.ok
                        ? "bg-green-500"
                        : "bg-red-500"
                    }
                  >
                    {tenantHealth?.checks?.customers?.ok ? "OK" : "DOWN"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Latency: {tenantHealth?.checks?.customers?.latencyMs ?? "-"}ms
                </p>
              </Card>

              <Card className="p-3 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Drivers</span>
                  </div>
                  <Badge
                    className={
                      tenantHealth?.checks?.drivers?.ok
                        ? "bg-green-500"
                        : "bg-red-500"
                    }
                  >
                    {tenantHealth?.checks?.drivers?.ok ? "OK" : "DOWN"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Latency: {tenantHealth?.checks?.drivers?.latencyMs ?? "-"}ms
                </p>
              </Card>

              <Card className="p-3 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Requests</span>
                  </div>
                  <Badge
                    className={
                      tenantHealth?.checks?.requests?.ok
                        ? "bg-green-500"
                        : "bg-red-500"
                    }
                  >
                    {tenantHealth?.checks?.requests?.ok ? "OK" : "DOWN"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Latency: {tenantHealth?.checks?.requests?.latencyMs ?? "-"}ms
                </p>
              </Card>
            </div>
          </Card>
        </div>

        <Card className="p-4 border border-border">
          <h3 className="font-semibold mb-2">Performance</h3>
          {!platformEntry ? (
            <div className="text-sm text-muted-foreground">
              No analytics available.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded border border-border">
                <div className="text-muted-foreground">Total Pickups</div>
                <div className="text-xl font-semibold">
                  {platformEntry.totals.totalPickups}
                </div>
              </div>
              <div className="p-3 rounded border border-border">
                <div className="text-muted-foreground">Completed</div>
                <div className="text-xl font-semibold">
                  {platformEntry.totals.completedPickups}
                </div>
              </div>
              <div className="p-3 rounded border border-border">
                <div className="text-muted-foreground">Billed</div>
                <div className="text-xl font-semibold">
                  {platformEntry.totals.billed}
                </div>
              </div>
              <div className="p-3 rounded border border-border">
                <div className="text-muted-foreground">Active Drivers</div>
                <div className="text-xl font-semibold">
                  {platformEntry.activeDrivers}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Reset Owner Password Dialog */}
      <ResetPasswordDialog
        open={resetOwnerDialogOpen}
        onOpenChange={setResetOwnerDialogOpen}
        onSubmit={handleResetOwnerSubmit}
        title="Reset Business Owner Password"
        description="Enter a new password for the business owner. The owner will receive an email with the new password."
        userEmail={business?.ownerEmail}
      />
    </AdminProtectedRoute>
  );
}
