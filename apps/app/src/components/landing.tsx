"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Cog, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/ui/header";
import QuoteRequestModal from "./quote-request-modal";
import PickupWheel from "./pickup-wheel";
import ServiceRequestModal from "./service-request-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { useTenant } from "@/lib/tenant-context";
import type { CombinedServiceRequestData } from "./service-request-modal";

interface QuoteInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName: string;
  description: string;
  photos: string[];
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName: string;
  address: string;
  roNumber?: string;
  customerNotes?: string;
}

interface PickupRequest {
  id: number;
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  businessName: string;
  address: string;
  wheelCount: number;
  isCompleted: boolean;
  completedAt: string | null;
  completionPhoto: string | null;
  completionLocation: string | null;
  completionNotes: string | null;
  employeeName: string | null;
  roNumber: string | null;
  customerNotes: string | null;
  wheelQrCodes: string[];
  isDelivered: boolean;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  deliveryQrCodes: string[];
  isArchived: boolean;
  archivedAt: string | null;
  routeId: number | null;
  routeOrder: number | null;
  priority: "low" | "normal" | "high" | "urgent";
  estimatedPickupTime: string | null;
  productionStatus:
    | "pending"
    | "in_process"
    | "ready_for_delivery"
    | "ready_to_bill"
    | "billed"
    | "archived";
  billedAt: string | null;
  billedAmount: string | null;
  invoiceNumber: string | null;
  createdAt: string;
}

