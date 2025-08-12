"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Settings,
  Package,
  FileText,
  CheckCircle,
  Users,
  Calendar,
  MessageSquare,
  MapPin,
} from "lucide-react";
import type { Customer, PickupRequest, QuoteRequest } from "@/lib/schema";

interface OverviewTabProps {
  customers: Customer[];
  requests: PickupRequest[];
  quoteRequests: QuoteRequest[];
  routes: any[];
  onPipelineStageClick: (stage: string) => void;
}

export function OverviewTab({
  customers,
  requests,
  quoteRequests,
  routes,
  onPipelineStageClick,
}: OverviewTabProps) {
  return (
    <>
      {/* Header with Stats Summary */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-wide mb-2">
          Operations Dashboard
        </h2>
        <p className="text-muted-foreground mb-4">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Production Pipeline - Clickable Icons with Numbers */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-foreground mb-4">
          Production Pipeline
        </h3>
        <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
          {/* Requests for Pickup */}
          <button
            onClick={() => onPipelineStageClick("pending")}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="relative">
              <Clock className="w-12 h-12 text-red-500 group-hover:text-red-600 transition-colors" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {
                  requests.filter(
                    (r: PickupRequest) =>
                      !r.isCompleted &&
                      (r.productionStatus === "pending" || !r.productionStatus)
                  ).length
                }
              </span>
            </div>
            <span className="text-sm font-medium text-foreground mt-2">
              Pickup Requests
            </span>
          </button>

          {/* In Process */}
          <button
            onClick={() => onPipelineStageClick("in_process")}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="relative">
              <Settings className="w-12 h-12 text-yellow-500 group-hover:text-yellow-600 transition-colors" />
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {
                  requests.filter(
                    (r: PickupRequest) => r.productionStatus === "in_process"
                  ).length
                }
              </span>
            </div>
            <span className="text-sm font-medium text-foreground mt-2">
              In Process
            </span>
          </button>

          {/* Ready for Delivery */}
          <button
            onClick={() => onPipelineStageClick("ready_for_delivery")}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="relative">
              <Package className="w-12 h-12 text-orange-500 group-hover:text-orange-600 transition-colors" />
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {
                  requests.filter(
                    (r: PickupRequest) =>
                      r.productionStatus === "ready_for_delivery"
                  ).length
                }
              </span>
            </div>
            <span className="text-sm font-medium text-foreground mt-2">
              Ready for Delivery
            </span>
          </button>

          {/* Ready for Invoice */}
          <button
            onClick={() => onPipelineStageClick("ready_to_bill")}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="relative">
              <FileText className="w-12 h-12 text-blue-500 group-hover:text-blue-600 transition-colors" />
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {
                  requests.filter(
                    (r: PickupRequest) => r.productionStatus === "ready_to_bill"
                  ).length
                }
              </span>
            </div>
            <span className="text-sm font-medium text-foreground mt-2">
              Ready for Invoice
            </span>
          </button>

          {/* Billed/Completed */}
          <button
            onClick={() => onPipelineStageClick("billed")}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="relative">
              <CheckCircle className="w-12 h-12 text-green-500 group-hover:text-green-600 transition-colors" />
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {
                  requests.filter(
                    (r: PickupRequest) => r.productionStatus === "billed"
                  ).length
                }
              </span>
            </div>
            <span className="text-sm font-medium text-foreground mt-2">
              Completed
            </span>
          </button>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="mb-8">
        <Card className="bg-card border border-border p-6 shadow-sm">
          <h4 className="text-lg font-bold text-foreground mb-4">
            Recent Activity
          </h4>
          <div className="space-y-3 max-h-32 overflow-y-auto">
            {requests
              .filter((r: PickupRequest) => {
                const today = new Date();
                const requestDate = new Date(r.createdAt);
                return requestDate.toDateString() === today.toDateString();
              })
              .slice(0, 5)
              .map((request: PickupRequest) => (
                <div key={request.id} className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      request.productionStatus === "billed"
                        ? "bg-green-500"
                        : request.productionStatus === "ready_to_bill"
                          ? "bg-blue-500"
                          : request.productionStatus === "ready_for_delivery"
                            ? "bg-orange-500"
                            : request.productionStatus === "in_process"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <div className="text-foreground text-sm">
                      {request.firstName} {request.lastName}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {request.businessName}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card className="bg-card border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm tracking-wide">
                Total Customers
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {customers.length}
              </p>
            </div>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-card border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm tracking-wide">
                Today's Pickups
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {
                  requests.filter((r: PickupRequest) => {
                    const today = new Date();
                    const requestDate = new Date(r.createdAt);
                    return requestDate.toDateString() === today.toDateString();
                  }).length
                }
              </p>
            </div>
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-card border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm tracking-wide">
                Today's Quotes
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {
                  quoteRequests.filter((q: QuoteRequest) => {
                    const today = new Date();
                    const requestDate = new Date(q.createdAt);
                    return requestDate.toDateString() === today.toDateString();
                  }).length
                }
              </p>
            </div>
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-card border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm tracking-wide">
                Active Routes
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {
                  routes.filter(
                    (r: any) =>
                      r.status === "in_progress" || r.status === "pending"
                  ).length
                }
              </p>
            </div>
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          </div>
        </Card>
      </div>
    </>
  );
}
