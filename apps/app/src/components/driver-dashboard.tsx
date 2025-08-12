"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import WelcomeAnimation, {
  useWelcomeAnimation,
} from "@/components/welcome-animation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Route,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, buildApiUrl as buildApiUrl2 } from "@/lib/api";
// Simple navigation utility for driver dashboard
const openNavigation = (addresses: string[]) => {
  if (addresses.length === 0) {
    return;
  }

  // Detect if on iOS device
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  let url = "";

  if (isIOS) {
    // Apple Maps for iOS - use proper multi-stop format
    if (addresses.length === 1) {
      const address = encodeURIComponent(addresses[0]);
      url = `maps://maps.apple.com/?daddr=${address}&dirflg=d`;
    } else {
      // For multiple addresses, create a route with all stops
      // Apple Maps supports multiple destinations in the query parameter
      const encodedAddresses = addresses.map((addr) =>
        encodeURIComponent(addr)
      );
      // Use saddr for starting location (current location) and daddr for destinations
      url = `maps://maps.apple.com/?saddr=Current+Location&daddr=${encodedAddresses.join("+to:")}&dirflg=d`;
    }
  } else {
    // Fallback to Google Maps for non-iOS devices
    if (addresses.length === 1) {
      const address = encodeURIComponent(addresses[0]);
      url = `https://www.google.com/maps/dir/current+location/${address}`;
    } else {
      // Multiple addresses for Google Maps
      const waypoints = addresses
        .map((addr) => encodeURIComponent(addr))
        .join("/");
      url = `https://www.google.com/maps/dir/current+location/${waypoints}`;
    }
  }

  // For iOS devices, we want to ensure Apple Maps opens directly
  // Use location.href for custom scheme URLs to avoid popup blockers
  try {
    if (isIOS && url.startsWith("maps://")) {
      // For Apple Maps URLs, use direct location assignment
      window.location.href = url;
    } else {
      // For web URLs, try window.open first, then fallback
      const newWindow = window.open(url, "_blank");
      if (!newWindow) {
        // Fallback to location assignment if popup blocked
        window.location.href = url;
      }
    }
  } catch (error) {
    // Navigation failed - silently ignore
    // Final fallback: create a temporary link and click it
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

interface Task {
  id: number;
  type: "pickup" | "delivery";
  customerName: string;
  businessName: string;
  address: string;
  phone?: string;
  email?: string;
  productionStatus: string;
  roNumber?: string;
  notes?: string;
  createdAt: string;
}

interface InRouteTask extends Task {
  routeId: number;
  isSelected: boolean;
}

const pickupCompletionSchema = z.object({
  roNumber: z.string().min(1, "RO Number is required"),
  completionPhoto: z.string().optional(),
  notes: z.string().optional(),
  signature: z.string().min(1, "Signature is required"),
});

const deliveryCompletionSchema = z.object({
  photo: z.instanceof(File).optional(),
  notes: z.string().optional(),
});

export function DriverDashboard() {
  const [driverId, setDriverId] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [inRouteTasks, setInRouteTasks] = useState<InRouteTask[]>([]);
  const [completingTask, setCompletingTask] = useState<InRouteTask | null>(
    null
  );
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();
  const { user, isAuthenticated: isMainAuth, logout } = useAuth();
  const router = useRouter();
  // Welcome animation
  const { showWelcome, completeWelcome } = useWelcomeAnimation();

  // Check if user is authenticated through main auth system
  useEffect(() => {
    if (isMainAuth && user && user.role === "driver") {
      // User is authenticated through main auth system
      setIsAuthenticated(true);
      // Use user ID as driver ID
      setDriverId(user.id.toString());

      // Check for saved route when driver logs back in
      const savedRoute = localStorage.getItem("activeRoute");
      if (savedRoute) {
        try {
          const routeData = JSON.parse(savedRoute);
          if (routeData.driverId === user.id.toString()) {
            setInRouteTasks(routeData.tasks);
            setActiveTab("in-route");
            toast({
              title: "Route Restored",
              description:
                "Your previous route has been restored. Continue completing tasks.",
            });
          }
        } catch (error) {
          // Error restoring route - continue without saved route
          localStorage.removeItem("activeRoute");
        }
      }
    }
  }, [isMainAuth, user, toast]);

  // PIN authentication removed
  const authMutation = useMutation({
    mutationFn: async (pin: string) => {
      throw new Error("PIN auth removed");
    },
    onSuccess: () => {},
    onError: (error) => {
      console.error("Authentication error:", error);
    },
  });

  const handleLogout = async () => {
    try {
      console.log("Driver logout initiated");
      await logout();
      console.log("Driver logout completed");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
    } catch (error) {
      console.error("Driver logout error:", error);
      toast({
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch available tasks (pickups and deliveries) - only when authenticated
  const {
    data: availableTasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/driver/available-tasks", driverId],
    queryFn: async () => {
      if (!driverId || !isAuthenticated) return [];

      // Fetch pickups ready for pickup
      const pickupsResponse = await apiRequest(
        "GET",
        `/api/driver/pickups/ready-for-pickup`
      );
      const pickups = await pickupsResponse.json();

      // Fetch deliveries ready for delivery
      const deliveriesResponse = await apiRequest(
        "GET",
        `/api/driver/deliveries/ready-for-delivery`
      );
      const deliveries = await deliveriesResponse.json();

      const allTasks: Task[] = [
        ...pickups.map(
          (p: {
            id: number;
            firstName: string;
            lastName: string;
            businessName?: string;
            address: string;
            phone?: string;
            email?: string;
            productionStatus?: string;
            roNumber?: string;
            customerNotes?: string;
            createdAt: string;
          }) => ({
            id: p.id,
            type: "pickup" as const,
            customerName: `${p.firstName} ${p.lastName}`,
            businessName: p.businessName,
            address: p.address,
            phone: p.phone,
            email: p.email,
            productionStatus: p.productionStatus,
            roNumber: p.roNumber,
            notes: p.customerNotes,
            createdAt: p.createdAt,
          })
        ),
        ...deliveries.map(
          (d: {
            id: number;
            firstName: string;
            lastName: string;
            businessName?: string;
            address: string;
            phone?: string;
            email?: string;
            productionStatus?: string;
            roNumber?: string;
            customerNotes?: string;
            createdAt: string;
          }) => ({
            id: d.id,
            type: "delivery" as const,
            customerName: `${d.firstName} ${d.lastName}`,
            businessName: d.businessName,
            address: d.address,
            phone: d.phone,
            email: d.email,
            productionStatus: d.productionStatus,
            roNumber: d.roNumber,
            notes: d.customerNotes,
            createdAt: d.createdAt,
          })
        ),
      ];

      // Get in-route task IDs to filter them out
      const inRouteTaskIds = new Set(inRouteTasks.map((task) => task.id));
      return allTasks.filter((task) => !inRouteTaskIds.has(task.id));
    },
    enabled: !!driverId && isAuthenticated,
  });

  // WS: heartbeat and reconnect
  useEffect(() => {
    if (!isAuthenticated) return;
    let ws: WebSocket | null = null;
    let heartbeat: number | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const url = new URL(API_BASE_URL);
        const wsScheme = url.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${wsScheme}://${url.host}/ws?token=${encodeURIComponent(
          token
        )}`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          // start heartbeat
          heartbeat = window.setInterval(() => {
            try {
              ws?.send(JSON.stringify({ type: "ping", t: Date.now() }));
            } catch {}
          }, 15000);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === "NEW_PICKUP_REQUEST") {
              // Refresh available tasks list on new requests
              refetch();
              toast({
                title: "New pickup assigned",
                description: msg?.data?.businessName || "",
              });
            } else if (msg?.type === "DRIVER_MESSAGE" && msg?.data?.id) {
              const message = msg.data as { id: number; message?: string };
              // Mark delivered immediately
              fetch(
                buildApiUrl(`/api/driver/messages/${message.id}/delivered`),
                {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                }
              ).catch(() => {});

              toast({
                title: "New message",
                description: message.message || "",
              });

              // Auto-mark as read after a short delay (acts as seen)
              window.setTimeout(() => {
                fetch(buildApiUrl(`/api/driver/messages/${message.id}/read`), {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                }).catch(() => {});
              }, 3000);
            }
          } catch {}
        };
        ws.onclose = () => {
          if (heartbeat) window.clearInterval(heartbeat);
          heartbeat = null;
          // attempt reconnect
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
  }, [isAuthenticated, refetch, toast]);

  // Forms for task completion
  type PickupCompletionFormValues = z.infer<typeof pickupCompletionSchema>;
  type DeliveryCompletionFormValues = z.infer<typeof deliveryCompletionSchema>;

  const pickupForm = useForm<PickupCompletionFormValues>({
    resolver: zodResolver(pickupCompletionSchema),
    defaultValues: {
      roNumber: "",
      completionPhoto: "",
      notes: "",
      signature: "",
    },
  });

  const deliveryForm = useForm<DeliveryCompletionFormValues>({
    resolver: zodResolver(deliveryCompletionSchema),
    defaultValues: {
      photo: undefined,
      notes: "",
    },
  });

  // Handle task selection
  const handleTaskSelect = (taskId: number, checked: boolean) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  // Handle "Route for Me" button
  const handleRouteForMe = async () => {
    if (selectedTasks.size === 0) {
      toast({
        title: "No Tasks Selected",
        description: "Please select at least one task to create a route.",
        variant: "destructive",
      });
      return;
    }

    const selectedTaskData = availableTasks.filter((task) =>
      selectedTasks.has(task.id)
    );
    const addresses = selectedTaskData.map((task) => task.address);

    // Move selected tasks to "In Route" FIRST (before opening maps)
    const newInRouteTasks: InRouteTask[] = selectedTaskData.map((task) => ({
      ...task,
      routeId: Date.now(), // Simple route ID generation
      isSelected: false,
    }));

    const updatedInRouteTasks = [...inRouteTasks, ...newInRouteTasks];
    setInRouteTasks(updatedInRouteTasks);
    setSelectedTasks(new Set());

    // Store the task IDs that are now in route so they don't appear in available tasks
    const inRouteTaskIds = new Set(updatedInRouteTasks.map((t) => t.id));
    localStorage.setItem(
      "inRouteTaskIds",
      JSON.stringify(Array.from(inRouteTaskIds))
    );

    // Save route to localStorage so it persists when app regains focus
    const routeData = {
      tasks: updatedInRouteTasks,
      timestamp: Date.now(),
      driverId: driverId,
    };
    localStorage.setItem("activeRoute", JSON.stringify(routeData));

    toast({
      title: "Route Created",
      description: `${selectedTaskData.length} tasks added to your route. Opening Maps now - come back to complete tasks.`,
    });

    // Switch to In Route tab automatically
    setActiveTab("in-route");

    // Open navigation after a short delay to ensure UI updates
    setTimeout(() => {
      try {
        openNavigation(addresses);
      } catch (error) {
        // Navigation error - provide fallback
        toast({
          title: "Navigation Ready",
          description: "Route saved. Use the navigation buttons to open maps.",
          variant: "default",
        });
      }
    }, 500);
  };

  // Handle task completion
  const completeTask = useMutation({
    mutationFn: async (data: {
      taskId: number;
      type: "pickup" | "delivery";
      completionData: Record<string, unknown>;
    }) => {
      const endpoint =
        data.type === "pickup"
          ? `/api/driver/pickups/${data.taskId}/complete`
          : `/api/driver/deliveries/${data.taskId}/complete`;

      return apiRequest("POST", endpoint, data.completionData);
    },
    onSuccess: (_, variables) => {
      // Remove task from in-route
      setInRouteTasks((prev) =>
        prev.filter((task) => task.id !== variables.taskId)
      );
      setShowCompletionDialog(false);
      setCompletingTask(null);

      // Update localStorage route
      const savedRoute = localStorage.getItem("activeRoute");
      if (savedRoute) {
        try {
          const routeData = JSON.parse(savedRoute);
          routeData.tasks = routeData.tasks.filter(
            (task: InRouteTask) => task.id !== variables.taskId
          );
          if (routeData.tasks.length === 0) {
            localStorage.removeItem("activeRoute");
          } else {
            localStorage.setItem("activeRoute", JSON.stringify(routeData));
          }
        } catch (error) {
          // Error updating route in localStorage
        }
      }

      // Reset forms
      pickupForm.reset();
      deliveryForm.reset();

      // Refetch available tasks
      refetch();

      toast({
        title: "Task Completed",
        description: `${variables.type === "pickup" ? "Pickup" : "Delivery"} completed successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompleteTask = (task: InRouteTask) => {
    setCompletingTask(task);

    // Auto-populate form fields with existing data from the pickup request
    if (task.type === "pickup") {
      pickupForm.reset({
        roNumber: task.roNumber || "",
        completionPhoto: "",
        notes: task.notes || "",
        signature: "",
      });
    }

    setShowCompletionDialog(true);
  };

  const onSubmitCompletion = (data: Record<string, unknown>) => {
    if (!completingTask) return;

    completeTask.mutate({
      taskId: completingTask.id,
      type: completingTask.type,
      completionData: data,
    });
  };

  // If unauthenticated, direct to main sign-in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <Truck className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Driver Dashboard
            </h1>
            <p className="text-muted-foreground mb-4">
              Please sign in to continue.
            </p>
            <Button onClick={() => router.push("/auth")} className="w-full">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Truck className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Driver Dashboard
              </h1>
              <p className="text-muted-foreground">Driver ID: {driverId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customer View
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                console.log("Logout button clicked");
                handleLogout();
              }}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="available"
              className="flex items-center space-x-2"
            >
              <Package className="h-4 w-4" />
              <span>Available Tasks</span>
            </TabsTrigger>
            <TabsTrigger
              value="in-route"
              className="flex items-center space-x-2"
            >
              <Route className="h-4 w-4" />
              <span>In Route ({inRouteTasks.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Available Tasks Tab */}
          <TabsContent value="available" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Available Tasks
              </h2>
              <Button
                onClick={handleRouteForMe}
                disabled={selectedTasks.size === 0}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Route for Me ({selectedTasks.size})
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading tasks...</p>
              </div>
            ) : availableTasks.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tasks available at the moment.
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          RO#
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {availableTasks.map((task) => (
                        <tr
                          key={task.id}
                          className={`hover:bg-muted ${
                            task.type === "pickup"
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : "bg-green-50 dark:bg-green-900/20"
                          }`}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Checkbox
                              checked={selectedTasks.has(task.id)}
                              onCheckedChange={(checked) =>
                                handleTaskSelect(task.id, checked as boolean)
                              }
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge
                              className={
                                task.type === "pickup"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              }
                            >
                              {task.type === "pickup" ? "Pickup" : "Delivery"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-foreground">
                              {task.customerName}
                            </div>
                            {task.phone && (
                              <div className="text-sm text-muted-foreground">
                                {task.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-foreground">
                              {task.businessName}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-foreground max-w-xs">
                              {task.address}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">
                              {task.roNumber || "-"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* In Route Tab */}
          <TabsContent value="in-route" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Tasks In Route
              </h2>
              {inRouteTasks.length > 0 && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      const addresses = inRouteTasks.map(
                        (task) => task.address
                      );
                      openNavigation(addresses);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Re-open Navigation
                  </Button>
                  <Button
                    onClick={() => {
                      setInRouteTasks([]);
                      localStorage.removeItem("activeRoute");
                      toast({
                        title: "Route Cleared",
                        description: "All tasks moved back to available tasks.",
                      });
                      refetch();
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Clear Route
                  </Button>
                </div>
              )}
            </div>

            {inRouteTasks.length === 0 ? (
              <Card className="p-8 text-center">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tasks in route. Select tasks from "Available Tasks" to get
                  started.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {inRouteTasks.map((task) => (
                  <Card key={task.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Badge
                            className={
                              task.type === "pickup"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            }
                          >
                            {task.type === "pickup" ? "Pickup" : "Delivery"}
                          </Badge>
                          <h3 className="text-lg font-semibold text-foreground">
                            {task.customerName}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Business
                            </p>
                            <p className="font-medium text-foreground">
                              {task.businessName}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              RO Number
                            </p>
                            <p className="font-medium text-foreground">
                              {task.roNumber || "N/A"}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">
                              Address
                            </p>
                            <p className="font-medium text-foreground">
                              {task.address}
                            </p>
                          </div>
                        </div>

                        {task.phone && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground">
                              Phone
                            </p>
                            <a
                              href={`tel:${task.phone}`}
                              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              {task.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button
                          onClick={() => {
                            openNavigation([task.address]);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Navigate
                        </Button>
                        <Button
                          onClick={() => handleCompleteTask(task)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                        <Button
                          onClick={() => {
                            // Move task back to available tasks
                            setInRouteTasks((prev) =>
                              prev.filter((t) => t.id !== task.id)
                            );

                            // Update localStorage
                            const savedRoute =
                              localStorage.getItem("activeRoute");
                            if (savedRoute) {
                              try {
                                const routeData = JSON.parse(savedRoute);
                                routeData.tasks = routeData.tasks.filter(
                                  (t: InRouteTask) => t.id !== task.id
                                );
                                if (routeData.tasks.length === 0) {
                                  localStorage.removeItem("activeRoute");
                                } else {
                                  localStorage.setItem(
                                    "activeRoute",
                                    JSON.stringify(routeData)
                                  );
                                }
                              } catch (error) {
                                // Error updating route in localStorage
                              }
                            }

                            refetch(); // Refresh available tasks
                            toast({
                              title: "Task Cancelled",
                              description:
                                "Task moved back to available tasks.",
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-500 dark:text-red-800 dark:border-red-700 dark:hover:text-white dark:hover:border-red-800"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Completion Dialog */}
      <Dialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Complete{" "}
              {completingTask?.type === "pickup" ? "Pickup" : "Delivery"}
            </DialogTitle>
          </DialogHeader>

          {completingTask?.type === "pickup" ? (
            <Form {...pickupForm}>
              <form
                onSubmit={pickupForm.handleSubmit(onSubmitCompletion)}
                className="space-y-4"
              >
                <FormField
                  control={pickupForm.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Signature *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your signature" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={pickupForm.control}
                  name="roNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RO Number *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={
                            completingTask?.roNumber
                              ? "Auto-filled from customer"
                              : "Enter RO number"
                          }
                          className={
                            completingTask?.roNumber
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                              : ""
                          }
                        />
                      </FormControl>
                      {completingTask?.roNumber && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Auto-filled from customer request
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={pickupForm.control}
                  name="completionPhoto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Photo (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                field.onChange(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              field.onChange("");
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={pickupForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={
                            completingTask?.notes
                              ? "Customer notes pre-filled - add driver notes if needed"
                              : "Add any notes about the pickup..."
                          }
                          className={
                            completingTask?.notes
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                              : ""
                          }
                        />
                      </FormControl>
                      {completingTask?.notes && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          ℹ️ Customer notes included - you can add additional
                          driver notes
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCompletionDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={completeTask.isPending}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Complete Pickup
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...deliveryForm}>
              <form
                onSubmit={deliveryForm.handleSubmit(onSubmitCompletion)}
                className="space-y-4"
              >
                <FormField
                  control={deliveryForm.control}
                  name="photo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Photo</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => field.onChange(e.target.files?.[0])}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={deliveryForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any notes about the delivery..."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCompletionDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={completeTask.isPending}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Complete Delivery
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Welcome Animation */}
      {showWelcome && isAuthenticated && (
        <WelcomeAnimation
          userType="driver"
          userName={`Driver #${driverId}`}
          stats={{
            activeRoutes: inRouteTasks.length > 0 ? 1 : 0,
            completedToday: 0, // Could be calculated from completed tasks
            pendingRequests: availableTasks.length,
          }}
          onComplete={completeWelcome}
        />
      )}
    </div>
  );
}
