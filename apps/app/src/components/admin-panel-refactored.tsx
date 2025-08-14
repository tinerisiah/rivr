"use client";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { BusinessForm } from "@/components/admin/business-form";
import { CustomersTab } from "@/components/admin/customers-tab";
import { DriversTab } from "@/components/admin/drivers-tab";
import { OverviewTab } from "@/components/admin/overview-tab";
import { ProductionTab } from "@/components/admin/production-tab";
import { QuotesTab } from "@/components/admin/quotes-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import WelcomeAnimation, {
  useWelcomeAnimation,
} from "@/components/welcome-animation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Customer,
  Driver,
  PickupRequest,
  QuoteRequest,
} from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { API_BASE_URL } from "@/lib/api";

// Form schemas
const customerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().min(1, "Address is required"),
});

const adminCompletePickupSchema = z.object({
  id: z.number(),
  roNumber: z.string().min(1, "RO# is required"),
  completionNotes: z.string().optional(),
  completionPhoto: z.string().min(1, "Photo is required"),
});

const deliverPickupSchema = z.object({
  id: z.number(),
  deliveryNotes: z.string().optional(),
});

const driverFormSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;
type AdminCompletePickupData = z.infer<typeof adminCompletePickupSchema>;
type DeliverPickupData = z.infer<typeof deliverPickupSchema>;
type DriverFormData = z.infer<typeof driverFormSchema>;

interface AdminPanelRefactoredProps {
  title?: string;
  subtitle?: string;
  showDriverLink?: boolean;
  showCustomerLink?: boolean;
  showBusinessesTab?: boolean;
  driverLinkText?: string;
  customerLinkText?: string;
  customLogo?: string | null;
  onLogoChange?: (logo: string | null) => void;
}

