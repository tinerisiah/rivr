"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Building,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Package,
  Truck,
  User,
  Hash,
} from "lucide-react";
import type { PickupRequest } from "@/lib/schema";

interface ProductionViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: PickupRequest | null;
  onUpdateProductionStatus: (requestId: number, status: string) => void;
}

export function ProductionViewDialog({
  isOpen,
  onClose,
  request,
  onUpdateProductionStatus,
}: ProductionViewDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!request) return null;

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onUpdateProductionStatus(request.id, newStatus);
      // Close dialog after successful update
      onClose();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-red-100 text-red-700 border-red-300";
      case "in_process":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "ready_for_delivery":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "ready_to_bill":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "billed":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    return (status || "pending").replace("_", " ").toUpperCase();
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return {
          status: "in_process",
          label: "Start Processing",
          color: "bg-yellow-500 hover:bg-yellow-600",
        };
      case "in_process":
        return {
          status: "ready_for_delivery",
          label: "Mark Ready for Delivery",
          color: "bg-orange-500 hover:bg-orange-600",
        };
      case "ready_for_delivery":
        return {
          status: "ready_to_bill",
          label: "Mark Delivered",
          color: "bg-blue-500 hover:bg-blue-600",
        };
      case "ready_to_bill":
        return {
          status: "billed",
          label: "Mark Billed",
          color: "bg-green-500 hover:bg-green-600",
        };
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(request.productionStatus || "pending");
  const createdDate = new Date(request.createdAt);
  const completedDate = request.completedAt
    ? new Date(request.completedAt)
    : null;
  const inProcessAt = (request as any).inProcessAt
    ? new Date((request as any).inProcessAt)
    : null;
  const readyForDeliveryAt = (request as any).readyForDeliveryAt
    ? new Date((request as any).readyForDeliveryAt)
    : null;
  const readyToBillAt = (request as any).readyToBillAt
    ? new Date((request as any).readyToBillAt)
    : null;
  const deliveredDate = request.deliveredAt
    ? new Date(request.deliveredAt)
    : null;
  const billedDate = request.billedAt ? new Date(request.billedAt) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Production Details
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Complete information for {request.firstName} {request.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {request.firstName} {request.lastName}
                </h3>
                <p className="text-muted-foreground">{request.businessName}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge
                className={`text-sm px-3 py-1 ${getStatusColor(request.productionStatus || "pending")}`}
              >
                {getStatusLabel(request.productionStatus || "pending")}
              </Badge>
              {nextStatus && (
                <Button
                  onClick={() => handleStatusUpdate(nextStatus.status)}
                  disabled={isUpdating}
                  className={`text-white ${nextStatus.color}`}
                  size="sm"
                >
                  {isUpdating ? "Updating..." : nextStatus.label}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <Card className="p-4">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Customer Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">
                    {request.firstName} {request.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Business:</span>
                  <span className="font-medium">{request.businessName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{request.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{request.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium">{request.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Wheels:</span>
                  <span className="font-medium">{request.wheelCount}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Job Details */}
          <Card className="p-4">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Job Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">RO Number:</span>
                  <span className="font-medium">
                    {request.roNumber || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {createdDate.toLocaleDateString()}{" "}
                    {createdDate.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant="outline" className="text-xs">
                    {request.priority || "normal"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                {request.estimatedPickupTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Est. Pickup:</span>
                    <span className="font-medium">
                      {new Date(
                        request.estimatedPickupTime
                      ).toLocaleDateString()}{" "}
                      {new Date(
                        request.estimatedPickupTime
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {request.customerNotes && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <span className="font-medium">{request.customerNotes}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Production Timeline */}
          <Card className="p-4">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Production Timeline
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">
                  Request Created
                </span>
                <span className="text-sm font-medium">
                  {createdDate.toLocaleDateString()}{" "}
                  {createdDate.toLocaleTimeString()}
                </span>
              </div>

              {inProcessAt && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Processing Started
                  </span>
                  <span className="text-sm font-medium">
                    {`${inProcessAt.toLocaleDateString()} ${inProcessAt.toLocaleTimeString()}`}
                  </span>
                </div>
              )}

              {readyForDeliveryAt ? (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Ready for Delivery
                  </span>
                  <span className="text-sm font-medium">
                    {`${readyForDeliveryAt.toLocaleDateString()} ${readyForDeliveryAt.toLocaleTimeString()}`}
                  </span>
                </div>
              ) : null}

              {readyToBillAt || deliveredDate ? (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Delivered
                  </span>
                  <span className="text-sm font-medium">
                    {deliveredDate
                      ? `${deliveredDate.toLocaleDateString()} ${deliveredDate.toLocaleTimeString()}`
                      : readyToBillAt
                        ? `${readyToBillAt.toLocaleDateString()} ${readyToBillAt.toLocaleTimeString()}`
                        : "-"}
                  </span>
                </div>
              ) : null}

              {request.productionStatus === "billed" ? (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Billed</span>
                  <span className="text-sm font-medium">
                    {billedDate
                      ? `${billedDate.toLocaleDateString()} ${billedDate.toLocaleTimeString()}`
                      : "-"}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Financial Information */}
          {request.billedAmount && (
            <Card className="p-4">
              <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Financial Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Billed Amount:
                    </span>
                    <span className="font-medium text-green-600">
                      ${request.billedAmount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Invoice Number:
                    </span>
                    <span className="font-medium">
                      {request.invoiceNumber || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Completion Information */}
          {request.isCompleted && (
            <Card className="p-4">
              <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Completion Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium">
                      {completedDate
                        ? `${completedDate.toLocaleDateString()} ${completedDate.toLocaleTimeString()}`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Employee:</span>
                    <span className="font-medium">
                      {request.employeeName || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {request.completionLocation && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">
                        {request.completionLocation}
                      </span>
                    </div>
                  )}
                  {request.completionNotes && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <span className="font-medium">
                        {request.completionNotes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {(request as any).completionPhoto && (
                <div className="mt-3">
                  <img
                    src={(request as any).completionPhoto}
                    alt="Pickup Photo"
                    className="max-h-64 rounded-md border border-border"
                  />
                </div>
              )}
            </Card>
          )}

          {/* QR Codes */}
          {request.wheelQrCodes && request.wheelQrCodes.length > 0 && (
            <Card className="p-4">
              <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Hash className="w-5 h-5 text-purple-500" />
                Wheel QR Codes
              </h4>
              <div className="flex flex-wrap gap-2">
                {request.wheelQrCodes.map((qrCode: string, index: number) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="font-mono text-xs"
                  >
                    {qrCode}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Delivery QR Codes */}
          {request.deliveryQrCodes && request.deliveryQrCodes.length > 0 && (
            <Card className="p-4">
              <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Delivery QR Codes
              </h4>
              <div className="flex flex-wrap gap-2">
                {request.deliveryQrCodes.map(
                  (qrCode: string, index: number) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {qrCode}
                    </Badge>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Delivery Photo */}
          {(request as any).deliveryPhoto && (
            <Card className="p-4">
              <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Delivery Photo
              </h4>
              <img
                src={(request as any).deliveryPhoto}
                alt="Delivery Photo"
                className="max-h-64 rounded-md border border-border"
              />
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {nextStatus && (
              <Button
                onClick={() => handleStatusUpdate(nextStatus.status)}
                disabled={isUpdating}
                className={`text-white ${nextStatus.color}`}
              >
                {isUpdating ? "Updating..." : nextStatus.label}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
