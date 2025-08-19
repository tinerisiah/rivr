"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface Business {
  id: number;
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
  subdomain: string;
  customDomain?: string;
  status: "pending" | "active" | "suspended" | "canceled";
  subscriptionPlan: "starter" | "professional" | "enterprise";
  subscriptionStatus:
    | "trial"
    | "active"
    | "past_due"
    | "canceled"
    | "suspended";
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  trialEndsAt?: string;
  monthlyRevenue: number;
  annualRevenue: number;
  maxUsers: number;
  maxDrivers: number;
  maxCustomers: number;
  createdAt: string;
  updatedAt: string;
}

interface BusinessesTabProps {
  businesses: Business[];
  loadingBusinesses: boolean;
  onAddBusiness: () => void;
  onActivateBusiness: (businessId: number) => void;
  onSuspendBusiness: (businessId: number) => void;
  onCancelBusiness: (businessId: number) => void;
}

export function BusinessesTab({
  businesses,
  loadingBusinesses,
  onAddBusiness,
  onActivateBusiness,
  onSuspendBusiness,
  onCancelBusiness,
}: BusinessesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Canceled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Active
          </Badge>
        );
      case "trial":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Trial
          </Badge>
        );
      case "past_due":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Past Due
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Canceled
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loadingBusinesses) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Businesses</h2>
          <Button onClick={onAddBusiness} disabled>
            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Businesses</h2>
          <p className="text-muted-foreground">
            Manage business accounts and subscriptions
          </p>
        </div>
        <Button onClick={onAddBusiness}>
          <Plus className="w-4 h-4 mr-2" />
          Add Business
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search businesses by name, email, or subdomain..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-foreground">
                Total Businesses
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {businesses.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-foreground">
                Active
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {businesses.filter((b) => b.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-foreground">
                Pending
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {businesses.filter((b) => b.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground">
                Suspended
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {businesses.filter((b) => b.status === "suspended").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business List */}
      <div className="space-y-4">
        {filteredBusinesses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No businesses found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first business"}
              </p>
              {!searchQuery && (
                <Button onClick={onAddBusiness}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBusinesses.map((business) => (
            <Card
              key={business.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-foreground">
                        <Link
                          href={`/rivr-exec/businesses/${business.id}`}
                          className="hover:underline"
                        >
                          {business.businessName}
                        </Link>
                      </h3>
                      {getStatusBadge(business.status)}
                      {getSubscriptionBadge(business.subscriptionStatus)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{business.ownerEmail}</span>
                      </div>
                      {business.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{business.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {business.subdomain}.rivr.com
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Joined {formatDate(business.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Plan: {business.subscriptionPlan}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Revenue: {formatCurrency(business.monthlyRevenue)}/mo
                        </span>
                      </div>
                      {business.trialEndsAt && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Trial ends: {formatDate(business.trialEndsAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {business.address && (
                      <div className="flex items-start space-x-2 mb-4">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm text-muted-foreground">
                          {business.address}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {business.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => onActivateBusiness(business.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Activate
                      </Button>
                    )}
                    {business.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSuspendBusiness(business.id)}
                        className="border-orange-200 text-orange-700 hover:bg-orange-50"
                      >
                        Suspend
                      </Button>
                    )}
                    {business.status === "suspended" && (
                      <Button
                        size="sm"
                        onClick={() => onActivateBusiness(business.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Reactivate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancelBusiness(business.id)}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
