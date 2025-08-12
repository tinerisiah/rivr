"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Cog, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/ui/header";
import QuoteRequestModal from "./quote-request-modal";
import UserFormModal from "./user-form-modal";
import PickupWheel from "./pickup-wheel";

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
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [myRequests, setMyRequests] = useState<PickupRequest[]>([]);

  // Load saved user data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("serviceRequestUserData");
      if (savedData) {
        try {
          setUserData(JSON.parse(savedData));
        } catch (error) {
          console.error("Error parsing saved user data:", error);
        }
      }
    }
  }, []);

  const handleServiceClick = async () => {
    if (!userData) {
      // Show user form modal
      setShowUserForm(true);
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert("Service request submitted successfully!");
    } catch (error) {
      alert("Failed to submit service request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuoteRequest = () => {
    setShowQuoteForm(true);
  };

  const handleQuoteSubmit = (data: QuoteInfo) => {
    console.log("Quote request submitted:", data);
    // Here you would typically send the data to your API
    alert("Quote request submitted successfully! We'll get back to you soon.");
    setShowQuoteForm(false);
  };

  const handleFormSubmit = (data: UserInfo) => {
    console.log("User form submitted:", data);
    // Save user data to localStorage
    localStorage.setItem("serviceRequestUserData", JSON.stringify(data));
    setUserData(data);
    setShowUserForm(false);

    // Automatically proceed with service request
    setIsLoading(true);
    setTimeout(() => {
      alert("Service request submitted successfully!");
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background overscroll-none safe-area-top safe-area-bottom">
      <div className="container mx-auto mobile-padding">
        {/* Header with Portal Access */}
        <Header />

        {/* Main Service Request Section */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Request Service
          </h2>
          <p className="text-muted-foreground mb-4">
            Click the button to request service or get a quote
          </p>

          <div className="mb-5">
            <PickupWheel onClick={handleServiceClick} isLoading={isLoading} />
          </div>

          {/* Action Button - Request Quote */}
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleQuoteRequest}
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 hover:text-white px-8 py-3 min-w-[160px]"
            >
              Request Quote
            </Button>
          </div>
        </div>

        {/* Customer Dashboard - Vertically Aligned Service Requests */}
        {userData && myRequests.length > 0 && (
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
                            myRequests.filter(
                              (r: PickupRequest) =>
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
                        myRequests.filter(
                          (r: PickupRequest) =>
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
                            myRequests.filter(
                              (r: PickupRequest) =>
                                r.productionStatus === "in_process"
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
                        myRequests.filter(
                          (r: PickupRequest) =>
                            r.productionStatus === "in_process"
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
                            myRequests.filter(
                              (r: PickupRequest) =>
                                r.productionStatus === "ready_for_delivery"
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
                        myRequests.filter(
                          (r: PickupRequest) =>
                            r.productionStatus === "ready_for_delivery"
                        ).length
                      }{" "}
                      Ready
                    </Badge>
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
        {/* Customer Information Section */}
        {userData && (
          <div className="mb-6">
            <Card className="bg-card border-border shadow-sm max-w-md mx-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-card-foreground text-center text-lg">
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center">
                    <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      Ready for Service
                    </Badge>
                  </div>
                  <div>
                    <p className="text-card-foreground font-medium">
                      {userData.firstName} {userData.lastName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {userData.businessName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {userData.address}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {userData.email}
                    </p>
                    {userData.phone && (
                      <p className="text-muted-foreground text-sm">
                        {userData.phone}
                      </p>
                    )}
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={() => setShowUserForm(true)}
                      variant="outline"
                      size="sm"
                      className="border-border text-foreground hover:bg-muted"
                    >
                      Update Information
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
            © {new Date().getFullYear()} RIVR Logistics. All rights reserved.
          </p>
        </div>
      </footer>

      <QuoteRequestModal
        isOpen={showQuoteForm}
        onClose={() => setShowQuoteForm(false)}
        onSubmit={handleQuoteSubmit}
      />

      <UserFormModal
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
