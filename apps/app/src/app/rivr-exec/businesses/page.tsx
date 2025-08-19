"use client";

import { useState } from "react";
import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { BusinessesTab } from "@/components/admin/businesses-tab";
import { BusinessForm } from "@/components/admin/business-form";
import { authenticatedApiRequest } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function RivrExecBusinessesPage() {
  const { toast } = useToast();
  const [showBusinessForm, setShowBusinessForm] = useState(false);

  const { data: businessesData, isLoading: loadingBusinesses } = useQuery({
    queryKey: ["/api/admin/businesses"],
    queryFn: () => authenticatedApiRequest("/api/admin/businesses"),
  });

  const businesses = (businessesData as any)?.businesses || [];

  const updateBusinessStatusMutation = useMutation({
    mutationFn: async ({
      businessId,
      status,
    }: {
      businessId: number;
      status: string;
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
    onError: (error) => {
      console.log("Error updating business status", error);
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive",
      });
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (businessData: any) => {
      try {
        const data = await authenticatedApiRequest("/api/admin/businesses", {
          method: "POST",
          body: JSON.stringify(businessData),
        });
        return data;
      } catch (error) {
        console.log("Error creating business", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Business created");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/businesses"] });
      toast({
        title: "Business Created",
        description: "Business account created successfully",
        variant: "default",
      });
      setShowBusinessForm(false);
    },
    onError: (error) => {
      console.log("Error creating business", error);
      toast({
        title: "Error",
        description: "Failed to create business",
        variant: "destructive",
      });
    },
    onSettled: () => {
      console.log("Business created");
      setShowBusinessForm(false);
    },
  });

  const handleAddBusiness = () => setShowBusinessForm(true);
  const handleActivateBusiness = (businessId: number) =>
    updateBusinessStatusMutation.mutate({ businessId, status: "active" });
  const handleSuspendBusiness = (businessId: number) =>
    updateBusinessStatusMutation.mutate({ businessId, status: "suspended" });
  const handleCancelBusiness = (businessId: number) =>
    updateBusinessStatusMutation.mutate({ businessId, status: "canceled" });
  const handleBusinessSubmit = (businessData: any) => {
    createBusinessMutation.mutate(businessData);
  };

  return (
    <AdminProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Businesses</h1>
        <BusinessesTab
          businesses={businesses}
          loadingBusinesses={loadingBusinesses}
          onAddBusiness={handleAddBusiness}
          onActivateBusiness={handleActivateBusiness}
          onSuspendBusiness={handleSuspendBusiness}
          onCancelBusiness={handleCancelBusiness}
        />

        <BusinessForm
          open={showBusinessForm}
          onOpenChange={setShowBusinessForm}
          onSubmit={handleBusinessSubmit}
          isLoading={createBusinessMutation.isPending}
        />
      </div>
    </AdminProtectedRoute>
  );
}
