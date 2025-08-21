"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PickupRequest } from "@/lib/schema";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock,
  Eye,
  FileText,
  Search,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { ProductionViewDialog } from "./production-view-dialog";

interface ProductionTabProps {
  requests: PickupRequest[];
  readOnly?: boolean;
  onUpdateProductionStatus: (
    requestId: number,
    status: string,
    photo?: string
  ) => void;
  onExportReport: () => void;
  onViewJobDetails: (request: PickupRequest) => void;
}

export function ProductionTab({
  requests,
  readOnly = false,
  onUpdateProductionStatus,
  onExportReport,
}: ProductionTabProps) {
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PickupRequest | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Production Management Functions
  const calculateAverageProcessingTime = () => {
    const completedRequests = requests.filter(
      (r: PickupRequest) => r.productionStatus === "billed"
    );
    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce(
      (sum: number, request: PickupRequest) => {
        const createdTime = new Date(request.createdAt).getTime();
        const completedTime = request.completedAt
          ? new Date(request.completedAt).getTime()
          : Date.now();
        return sum + (completedTime - createdTime);
      },
      0
    );

    return totalTime / completedRequests.length / (1000 * 60 * 60); // Convert to hours
  };

  const calculateThroughputRate = () => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const completedLast7Days = requests.filter(
      (r: PickupRequest) =>
        r.productionStatus === "billed" &&
        new Date(r.completedAt || r.createdAt) >= last7Days
    );

    return Math.round(completedLast7Days.length / 7);
  };

  const identifyBottleneck = () => {
    const stages = [
      { status: "pending", name: "Pickup Queue" },
      { status: "in_process", name: "Processing" },
      { status: "ready_for_delivery", name: "Ready to Deliver" },
      { status: "ready_to_bill", name: "Ready to Bill" },
    ];

    let maxCount = 0;
    let bottleneckStage = "None";

    stages.forEach((stage) => {
      const count = requests.filter(
        (r: PickupRequest) => r.productionStatus === stage.status
      ).length;
      if (count > maxCount) {
        maxCount = count;
        bottleneckStage = stage.name;
      }
    });

    return bottleneckStage;
  };

  const calculateSLACompliance = () => {
    const targetHours = 48; // 48-hour SLA target
    const recentRequests = requests.filter((r: PickupRequest) => {
      const createdTime = new Date(r.createdAt);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 168; // Last week
    });

    if (recentRequests.length === 0) return 100;

    const withinSLA = recentRequests.filter((r: PickupRequest) => {
      if (r.productionStatus !== "billed") return true; // Still in progress
      const createdTime = new Date(r.createdAt);
      const completedTime = new Date(r.completedAt || r.createdAt);
      const hoursDiff =
        (completedTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= targetHours;
    });

    return Math.round((withinSLA.length / recentRequests.length) * 100);
  };

  // Dialog management functions
  const handleOpenDialog = (request: PickupRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async (
    requestId: number,
    status: string,
    photo?: string
  ) => {
    await onUpdateProductionStatus(requestId, status, photo);
    // Refresh the selected request data
    const updatedRequest = requests.find((r) => r.id === requestId);
    if (updatedRequest) {
      setSelectedRequest(updatedRequest);
    }
  };

  // Handle view job details from the detailed report
  const handleViewJobDetails = (request: PickupRequest) => {
    handleOpenDialog(request);
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-wide">
            Production Management System
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Complete operations reporting and analytics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          {/* Time Filter */}
          <div className="flex items-center space-x-2 bg-muted rounded-lg p-1 border border-border">
            <Button
              onClick={() => setShowTodayOnly(true)}
              size="sm"
              className={`text-xs px-3 py-1 transition-all ${
                showTodayOnly
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              Today Only
            </Button>
            <Button
              onClick={() => setShowTodayOnly(false)}
              size="sm"
              className={`text-xs px-3 py-1 transition-all ${
                !showTodayOnly
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              All Time
            </Button>
          </div>

          {/* Export Button */}
          {!readOnly && (
            <Button
              onClick={onExportReport}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
            >
              <FileText className="w-3 h-3 mr-2" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Average Processing Time */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide">
                Avg Process Time
              </p>
              <p className="text-xl font-bold text-blue-500">
                {calculateAverageProcessingTime().toFixed(1)}h
              </p>
            </div>
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
        </Card>

        {/* Throughput Rate */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide">
                Daily Throughput
              </p>
              <p className="text-xl font-bold text-green-500">
                {calculateThroughputRate()}/day
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </Card>

        {/* Bottleneck Stage */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide">
                Current Bottleneck
              </p>
              <p className="text-sm font-bold text-orange-500">
                {identifyBottleneck()}
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
        </Card>

        {/* SLA Compliance */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide">
                SLA Compliance
              </p>
              <p className="text-xl font-bold text-blue-500">
                {calculateSLACompliance()}%
              </p>
            </div>
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Five Column Production Workflow */}
      <div className="grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2 gap-4 mb-6">
        {/* Column 1: Requests for Pickup */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <h3 className="text-lg font-bold text-red-700 mb-4 text-center">
            Requests for Pickup
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests
              .filter((r: PickupRequest) => {
                const statusMatch =
                  !r.isCompleted &&
                  (r.productionStatus === "pending" || !r.productionStatus);
                if (!showTodayOnly) return statusMatch;

                const today = new Date();
                const requestDate = new Date(r.createdAt);
                return (
                  statusMatch &&
                  requestDate.toDateString() === today.toDateString()
                );
              })
              .map((request: PickupRequest) => (
                <div
                  key={request.id}
                  className="bg-card rounded-lg p-3 border border-border hover:bg-muted transition-colors shadow-sm cursor-pointer"
                  onClick={() => handleOpenDialog(request)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-sm">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.businessName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.address}
                        </p>
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateProductionStatus(request.id, "in_process");
                        }}
                        size="sm"
                        className="bg-yellow-500 w-full hover:bg-yellow-600 text-white text-xs px-2 py-1"
                      >
                        Start Process
                      </Button>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-700 border-red-300 w-full justify-center"
                    >
                      Pending Pickup
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Column 2: In Process */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <h3 className="text-lg font-bold text-yellow-700 mb-4 text-center">
            In Process
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests
              .filter((r: PickupRequest) => {
                const statusMatch = r.productionStatus === "in_process";
                if (!showTodayOnly) return statusMatch;

                const today = new Date();
                const requestDate = new Date(r.createdAt);
                return (
                  statusMatch &&
                  requestDate.toDateString() === today.toDateString()
                );
              })
              .map((request: PickupRequest) => (
                <div
                  key={request.id}
                  className="bg-card rounded-lg p-3 border border-border hover:bg-muted transition-colors shadow-sm cursor-pointer"
                  onClick={() => handleOpenDialog(request)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-sm">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.businessName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          RO# {request.roNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateProductionStatus(
                            request.id,
                            "ready_for_delivery"
                          );
                        }}
                        size="sm"
                        className="bg-orange-500 w-full hover:bg-orange-600 text-white text-xs px-2 py-1"
                      >
                        Mark Ready
                      </Button>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-700 border-yellow-300 w-full justify-center"
                    >
                      Processing
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Column 3: Ready to Deliver */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <h3 className="text-lg font-bold text-orange-700 mb-4 text-center">
            Ready to Deliver
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests
              .filter((r: PickupRequest) => {
                const statusMatch = r.productionStatus === "ready_for_delivery";
                if (!showTodayOnly) return statusMatch;

                const today = new Date();
                const requestDate = new Date(r.createdAt);
                return (
                  statusMatch &&
                  requestDate.toDateString() === today.toDateString()
                );
              })
              .map((request: PickupRequest) => (
                <div
                  key={request.id}
                  className="bg-card rounded-lg p-3 border border-border hover:bg-muted transition-colors shadow-sm cursor-pointer"
                  onClick={() => handleOpenDialog(request)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-sm">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.businessName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          RO# {request.roNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateProductionStatus(request.id, "ready_to_bill");
                        }}
                        size="sm"
                        className="bg-orange-700 w-full hover:bg-orange-900 text-white text-xs px-2 py-1"
                      >
                        Mark Delivered
                      </Button>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-700 border-orange-300 w-full justify-center"
                    >
                      Ready for Delivery
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Column 4: Ready to Bill */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <h3 className="text-lg font-bold text-blue-700 mb-4 text-center">
            Ready to Bill
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests
              .filter((r: PickupRequest) => {
                const statusMatch = r.productionStatus === "ready_to_bill";
                if (!showTodayOnly) return statusMatch;

                const today = new Date();
                const requestDate = new Date(r.createdAt);
                return (
                  statusMatch &&
                  requestDate.toDateString() === today.toDateString()
                );
              })
              .map((request: PickupRequest) => (
                <div
                  key={request.id}
                  className="bg-card rounded-lg p-3 border border-border hover:bg-muted transition-colors shadow-sm cursor-pointer"
                  onClick={() => handleOpenDialog(request)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-sm">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.businessName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          RO# {request.roNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateProductionStatus(request.id, "billed");
                        }}
                        size="sm"
                        className="bg-blue-500 w-full hover:bg-blue-600 text-white text-xs px-2 py-1"
                      >
                        Mark Billed
                      </Button>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 border-blue-300 w-full justify-center"
                    >
                      Ready for Invoice
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Column 5: Billed/Completed */}
        <Card className="bg-card border border-border p-4 shadow-sm">
          <h3 className="text-lg font-bold text-green-700 mb-4 text-center">
            Billed/Completed
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests
              .filter((r: PickupRequest) => {
                const statusMatch = r.productionStatus === "billed";
                if (!showTodayOnly) return statusMatch;

                const today = new Date();
                const requestDate = new Date(r.createdAt);
                return (
                  statusMatch &&
                  requestDate.toDateString() === today.toDateString()
                );
              })
              .map((request: PickupRequest) => (
                <div
                  key={request.id}
                  className="bg-card rounded-lg p-3 border border-border shadow-sm cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleOpenDialog(request)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-foreground font-medium text-sm">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.businessName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          RO# {request.roNumber || "N/A"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Invoice# {request.invoiceNumber || "N/A"}
                        </p>
                        {request.billedAmount && (
                          <p className="text-green-500 text-xs font-medium">
                            ${request.billedAmount}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-300 w-full justify-center"
                    >
                      Completed
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Enhanced Detailed Reporting Table */}
      <Card className="bg-card border border-border p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h4 className="text-lg font-bold text-foreground">
              Detailed Production Report
            </h4>
            <p className="text-sm text-muted-foreground">
              Search, filter, and view complete job details with photos and
              notes
            </p>
          </div>

          {/* Enhanced Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer, business, RO#..."
                value={reportSearchTerm}
                onChange={(e) => setReportSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>

            {/* Date Range */}
            <div className="flex gap-2">
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="pl-10 w-full sm:w-40"
                  placeholder="Start date"
                />
              </div>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="pl-10 w-full sm:w-40"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(reportSearchTerm || dateRangeStart || dateRangeEnd) && (
              <Button
                onClick={() => {
                  setReportSearchTerm("");
                  setDateRangeStart("");
                  setDateRangeEnd("");
                }}
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  Customer
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  Business
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  Created
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  Process Time
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  RO#
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredRequests = requests.filter((r: PickupRequest) => {
                  // Date range filter
                  const requestDate = new Date(r.createdAt);
                  let dateMatch = true;

                  if (dateRangeStart) {
                    const startDate = new Date(dateRangeStart);
                    dateMatch = dateMatch && requestDate >= startDate;
                  }

                  if (dateRangeEnd) {
                    const endDate = new Date(dateRangeEnd);
                    endDate.setHours(23, 59, 59, 999); // Include full end day
                    dateMatch = dateMatch && requestDate <= endDate;
                  }

                  // If no date range specified, use existing logic
                  if (!dateRangeStart && !dateRangeEnd) {
                    if (showTodayOnly) {
                      const today = new Date();
                      dateMatch =
                        requestDate.toDateString() === today.toDateString();
                    }
                  }

                  // Search term filter
                  let searchMatch = true;
                  if (reportSearchTerm) {
                    const searchLower = reportSearchTerm.toLowerCase();
                    searchMatch = Boolean(
                      `${r.firstName} ${r.lastName}`
                        .toLowerCase()
                        .includes(searchLower) ||
                        r.businessName.toLowerCase().includes(searchLower) ||
                        (r.roNumber &&
                          String(r.roNumber)
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (r.phone &&
                          String(r.phone).includes(reportSearchTerm)) ||
                        (r.email && r.email.toLowerCase().includes(searchLower))
                    );
                  }

                  return dateMatch && searchMatch;
                });

                return filteredRequests.map((request: PickupRequest) => {
                  const createdTime = new Date(request.createdAt);
                  const completedTime = request.completedAt
                    ? new Date(request.completedAt)
                    : new Date();
                  const processHours = (
                    (completedTime.getTime() - createdTime.getTime()) /
                    (1000 * 60 * 60)
                  ).toFixed(1);

                  return (
                    <tr
                      key={request.id}
                      className="border-b border-border hover:bg-muted cursor-pointer"
                      onClick={() => handleViewJobDetails(request)}
                    >
                      <td className="py-3 px-2 text-foreground">
                        {request.firstName} {request.lastName}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {request.businessName}
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          className={`text-xs ${
                            request.productionStatus === "billed"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : request.productionStatus === "ready_to_bill"
                                ? "bg-blue-100 text-blue-700 border-blue-300"
                                : request.productionStatus ===
                                    "ready_for_delivery"
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : request.productionStatus === "in_process"
                                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                    : "bg-red-100 text-red-700 border-red-300"
                          }`}
                        >
                          {(request.productionStatus || "pending")
                            .replace(/_/g, " ")
                            .toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">
                        {createdTime.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">
                        {processHours}h
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">
                        {request.roNumber || "-"}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewJobDetails(request);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>

          {/* Results Count */}
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing{" "}
            {(() => {
              const count = requests.filter((r: PickupRequest) => {
                const requestDate = new Date(r.createdAt);
                let dateMatch = true;

                if (dateRangeStart) {
                  const startDate = new Date(dateRangeStart);
                  dateMatch = dateMatch && requestDate >= startDate;
                }

                if (dateRangeEnd) {
                  const endDate = new Date(dateRangeEnd);
                  endDate.setHours(23, 59, 59, 999);
                  dateMatch = dateMatch && requestDate <= endDate;
                }

                if (!dateRangeStart && !dateRangeEnd && showTodayOnly) {
                  const today = new Date();
                  dateMatch =
                    requestDate.toDateString() === today.toDateString();
                }

                let searchMatch = true;
                if (reportSearchTerm) {
                  const searchLower = reportSearchTerm.toLowerCase();
                  searchMatch = Boolean(
                    `${r.firstName} ${r.lastName}`
                      .toLowerCase()
                      .includes(searchLower) ||
                      r.businessName.toLowerCase().includes(searchLower) ||
                      (r.roNumber &&
                        String(r.roNumber)
                          .toLowerCase()
                          .includes(searchLower)) ||
                      (r.phone && String(r.phone).includes(reportSearchTerm)) ||
                      (r.email && r.email.toLowerCase().includes(searchLower))
                  );
                }

                return dateMatch && searchMatch;
              }).length;
              return count;
            })()}{" "}
            results • Click any row to view complete details
          </div>
        </div>
      </Card>

      {/* Production View Dialog */}
      <ProductionViewDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        request={selectedRequest}
        onUpdateProductionStatus={handleUpdateStatus}
        readOnly={readOnly}
      />
    </div>
  );
}
