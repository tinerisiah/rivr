"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  Coffee,
  MessageCircle,
  Phone,
  Send,
  Truck,
  Users,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE_URL, buildApiUrl } from "@/lib/api";

interface Driver {
  id: number;
  name: string;
  status: string;
  currentLatitude?: string;
  currentLongitude?: string;
  phone?: string;
}

interface Message {
  id: number;
  fromDriverId?: number;
  toDriverId?: number;
  fromAdmin: boolean;
  toAdmin: boolean;
  message: string;
  messageType: string;
  routeId?: number;
  isRead: boolean;
  timestamp: string;
  fromDriver?: Driver;
  toDriver?: Driver;
  deliveredAt?: string;
  readAt?: string;
}

interface StatusUpdate {
  id: number;
  driverId: number;
  status: string;
  routeId?: number;
  pickupId?: number;
  location?: string;
  notes?: string;
  timestamp: string;
  driver: Driver;
}

interface DriverCommunicationHubProps {
  currentDriverId: number;
  currentDriverName: string;
}

export default function DriverCommunicationHub({
  currentDriverId,
  currentDriverName,
}: DriverCommunicationHubProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<
    number | "admin" | ""
  >("");
  const [messageText, setMessageText] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const queryClient = useQueryClient();

  // WebSocket: receive messages and send delivery/read receipts
  useEffect(() => {
    let ws: WebSocket | null = null;
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

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data || "{}");
            if (msg?.type === "DRIVER_MESSAGE" && msg?.data?.id) {
              const message = msg.data as { id: number; message?: string };
              // mark delivered immediately
              fetch(
                buildApiUrl(`/api/driver/messages/${message.id}/delivered`),
                {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                }
              ).catch(() => {});
              // optimistic refresh
              queryClient.invalidateQueries({
                queryKey: ["/api/driver/messages", currentDriverId],
              });
            }
          } catch {}
        };

        ws.onclose = () => {
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
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {}
    };
  }, [queryClient, currentDriverId]);

  // Fetch active drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/drivers/active"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/driver/messages", currentDriverId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/driver/messages?driverId=${currentDriverId}`
      );
      return res.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
  });

  // Fetch recent status updates
  const { data: statusUpdates = [] } = useQuery({
    queryKey: ["/api/driver/status-updates"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return apiRequest("POST", "/api/driver/messages", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/messages"] });
      setMessageText("");
      setSelectedRecipient("");
      toast({
        title: "Message Sent",
        description: "Your message has been delivered successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (statusData: any) => {
      return apiRequest("POST", "/api/driver/status", statusData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/driver/status-updates"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/active"] });
      setStatusDialogOpen(false);
      setNewStatus("");
      setStatusNotes("");
      toast({
        title: "Status Updated",
        description: "Your status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Status",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedRecipient) {
      toast({
        title: "Invalid Message",
        description: "Please select a recipient and enter a message.",
        variant: "destructive",
      });
      return;
    }

    const messageData = {
      fromDriverId: currentDriverId,
      toDriverId: selectedRecipient === "admin" ? null : selectedRecipient,
      toAdmin: selectedRecipient === "admin",
      message: messageText,
      messageType: "text",
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleStatusUpdate = () => {
    if (!newStatus) {
      toast({
        title: "Status Required",
        description: "Please select a status.",
        variant: "destructive",
      });
      return;
    }

    const statusData = {
      driverId: currentDriverId,
      status: newStatus,
      notes: statusNotes,
    };

    updateStatusMutation.mutate(statusData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-4 h-4" />;
      case "busy":
        return <Truck className="w-4 h-4" />;
      case "break":
        return <Coffee className="w-4 h-4" />;
      case "offline":
        return <WifiOff className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "break":
        return "bg-blue-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const myMessages = (messages as any[]).filter(
    (msg: any) =>
      msg.fromDriverId === currentDriverId ||
      msg.toDriverId === currentDriverId ||
      msg.toAdmin
  );

  const unreadCount = myMessages.filter(
    (msg: any) => !msg.isRead && msg.fromDriverId !== currentDriverId
  ).length;

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-300">Online</span>
              </div>
              <Badge
                variant="outline"
                className="text-gray-300 border-gray-600"
              >
                {currentDriverName}
              </Badge>
            </div>
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300"
                >
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-gray-100">
                    Update Your Status
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Let dispatch and other drivers know your current status.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="break">On Break</SelectItem>
                      <SelectItem value="offline">Going Offline</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Optional notes..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-gray-100"
                  />
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updateStatusMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateStatusMutation.isPending
                      ? "Updating..."
                      : "Update Status"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger
            value="messages"
            className="text-gray-300 data-[state=active]:text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages{" "}
            {unreadCount > 0 && (
              <Badge className="ml-1 bg-red-500">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="drivers"
            className="text-gray-300 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Active Drivers
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            className="text-gray-300 data-[state=active]:text-white"
          >
            <Clock className="w-4 h-4 mr-2" />
            Live Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {/* Send Message */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100 text-lg">
                Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedRecipient.toString()}
                onValueChange={(value) =>
                  setSelectedRecipient(
                    value === "admin" ? "admin" : parseInt(value)
                  )
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="admin">Dispatch/Admin</SelectItem>
                  {(drivers as any[])
                    .filter((driver: any) => driver.id !== currentDriverId)
                    .map((driver: any) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-gray-100"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {myMessages.length === 0 ? (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="pt-6 text-center text-gray-400">
                  No messages yet. Start a conversation!
                </CardContent>
              </Card>
            ) : (
              myMessages.map((message: any) => (
                <Card
                  key={message.id}
                  className={`bg-gray-900 border-gray-700 ${!message.isRead && message.fromDriverId !== currentDriverId ? "border-blue-500" : ""}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            variant={
                              message.fromDriverId === currentDriverId
                                ? "default"
                                : "secondary"
                            }
                          >
                            {message.fromAdmin
                              ? "Dispatch"
                              : message.fromDriverId === currentDriverId
                                ? "You"
                                : message.fromDriver?.name || "Unknown"}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                          {message.readAt ? (
                            <span className="inline-flex items-center gap-1 text-green-500">
                              <CheckCheck className="w-4 h-4" />
                              <span className="text-xs">
                                {formatTime(message.readAt)}
                              </span>
                            </span>
                          ) : message.deliveredAt ? (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <Check className="w-4 h-4" />
                              <span className="text-xs">
                                {formatTime(message.deliveredAt)}
                              </span>
                            </span>
                          ) : null}
                          {!message.isRead &&
                            message.fromDriverId !== currentDriverId && (
                              <Badge className="bg-blue-500">New</Badge>
                            )}
                        </div>
                        <p className="text-gray-100">{message.message}</p>
                        {!message.isRead &&
                          message.fromDriverId !== currentDriverId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 border-gray-600 text-gray-300"
                              onClick={() => {
                                fetch(
                                  buildApiUrl(
                                    `/api/driver/messages/${message.id}/read`
                                  ),
                                  {
                                    method: "POST",
                                    credentials: "include",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                  }
                                )
                                  .then(() =>
                                    queryClient.invalidateQueries({
                                      queryKey: [
                                        "/api/driver/messages",
                                        currentDriverId,
                                      ],
                                    })
                                  )
                                  .catch(() => {});
                              }}
                            >
                              Mark as read
                            </Button>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <div className="grid gap-4">
            {(drivers as any[]).map((driver: any) => (
              <Card key={driver.id} className="bg-gray-900 border-gray-700">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(driver.status)}`}
                      />
                      <div>
                        <p className="text-gray-100 font-medium">
                          {driver.name}
                        </p>
                        <p className="text-sm text-gray-400 capitalize">
                          {driver.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {driver.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                      {driver.id !== currentDriverId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecipient(driver.id);
                            (
                              document.querySelector(
                                '[value="messages"]'
                              ) as HTMLElement
                            )?.click();
                          }}
                          className="border-gray-600 text-gray-300"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(statusUpdates as any[]).length === 0 ? (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="pt-6 text-center text-gray-400">
                  No recent updates
                </CardContent>
              </Card>
            ) : (
              (statusUpdates as any[]).map((update: any) => (
                <Card key={update.id} className="bg-gray-900 border-gray-700">
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(update.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-gray-100 font-medium">
                            {update.driver.name}
                          </span>
                          <Badge className={getStatusColor(update.status)}>
                            {update.status.replace("_", " ")}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {formatTime(update.timestamp)}
                          </span>
                        </div>
                        {update.notes && (
                          <p className="text-sm text-gray-300">
                            {update.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
