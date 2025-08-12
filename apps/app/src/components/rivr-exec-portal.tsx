"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedApiRequest, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Package,
  PieChart,
  Search,
  Settings,
  Target,
  Truck,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "./ui";
import { BusinessesTab } from "./admin/businesses-tab";
import { BusinessForm } from "./admin/business-form";
import AnalyticsDashboard from "./rivr-exec/analytics/AnalyticsDashboard";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function RivrExecPortal() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);

  // Load custom logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem("customLogo");
    if (savedLogo) {
      setCustomLogo(savedLogo);
    }
  }, []);

  // Get customers
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ["/api/admin/customers"],
    queryFn: () => authenticatedApiRequest("/api/admin/customers"),
    enabled: isAuthenticated,
  });

  // Get pickup requests
  const { data: requestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ["/api/admin/pickup-requests"],
    queryFn: () => authenticatedApiRequest("/api/admin/pickup-requests"),
    enabled: isAuthenticated,
  });

  // Get quote requests
  const { data: quoteRequestsData, isLoading: loadingQuoteRequests } = useQuery(
    {
      queryKey: ["/api/admin/quote-requests"],
      queryFn: () => authenticatedApiRequest("/api/admin/quote-requests"),
      enabled: isAuthenticated,
    }
  );

  // Get routes
  const { data: routesData } = useQuery({
    queryKey: ["/api/admin/routes"],
    queryFn: () => authenticatedApiRequest("/api/admin/routes"),
    enabled: isAuthenticated,
  });

  // Get drivers
  const { data: driversData, isLoading: loadingDrivers } = useQuery({
    queryKey: ["/api/admin/drivers"],
    queryFn: () => authenticatedApiRequest("/api/admin/drivers"),
    enabled: isAuthenticated,
  });

  // Get businesses
  const { data: businessesData, isLoading: loadingBusinesses } = useQuery({
    queryKey: ["/api/admin/businesses"],
    queryFn: () => authenticatedApiRequest("/api/admin/businesses"),
    enabled: isAuthenticated,
  });

  const customers = (customersData as any)?.customers || [];
  const requests = (requestsData as any)?.requests || [];
  const quoteRequests = (quoteRequestsData as any)?.requests || [];
  const routes = (routesData as any)?.routes || [];
  const drivers = (driversData as any)?.drivers || [];
  const businesses = (businessesData as any)?.businesses || [];

  // Business management mutations
  const updateBusinessStatusMutation = useMutation({
    mutationFn: async ({
      businessId,
      status,
    }: {
      businessId: number;
      status: string;
    }) => {
      const response = await apiRequest(
        `/api/admin/businesses/${businessId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );
      return response.json();
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

  const createBusinessMutation = useMutation({
    mutationFn: async (businessData: any) => {
      const response = await apiRequest("/api/admin/businesses", {
        method: "POST",
        body: JSON.stringify(businessData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/businesses"] });
      toast({
        title: "Business Created",
        description: "Business account created successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create business",
        variant: "destructive",
      });
    },
  });

  // Executive Analytics Functions
  const calculateRevenue = () => {
    const completedRequests = requests.filter(
      (r: any) => r.productionStatus === "billed"
    );
    return completedRequests.reduce((sum: number, request: any) => {
      return sum + (request.billedAmount || 0);
    }, 0);
  };

  const calculateAverageOrderValue = () => {
    const completedRequests = requests.filter(
      (r: any) => r.productionStatus === "billed"
    );
    if (completedRequests.length === 0) return 0;
    return calculateRevenue() / completedRequests.length;
  };

  const calculateCustomerRetentionRate = () => {
    const customersWithMultipleOrders = customers.filter((customer: any) => {
      const customerRequests = requests.filter(
        (r: any) => r.customerId === customer.id
      );
      return customerRequests.length > 1;
    });
    return Math.round(
      (customersWithMultipleOrders.length / Math.max(customers.length, 1)) * 100
    );
  };

  const calculateProcessingEfficiency = () => {
    const completedRequests = requests.filter(
      (r: any) => r.productionStatus === "billed"
    );
    const totalRequests = requests.length;
    if (totalRequests === 0) return 100;
    return Math.round((completedRequests.length / totalRequests) * 100);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // Business management functions
  const handleAddBusiness = () => {
    setShowBusinessForm(true);
  };

  const handleActivateBusiness = (businessId: number) => {
    updateBusinessStatusMutation.mutate({ businessId, status: "active" });
  };

  const handleSuspendBusiness = (businessId: number) => {
    updateBusinessStatusMutation.mutate({ businessId, status: "suspended" });
  };

  const handleCancelBusiness = (businessId: number) => {
    updateBusinessStatusMutation.mutate({ businessId, status: "canceled" });
  };

  const handleBusinessSubmit = (businessData: any) => {
    createBusinessMutation.mutate(businessData);
  };

  // Filter and sort customers for CRM functionality
  const filteredAndSortedCustomers = customers
    .filter((customer: any) => {
      if (!customerSearchQuery) return true;
      const query = customerSearchQuery.toLowerCase();
      return (
        customer.firstName.toLowerCase().includes(query) ||
        customer.lastName.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.businessName.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
      );
    })
    .sort((a: any, b: any) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto"
        >
          <Card className=" rounded-2xl shadow-lg p-8 text-center border border-border">
            <div className="mb-8">
              <Settings className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2 tracking-wide">
                Executive Access Required
              </h1>
              <p className=" text-sm tracking-wide">
                Please log in with executive credentials
              </p>
            </div>
            <Button onClick={() => router.push("/auth")} className="w-full">
              Go to Login
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom overscroll-none">
      <div className="max-w-7xl mx-auto mobile-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 sm:space-y-8"
        >
          <Header withPortalMenu={false} minimal={true} />

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 bg-background border border-border mobile-button shadow-sm">
              <TabsTrigger
                value="overview"
                className=" data-[state=active]:bg-blue-500 data-[state=active]:text-white mobile-caption tap-highlight-none"
              >
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Home</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className=" data-[state=active]:bg-blue-500 data-[state=active]:text-white mobile-caption tap-highlight-none"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className=" data-[state=active]:bg-blue-500 data-[state=active]:text-white mobile-caption tap-highlight-none"
              >
                Customers
              </TabsTrigger>
              <TabsTrigger
                value="businesses"
                className=" data-[state=active]:bg-blue-500 data-[state=active]:text-white mobile-caption tap-highlight-none hidden sm:flex"
              >
                Businesses
              </TabsTrigger>
              <TabsTrigger
                value="operations"
                className=" data-[state=active]:bg-blue-500 data-[state=active]:text-white mobile-caption tap-highlight-none hidden sm:flex"
              >
                Operations
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className=" data-[state=active]:bg-blue-500 data-[state=active]:text-white mobile-caption tap-highlight-none hidden sm:flex"
              >
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Executive Summary */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground tracking-wide mb-2">
                  Executive Summary
                </h2>
                <p className=" mb-4">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Total Revenue
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        ${calculateRevenue().toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                </Card>

                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Avg Order Value
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        ${calculateAverageOrderValue().toFixed(0)}
                      </p>
                    </div>
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  </div>
                </Card>

                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Customer Retention
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">
                        {calculateCustomerRetentionRate()}%
                      </p>
                    </div>
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                  </div>
                </Card>

                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Processing Efficiency
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {calculateProcessingEfficiency()}%
                      </p>
                    </div>
                    <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
                  </div>
                </Card>
              </div>

              {/* Production Pipeline Overview */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Production Pipeline
                </h3>
                <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
                  <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
                    <div className="relative">
                      <Clock className="w-12 h-12 text-red-500" />
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {
                          requests.filter(
                            (r: any) =>
                              !r.isCompleted &&
                              (r.productionStatus === "pending" ||
                                !r.productionStatus)
                          ).length
                        }
                      </span>
                    </div>
                    <span className="text-sm font-medium  mt-2">Pending</span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
                    <div className="relative">
                      <Settings className="w-12 h-12 text-yellow-500" />
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {
                          requests.filter(
                            (r: any) => r.productionStatus === "in_process"
                          ).length
                        }
                      </span>
                    </div>
                    <span className="text-sm font-medium  mt-2">
                      Processing
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
                    <div className="relative">
                      <Package className="w-12 h-12 text-orange-500" />
                      <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {
                          requests.filter(
                            (r: any) =>
                              r.productionStatus === "ready_for_delivery"
                          ).length
                        }
                      </span>
                    </div>
                    <span className="text-sm font-medium  mt-2">Ready</span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
                    <div className="relative">
                      <CheckCircle className="w-12 h-12 text-green-500" />
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {
                          requests.filter(
                            (r: any) => r.productionStatus === "billed"
                          ).length
                        }
                      </span>
                    </div>
                    <span className="text-sm font-medium  mt-2">Completed</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Total Customers
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">
                        {customers.length}
                      </p>
                    </div>
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  </div>
                </Card>

                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Active Drivers
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">
                        {drivers.filter((d: any) => d.isActive).length}
                      </p>
                    </div>
                    <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
                  </div>
                </Card>

                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Today's Orders
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">
                        {
                          requests.filter((r: any) => {
                            const today = new Date();
                            const requestDate = new Date(r.createdAt);
                            return (
                              requestDate.toDateString() ===
                              today.toDateString()
                            );
                          }).length
                        }
                      </p>
                    </div>
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                </Card>

                <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className=" text-xs sm:text-sm tracking-wide">
                        Quote Requests
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">
                        {quoteRequests.length}
                      </p>
                    </div>
                    <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="customers" className="space-y-6 mt-6">
              <Card className=" border border-border p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-wide">
                    Customer Overview
                  </h2>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pl-10  border-border text-foreground placeholder-foreground focus:border-blue-500"
                  />
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="text-center  py-8">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Loading customers...
                    </div>
                  ) : filteredAndSortedCustomers.length === 0 ? (
                    <div className="text-center  py-8">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {customerSearchQuery
                        ? "No customers match your search"
                        : "No customers yet"}
                    </div>
                  ) : (
                    filteredAndSortedCustomers
                      .slice(0, 10)
                      .map((customer: any) => {
                        const customerRequests = requests.filter(
                          (r: any) => r.customerId === customer.id
                        );
                        const completedOrders = customerRequests.filter(
                          (r: any) => r.productionStatus === "billed"
                        ).length;
                        const totalSpent = customerRequests
                          .filter((r: any) => r.productionStatus === "billed")
                          .reduce(
                            (sum: number, r: any) =>
                              sum + (r.billedAmount || 0),
                            0
                          );

                        return (
                          <div
                            key={customer.id}
                            className=" rounded-lg border border-border hover:bg-muted transition-colors shadow-sm p-4"
                          >
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <p className="text-foreground font-semibold text-lg">
                                    {customer.lastName}, {customer.firstName}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  <div className="flex items-center gap-2 ">
                                    <Building2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">
                                      {customer.businessName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 ">
                                    <Mail className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    <span className="truncate">
                                      {customer.email}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <span className="text-xs ">
                                      {completedOrders} orders
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-green-500" />
                                    <span className="text-xs ">
                                      ${totalSpent.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                <Button
                                  onClick={() =>
                                    copyToClipboard(customer.accessToken)
                                  }
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white text-xs"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy Link
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="businesses" className="space-y-6 mt-6">
              <BusinessesTab
                businesses={businesses}
                loadingBusinesses={loadingBusinesses}
                onAddBusiness={handleAddBusiness}
                onActivateBusiness={handleActivateBusiness}
                onSuspendBusiness={handleSuspendBusiness}
                onCancelBusiness={handleCancelBusiness}
              />
            </TabsContent>

            <TabsContent value="operations" className="space-y-6 mt-6">
              <Card className=" border border-border p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Operations Overview
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-semibold  mb-3">
                      Driver Status
                    </h4>
                    <div className="space-y-2">
                      {drivers.slice(0, 5).map((driver: any) => (
                        <div
                          key={driver.id}
                          className="flex justify-between items-center p-2 bg-muted rounded"
                        >
                          <span className="text-sm ">{driver.name}</span>
                          <Badge
                            className={
                              driver.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {driver.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold  mb-3">
                      Recent Activity
                    </h4>
                    <div className="space-y-2">
                      {requests.slice(0, 5).map((request: any) => (
                        <div
                          key={request.id}
                          className="flex justify-between items-center p-2 bg-muted rounded"
                        >
                          <span className="text-sm ">
                            {request.firstName} {request.lastName}
                          </span>
                          <Badge className="bg-blue-100 text-blue-800">
                            {request.productionStatus || "pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6 mt-6">
              <Card className=" border border-border p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Executive Reports
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="p-4 h-auto flex flex-col items-center gap-2"
                  >
                    <FileText className="w-8 h-8 text-blue-500" />
                    <span className="text-sm font-medium">Revenue Report</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="p-4 h-auto flex flex-col items-center gap-2"
                  >
                    <Users className="w-8 h-8 text-green-500" />
                    <span className="text-sm font-medium">
                      Customer Analysis
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="p-4 h-auto flex flex-col items-center gap-2"
                  >
                    <Activity className="w-8 h-8 text-orange-500" />
                    <span className="text-sm font-medium">
                      Operations Report
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="p-4 h-auto flex flex-col items-center gap-2"
                  >
                    <PieChart className="w-8 h-8 text-purple-500" />
                    <span className="text-sm font-medium">
                      Performance Metrics
                    </span>
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Business Form Modal */}
      <BusinessForm
        open={showBusinessForm}
        onOpenChange={setShowBusinessForm}
        onSubmit={handleBusinessSubmit}
        isLoading={createBusinessMutation.isPending}
      />
    </div>
  );
}