export function Landing() {
  const router = useRouter();
  const { toast } = useToast();
  const { businessInfo, isLoading: isLoadingSettings } = useBusinessSettings();
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  // Single combined modal now handles user info + service details
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  // Deprecated local list; using `requests` instead
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [editingRequest, setEditingRequest] = useState<PickupRequest | null>(
    null
  );
  const { subdomain } = useTenant();

  const submitServiceRequest = async (details: CombinedServiceRequestData) => {
    setIsLoading(true);
    try {
      const payload = {
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        phone: details.phone,
        businessName: details.businessName,
        address: details.address,
        roNumber: details?.roNumber ?? undefined,
        customerNotes: details?.notes ?? undefined,
      };

      // If the user selected a business, ensure tenant header will be present
      if (details?.businessSubdomain) {
        try {
          localStorage.setItem("tenant_subdomain", details.businessSubdomain);
        } catch {
          // no-op
        }
      }

      const res = await apiRequest("POST", "/api/pickup-request", payload);
      const json = (await res.json()) as {
        success: boolean;
        requestId?: number;
        customerToken?: string;
        message?: string;
      };

      // In case the httpOnly cookie is blocked in current env, set a readable cookie for fallback
      if (json?.customerToken && typeof document !== "undefined") {
        const maxAgeDays = 180;
        document.cookie = `customer_token=${encodeURIComponent(json.customerToken)}; Max-Age=${maxAgeDays * 24 * 60 * 60}; Path=/; SameSite=Lax`;
      }

      // Set in-memory user info for footer display (no localStorage)
      setUserData({
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        phone: details.phone,
        businessName: details.businessName,
        address: details.address,
        roNumber: details.roNumber,
        customerNotes: details.notes,
      });

      toast({
        title: "Request Submitted",
        description: json?.message || "Service request submitted successfully.",
      });
      setShowServiceDetails(false);
      setEditingRequest(null);
      // Refresh list
      try {
        const r = await apiRequest("GET", "/api/customer/requests");
        const data = (await r.json()) as {
          success: boolean;
          requests: PickupRequest[];
        };
        if (data?.success) setRequests(data.requests);
      } catch {
        // ignore refresh error
      }
    } catch {
      toast({
        title: "Request Failed",
        description: "Failed to submit service request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceClick = () => {
    setShowServiceDetails(true);
  };
  // Load existing requests if a session exists
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/customer/requests");
        const json = (await res.json()) as {
          success: boolean;
          requests: PickupRequest[];
        };
        if (json?.success) setRequests(json.requests);
      } catch {
        // not logged as customer; ignore
      }
    })();
  }, []);

  const startEditRequest = (req: PickupRequest) => {
    setEditingRequest(req);
    setShowServiceDetails(true);
  };

  const handleQuoteRequest = () => {
    setShowQuoteForm(true);
  };

  const handleQuoteSubmit = async (data: QuoteInfo) => {
    try {
      const res = await apiRequest("POST", "/api/quote-request", data);
      const json = (await res.json()) as { success: boolean; message?: string };
      toast({
        title: "Quote Request Sent",
        description:
          json?.message ||
          "Quote request submitted successfully. We'll get back to you soon.",
      });
      setShowQuoteForm(false);
    } catch {
      toast({
        title: "Quote Request Failed",
        description: "Failed to submit quote request. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Removed separate user form; combined in ServiceRequestModal

  return (
    <div className="min-h-screen bg-background overscroll-none safe-area-top safe-area-bottom">
      <div className="container mx-auto mobile-padding">
        {/* Header with Portal Access */}
        <Header />

        {/* Hero Section with Custom Logo for Tenants */}
        {isLoadingSettings ? (
          <div className="text-center mb-8 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-muted rounded-lg animate-pulse flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Loading...
              </h1>
              <p className="text-lg text-muted-foreground">
                Please wait while we load your business settings.
              </p>
            </div>
          </div>
        ) : null}

        {/* Main Service Request Section */}
        <div className="text-center mb-6">
          <>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Request Service
            </h2>
            <p className="text-muted-foreground mb-4">
              Click the button to request service or get a quote
            </p>

            <div className="mb-5">
              <PickupWheel onClick={handleServiceClick} isLoading={isLoading} />
            </div>
          </>
          {!subdomain && (
            <div className="flex justify-center mb-6">
              <Button
                onClick={handleQuoteRequest}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10 hover:text-white px-8 py-3 min-w-[160px]"
              >
                Request Quote
              </Button>
            </div>
          )}
        </div>

        {/* Customer Dashboard - Vertically Aligned Service Requests */}
        {requests.length > 0 && (
          <div className="mb-8">
            <Card className="bg-card border-border shadow-sm max-w-2xl mx-auto">
              <CardHeader className="pb-4">
                <CardTitle className="text-card-foreground text-xl text-center">
                  My Service Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Pickup Requests */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Clock className="w-8 h-8 text-red-500" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {
                            requests.filter(
                              (r) =>
                                !r.isCompleted &&
                                (r.productionStatus === "pending" ||
                                  !r.productionStatus)
                            ).length
                          }
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          Pickup Requests
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Waiting for pickup
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="destructive"
                      className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                    >
                      {
                        requests.filter(
                          (r) =>
                            !r.isCompleted &&
                            (r.productionStatus === "pending" ||
                              !r.productionStatus)
                        ).length
                      }{" "}
                      Pending
                    </Badge>
                  </div>

                  {/* In Process */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Cog className="w-8 h-8 text-yellow-500" />
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {
                            requests.filter(
                              (r) => r.productionStatus === "in_process"
                            ).length
                          }
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          In Process
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Currently being serviced
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
                      {
                        requests.filter(
                          (r) => r.productionStatus === "in_process"
                        ).length
                      }{" "}
                      Active
                    </Badge>
                  </div>

                  {/* Ready for Delivery */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Package className="w-8 h-8 text-orange-500" />
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {
                            requests.filter(
                              (r) => r.productionStatus === "ready_for_delivery"
                            ).length
                          }
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          Ready for Delivery
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Awaiting delivery
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
                      {
                        requests.filter(
                          (r) => r.productionStatus === "ready_for_delivery"
                        ).length
                      }{" "}
                      Ready
                    </Badge>
                  </div>

                  {/* Editable list */}
                  <div className="space-y-3">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between p-3 rounded-md border border-border"
                      >
                        <div className="text-left">
                          <div className="font-medium text-foreground">
                            {r.businessName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {r.address}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            RO: {r.roNumber || "—"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!r.isCompleted && !r.isArchived && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditRequest(r)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Service Information */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-card-foreground text-lg">
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-card-foreground font-medium">
                    Request Service
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Submit your service request instantly
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-card-foreground font-medium">
                    We Schedule
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Our team will contact you to arrange service
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-card-foreground font-medium">
                    We Deliver
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Professional service delivery
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-card-foreground text-lg">
                Our Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-muted-foreground text-sm">
                  On-demand service requests
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-muted-foreground text-sm">
                  Commercial and retail service
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-muted-foreground text-sm">
                  Same-day and scheduled pickup
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-muted-foreground text-sm">
                  Professional handling
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer with Customer Info and Business Access */}
      <footer className="mt-12 pt-8 border-t border-border bg-card/30 rounded-t-lg">
        {/* Business Access Links */}
        <div className="text-center mb-6">
          <p className="text-muted-foreground text-sm mb-4">Business Access</p>
          <div className="flex justify-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/10"
              onClick={() => router.push("/auth?role=business")}
            >
              Business Portal
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/10"
              onClick={() => router.push("/auth?role=driver")}
            >
              Driver Dashboard
            </Button>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center pb-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()}{" "}
            {subdomain ? businessInfo?.name : "RIVR Logistics"}. All rights
            reserved.
          </p>
        </div>
      </footer>

      <QuoteRequestModal
        isOpen={showQuoteForm}
        onClose={() => setShowQuoteForm(false)}
        onSubmit={handleQuoteSubmit}
      />

      <ServiceRequestModal
        isOpen={showServiceDetails}
        onClose={() => setShowServiceDetails(false)}
        onSubmit={(details) =>
          editingRequest
            ? (async () => {
                // If editing existing request, call edit API
                try {
                  await apiRequest(
                    "PATCH",
                    `/api/customer/requests/${editingRequest.id}`,
                    {
                      roNumber: details.roNumber,
                      customerNotes: details.notes,
                      address: details.address,
                    }
                  );
                  toast({
                    title: "Request Updated",
                    description: "Your request was updated.",
                  });
                  setShowServiceDetails(false);
                  setEditingRequest(null);
                  const r = await apiRequest("GET", "/api/customer/requests");
                  const data = (await r.json()) as {
                    success: boolean;
                    requests: PickupRequest[];
                  };
                  if (data?.success) setRequests(data.requests);
                } catch {
                  toast({
                    title: "Update Failed",
                    description: "Could not update request.",
                    variant: "destructive",
                  });
                }
              })()
            : submitServiceRequest(details)
        }
        initialData={
          editingRequest
            ? {
                firstName: editingRequest.firstName,
                lastName: editingRequest.lastName,
                email: editingRequest.email,
                phone: editingRequest.phone || undefined,
                businessName: editingRequest.businessName,
                address: editingRequest.address,
                roNumber: editingRequest.roNumber || undefined,
                notes: editingRequest.deliveryNotes || undefined,
              }
            : undefined
        }
        disableUserFields={!!editingRequest}
      />
    </div>
  );
}