export function AdminPanelRefactored({
  title = "Admin Dashboard",
  subtitle = "Manage customers and pickup requests",
  showDriverLink = true,
  showCustomerLink = true,
  showBusinessesTab = true,
  driverLinkText = "Driver Dashboard",
  customerLinkText = "Customer View",
  customLogo,
  onLogoChange,
}: AdminPanelRefactoredProps) {
  const { user, isAuthenticated: isMainAuth, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Welcome animation
  const { showWelcome, completeWelcome } = useWelcomeAnimation();

  // State management
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PickupRequest | null>(
    null
  );
  const [selectedDeliveryRequest, setSelectedDeliveryRequest] =
    useState<PickupRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] =
    useState<PickupRequest | null>(null);
  const [showQuoteDetails, setShowQuoteDetails] = useState(false);
  const [selectedQuoteForDetails, setSelectedQuoteForDetails] =
    useState<QuoteRequest | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedRequestForReassign, setSelectedRequestForReassign] =
    useState<PickupRequest | null>(null);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showEmailTemplatesModal, setShowEmailTemplatesModal] = useState(false);
  const [showEmailLogsModal, setShowEmailLogsModal] = useState(false);
  const [showCustomerEmailModal, setShowCustomerEmailModal] = useState(false);
  const [selectedCustomerForEmail, setSelectedCustomerForEmail] =
    useState<Customer | null>(null);
  const [customSignature, setCustomSignature] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [showJobDetailsModal, setShowJobDetailsModal] =
    useState<PickupRequest | null>(null);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<
    string | null
  >(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);

  // Load custom logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem("customLogo");
    if (savedLogo && onLogoChange) {
      onLogoChange(savedLogo);
    }
  }, [onLogoChange]);

  // Check if user is authenticated through main auth system
  useEffect(() => {
    if (isMainAuth && user && user.role === "rivr_admin") {
      toast({
        title: "Welcome",
        description: `Welcome ${user.firstName || user.email}!`,
        variant: "default",
      });
    }
  }, [isMainAuth, user, toast]);

  // Forms
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: "",
      address: "",
    },
  });

  const editForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: "",
      address: "",
    },
  });

  const completionForm = useForm<AdminCompletePickupData>({
    resolver: zodResolver(adminCompletePickupSchema),
    defaultValues: {
      id: 0,
      roNumber: "",
      completionNotes: "",
      completionPhoto: "",
    },
  });

  const deliveryForm = useForm<DeliverPickupData>({
    resolver: zodResolver(deliverPickupSchema),
    defaultValues: {
      id: 0,
      deliveryNotes: "",
    },
  });

  const reassignForm = useForm<{ routeId: string }>({
    defaultValues: {
      routeId: "",
    },
  });

  const driverForm = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      licenseNumber: "",
    },
  });

  const editDriverForm = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      licenseNumber: "",
    },
  });

  // Queries
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ["/api/admin/customers"],
    enabled: isMainAuth,
  });

  const { data: requestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ["/api/admin/pickup-requests"],
    enabled: isMainAuth,
  });

  const { data: quoteRequestsData, isLoading: loadingQuoteRequests } = useQuery(
    {
      queryKey: ["/api/admin/quote-requests"],
      enabled: isMainAuth,
    }
  );

  const { data: routesData } = useQuery({
    queryKey: ["/api/admin/routes"],
    enabled: isMainAuth,
  });

  const { data: driversData, isLoading: loadingDrivers } = useQuery({
    queryKey: ["/api/admin/drivers"],
    enabled: isMainAuth,
  });

  const { data: emailTemplatesData, isLoading: loadingEmailTemplates } =
    useQuery({
      queryKey: ["/api/admin/email-templates"],
      enabled: showEmailTemplatesModal,
    });

  const { data: emailLogsData, isLoading: loadingEmailLogs } = useQuery({
    queryKey: ["/api/admin/email-logs"],
    enabled: showEmailLogsModal,
  });

  // const { data: businessesData, isLoading: loadingBusinesses } = useQuery({
  //   queryKey: ["/api/admin/businesses"],
  //   enabled: isMainAuth,
  // });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/customers",
        customerData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setShowCustomerForm(false);
      form.reset();
      toast({
        title: "Customer Created",
        description: "Customer profile created successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData & { id: number }) => {
      const response = await apiRequest(
        "PUT",
        `/api/admin/customers/${customerData.id}`,
        customerData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setShowEditCustomerModal(false);
      setSelectedCustomer(null);
      editForm.reset();
      toast({
        title: "Customer Updated",
        description: "Customer information updated successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: async (driverData: DriverFormData) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/drivers",
        driverData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setShowDriverForm(false);
      driverForm.reset();
      toast({
        title: "Driver Created",
        description: "Driver profile created successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create driver",
        variant: "destructive",
      });
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: async (driverData: DriverFormData & { id: number }) => {
      const response = await apiRequest(
        "PUT",
        `/api/admin/drivers/${driverData.id}`,
        driverData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setShowEditDriverModal(false);
      setSelectedDriver(null);
      editDriverForm.reset();
      toast({
        title: "Driver Updated",
        description: "Driver information updated successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update driver",
        variant: "destructive",
      });
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (driverId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/admin/drivers/${driverId}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({
        title: "Driver Deleted",
        description: "Driver profile deleted successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete driver",
        variant: "destructive",
      });
    },
  });

  const updateBusinessStatusMutation = useMutation({
    mutationFn: async ({
      businessId,
      status,
    }: {
      businessId: number;
      status: string;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/admin/businesses/${businessId}/status`,
        { status }
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
      const response = await apiRequest(
        "POST",
        "/api/admin/businesses",
        businessData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/businesses"] });
      setShowBusinessForm(false);
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

  // Data extraction
  const customers = (customersData as any)?.customers || [];
  const requests = (requestsData as any)?.requests || [];
  const rqClient = useQueryClient();
  const pendingStatusUpdateIdsRef = useRef<Set<number>>(new Set());
  // Realtime: subscribe to WS and invalidate production data on updates
  useEffect(() => {
    if (!isMainAuth) return;
    let ws: WebSocket | null = null;
    let heartbeat: number | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
        if (!token) return;
        const url = new URL(API_BASE_URL);
        const wsScheme = url.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${wsScheme}://${url.host}/ws?token=${encodeURIComponent(token)}`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          heartbeat = window.setInterval(() => {
            try {
              ws?.send(JSON.stringify({ type: "ping", t: Date.now() }));
            } catch {}
          }, 20000);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data || "{}");
            if (msg?.type === "PRODUCTION_STATUS_UPDATED") {
              const updatedId = msg?.data?.id as number | undefined;
              if (
                updatedId &&
                pendingStatusUpdateIdsRef.current.has(updatedId)
              ) {
                pendingStatusUpdateIdsRef.current.delete(updatedId);
                return;
              }
              rqClient.invalidateQueries({
                queryKey: ["/api/admin/pickup-requests"],
              });
            } else if (msg?.type === "NEW_PICKUP_REQUEST") {
              rqClient.invalidateQueries({
                queryKey: ["/api/admin/pickup-requests"],
              });
            }
          } catch {}
        };
        ws.onclose = () => {
          if (heartbeat) window.clearInterval(heartbeat);
          heartbeat = null;
          reconnectTimer = window.setTimeout(connect, 3000) as any;
        };
        ws.onerror = () => {
          try {
            ws?.close();
          } catch {}
        };
      } catch {}
    };

    connect();
    return () => {
      if (heartbeat) window.clearInterval(heartbeat);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {}
    };
  }, [isMainAuth, rqClient]);

  const quoteRequests = (quoteRequestsData as any)?.requests || [];
  const routes = (routesData as any)?.routes || [];
  const drivers = (driversData as any)?.drivers || [];

  // Event handlers
  const handleLogout = async () => {
    try {
      console.log("Admin logout initiated");
      await logout();
      console.log("Admin logout completed");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
    } catch (error) {
      console.error("Admin logout error:", error);
      toast({
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast({
        title: "Link Copied",
        description: "Customer pickup link copied to clipboard",
        variant: "default",
      });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      void error;
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCustomerSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || "",
      businessName: customer.businessName,
      address: customer.address,
    });
    setShowEditCustomerModal(true);
  };

  const handleEditSubmit = (data: CustomerFormData) => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({ ...data, id: selectedCustomer.id });
    }
  };

  const handleDriverSubmit = (data: DriverFormData) => {
    createDriverMutation.mutate(data);
  };

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    editDriverForm.reset({
      name: driver.name,
      email: driver.email,
      phone: driver.phone || "",
      licenseNumber: driver.licenseNumber || "",
    });
    setShowEditDriverModal(true);
  };

  const handleEditDriverSubmit = (data: DriverFormData) => {
    if (selectedDriver) {
      updateDriverMutation.mutate({ ...data, id: selectedDriver.id });
    }
  };

  const handleDeleteDriver = (driverId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this driver? This cannot be undone."
      )
    ) {
      deleteDriverMutation.mutate(driverId);
    }
  };

  const handleViewQuoteDetails = (quote: QuoteRequest) => {
    setSelectedQuoteForDetails(quote);
    setShowQuoteDetails(true);
  };

  const handleQuoteReply = async (quote: QuoteRequest) => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/admin/quote-reply/${quote.id}`
      );
      const data = await response.json();
      if (data.success) {
        window.open(data.emailLink, "_blank");
        toast({
          title: "Reply Email Opened",
          description: "Email client opened with pre-filled quote reply",
          variant: "default",
        });
      }
    } catch (error) {
      void error;
      toast({
        title: "Error",
        description: "Failed to generate quote reply email",
        variant: "destructive",
      });
    }
  };

  const updateProductionStatus = async (requestId: number, status: string) => {
    try {
      pendingStatusUpdateIdsRef.current.add(requestId);
      const response = await apiRequest(
        "PUT",
        `/api/admin/pickup-requests/${requestId}/production-status`,
        {
          productionStatus: status,
        }
      );

      if (response.ok) {
        queryClient.invalidateQueries({
          queryKey: ["/api/admin/pickup-requests"],
        });
        toast({
          title: "Status Updated",
          description: `Production status updated to ${status.replace("_", " ")}`,
        });
      }
    } catch (error) {
      void error;
      toast({
        title: "Error",
        description: "Failed to update production status",
        variant: "destructive",
      });
    } finally {
      // Remove the id after a short delay as a safety, in case we never get a WS echo
      const id = requestId;
      setTimeout(() => {
        pendingStatusUpdateIdsRef.current.delete(id);
      }, 5000);
    }
  };

  const exportProductionReport = () => {
    const reportData = {
      generated: new Date().toISOString(),
      period: "All Time",
      summary: {
        totalRequests: requests.length,
        completed: requests.filter(
          (r: PickupRequest) => r.productionStatus === "billed"
        ).length,
      },
      requests: requests.map((r: PickupRequest) => ({
        id: r.id,
        customer: `${r.firstName} ${r.lastName}`,
        business: r.businessName,
        status: r.productionStatus || "pending",
        created: r.createdAt,
        completed: r.completedAt,
      })),
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `production-report-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Production report has been downloaded successfully",
    });
  };

  const handleViewJobDetails = (request: PickupRequest) => {
    setShowJobDetailsModal(request);
  };

  const handlePipelineStageClick = (stage: string) => {
    setSelectedPipelineStage(stage);
    setIsPipelineModalOpen(true);
  };

  const handleEmailCustomer = (customer: Customer) => {
    setSelectedCustomerForEmail(customer);
    const signature = customer.customSignature || "";
    setCustomSignature(signature);
    setEmailSubject(
      `Hello ${customer.firstName} - Update from ${customer.businessName}`
    );
    setEmailBody(`Hi ${customer.firstName},\n\n\n${signature}`);
    setShowCustomerEmailModal(true);
  };

  const handleSendCustomerEmail = () => {
    if (!selectedCustomerForEmail) return;
    const mailto = `mailto:${selectedCustomerForEmail.email}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, "_blank");
    toast({
      title: "Email Client Opened",
      description: "Compose your message in your default email client.",
    });
    setShowCustomerEmailModal(false);
  };

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

  const handleBusinessSubmit = (data: any) => {
    createBusinessMutation.mutate(data);
  };

  // Tab configuration
  const allTabs = [
    {
      value: "overview",
      label: "Overview",
      mobileLabel: "Home",
      content: (
        <OverviewTab
          customers={customers}
          requests={requests}
          quoteRequests={quoteRequests}
          routes={routes}
          onPipelineStageClick={handlePipelineStageClick}
        />
      ),
    },
    {
      value: "customers",
      label: "Customers",
      content: (
        <CustomersTab
          customers={customers}
          requests={requests}
          loadingCustomers={loadingCustomers}
          onAddCustomer={() => setShowCustomerForm(true)}
          onEditCustomer={handleEditCustomer}
          onCopyLink={copyToClipboard}
          onEmailCustomer={handleEmailCustomer}
          copiedToken={copiedToken}
        />
      ),
    },
    {
      value: "drivers",
      label: "Drivers",
      hiddenOnMobile: true,
      content: (
        <DriversTab
          drivers={drivers}
          loadingDrivers={loadingDrivers}
          onAddDriver={() => setShowDriverForm(true)}
          onEditDriver={handleEditDriver}
          onDeleteDriver={handleDeleteDriver}
          onCopyLink={copyToClipboard}
        />
      ),
    },
    {
      value: "production",
      label: "Production",
      hiddenOnMobile: true,
      content: (
        <ProductionTab
          requests={requests}
          onUpdateProductionStatus={updateProductionStatus}
          onExportReport={exportProductionReport}
          onViewJobDetails={handleViewJobDetails}
        />
      ),
    },
    {
      value: "quotes",
      label: "Quotes",
      hiddenOnMobile: true,
      content: (
        <QuotesTab
          quoteRequests={quoteRequests}
          loadingQuoteRequests={loadingQuoteRequests}
          onViewQuoteDetails={handleViewQuoteDetails}
          onQuoteReply={handleQuoteReply}
        />
      ),
    },
    {
      value: "settings",
      label: "Settings",
      content: (
        <SettingsTab
          customLogo={customLogo || null}
          onLogoChange={onLogoChange || (() => {})}
          onEmailTemplatesClick={() => setShowEmailTemplatesModal(true)}
          onEmailLogsClick={() => setShowEmailLogsModal(true)}
        />
      ),
    },
  ];

  // Filter tabs based on props
  const tabs = allTabs.filter((tab) => {
    if (tab.value === "businesses" && !showBusinessesTab) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom overscroll-none pb-4">
      <div className="max-w-6xl mx-auto mobile-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 sm:space-y-8"
        >
          {/* Header */}
          <AdminHeader
            title={title}
            subtitle={subtitle}
            customLogo={customLogo}
            onLogout={handleLogout}
            showDriverLink={showDriverLink}
            showCustomerLink={showCustomerLink}
            driverLinkText={driverLinkText}
            customerLinkText={customerLinkText}
          />

          {/* Main Content Tabs */}
          <AdminTabs tabs={tabs} defaultValue="overview" />
        </motion.div>
      </div>

      {/* Modals would go here - keeping the original modals for now */}
      {/* Customer Form Modal */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-popover border border-border shadow-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Add New Customer
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCustomerSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        First Name*
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Last Name*
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Email Address*
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Business Name*
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Auto Service" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Business Address*
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="123 Main Street&#10;City, State 12345"
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomerMutation.isPending}
                  className="flex-1"
                >
                  {createCustomerMutation.isPending
                    ? "Creating..."
                    : "Create Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog
        open={showEditCustomerModal}
        onOpenChange={setShowEditCustomerModal}
      >
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-popover border border-border shadow-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Edit Customer
            </DialogTitle>
          </DialogHeader>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        First Name*
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Last Name*
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Email Address*
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Business Name*
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Auto Service" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Business Address*
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="123 Main Street&#10;City, State 12345"
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditCustomerModal(false);
                    setSelectedCustomer(null);
                    editForm.reset();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateCustomerMutation.isPending}
                  className="flex-1"
                >
                  {updateCustomerMutation.isPending
                    ? "Updating..."
                    : "Update Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Driver Modal */}
      <Dialog open={showDriverForm} onOpenChange={setShowDriverForm}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-popover border border-border shadow-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Add New Driver
            </DialogTitle>
          </DialogHeader>

          <Form {...driverForm}>
            <form
              onSubmit={driverForm.handleSubmit(handleDriverSubmit)}
              className="space-y-4"
            >
              <FormField
                control={driverForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Driver Name*
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={driverForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Email Address*
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={driverForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={driverForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      License Number
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="DL123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDriverForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDriverMutation.isPending}
                  className="flex-1"
                >
                  {createDriverMutation.isPending
                    ? "Creating..."
                    : "Create Driver"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Modal */}
      <Dialog open={showEditDriverModal} onOpenChange={setShowEditDriverModal}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-popover border border-border shadow-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Edit Driver
            </DialogTitle>
          </DialogHeader>

          <Form {...editDriverForm}>
            <form
              onSubmit={editDriverForm.handleSubmit(handleEditDriverSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editDriverForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Driver Name*
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editDriverForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Email Address*
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editDriverForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editDriverForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      License Number
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="DL123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDriverModal(false);
                    setSelectedDriver(null);
                    editDriverForm.reset();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateDriverMutation.isPending}
                  className="flex-1"
                >
                  {updateDriverMutation.isPending
                    ? "Updating..."
                    : "Update Driver"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Business Form Modal */}
      <BusinessForm
        open={showBusinessForm}
        onOpenChange={setShowBusinessForm}
        onSubmit={handleBusinessSubmit}
        isLoading={createBusinessMutation.isPending}
      />

      {/* Quote Details Modal */}
      <Dialog
        open={showQuoteDetails}
        onOpenChange={(open) => {
          setShowQuoteDetails(open);
          if (!open) {
            setSelectedQuoteForDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-popover border border-border shadow-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Quote Details
            </DialogTitle>
          </DialogHeader>

          {selectedQuoteForDetails && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">Name</div>
                  <div className="text-foreground font-medium">
                    {selectedQuoteForDetails.firstName}{" "}
                    {selectedQuoteForDetails.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Business</div>
                  <div className="text-foreground font-medium">
                    {selectedQuoteForDetails.businessName}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="text-foreground break-all">
                    {selectedQuoteForDetails.email}
                  </div>
                </div>
                {selectedQuoteForDetails.phone && (
                  <div>
                    <div className="text-muted-foreground">Phone</div>
                    <div className="text-foreground">
                      {selectedQuoteForDetails.phone}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Requested</div>
                  <div className="text-foreground">
                    {new Date(
                      selectedQuoteForDetails.createdAt
                    ).toLocaleString()}
                  </div>
                </div>
              </div>

              {selectedQuoteForDetails.description && (
                <div>
                  <div className="text-muted-foreground mb-1">Description</div>
                  <div className="text-foreground/90 whitespace-pre-wrap">
                    {selectedQuoteForDetails.description}
                  </div>
                </div>
              )}
              {Array.isArray(selectedQuoteForDetails.photos) &&
                selectedQuoteForDetails.photos.length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-2">Photos</div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedQuoteForDetails.photos.map(
                        (url: string, idx: number) => {
                          const isBase64Image =
                            typeof url === "string" &&
                            url.startsWith("data:image/");
                          if (!isBase64Image) return null;
                          return (
                            <a
                              key={`${url}-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded overflow-hidden border border-border"
                              title={`Photo ${idx + 1}`}
                            >
                              <Image
                                src={url}
                                alt={`Photo ${idx + 1}`}
                                width={200}
                                height={96}
                                className="w-full h-24 object-cover"
                              />
                            </a>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleQuoteReply(selectedQuoteForDetails)}
                >
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowQuoteDetails(false);
                    setSelectedQuoteForDetails(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Email Modal */}
      <Dialog
        open={showCustomerEmailModal}
        onOpenChange={(open) => {
          setShowCustomerEmailModal(open);
          if (!open) {
            setSelectedCustomerForEmail(null);
          }
        }}
      >
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-popover border border-border shadow-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Email Customer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">To</Label>
              <Input value={selectedCustomerForEmail?.email || ""} disabled />
            </div>
            <div>
              <Label className="text-muted-foreground">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Message</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                className="resize-none"
                placeholder="Write your message..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={handleSendCustomerEmail}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Open in Email Client
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomerEmailModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Animation */}
      {showWelcome && (
        <WelcomeAnimation onComplete={completeWelcome} userType="admin" />
      )}
    </div>
  );
}
