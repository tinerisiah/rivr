"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Edit,
  Mail,
  Copy,
  User,
  Building2,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  Calendar,
} from "lucide-react";
import type { Customer, PickupRequest } from "@/lib/schema";

interface CustomersTabProps {
  customers: Customer[];
  requests: PickupRequest[];
  loadingCustomers: boolean;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onCopyLink: (token: string) => void;
  onEmailCustomer: (customer: Customer) => void;
  copiedToken: string | null;
}

export function CustomersTab({
  customers,
  requests,
  loadingCustomers,
  onAddCustomer,
  onEditCustomer,
  onCopyLink,
  onEmailCustomer,
  copiedToken,
}: CustomersTabProps) {
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Filter and sort customers for CRM functionality
  const filteredAndSortedCustomers = customers
    .filter((customer: Customer) => {
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
    .sort((a: Customer, b: Customer) => {
      // Sort alphabetically by last name, then first name
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

  // Helper functions for customer management
  const getCustomerPickupHistory = (customerId: number) => {
    return requests.filter(
      (request: PickupRequest) => request.customerId === customerId
    );
  };

  return (
    <Card className="bg-card border border-border p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-wide">
          Customer CRM
        </h2>
        <Button
          onClick={onAddCustomer}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          ADD CUSTOMER
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search customers by name, email, business, or phone..."
          value={customerSearchQuery}
          onChange={(e) => setCustomerSearchQuery(e.target.value)}
          className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground focus:border-primary"
        />
      </div>

      {/* Customer Count and Clear Search */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedCustomers.length} of {customers.length} customers
          {customerSearchQuery && ` (filtered)`}
        </p>
        {customerSearchQuery && (
          <Button
            onClick={() => setCustomerSearchQuery("")}
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/90 text-xs"
          >
            Clear Search
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {loadingCustomers ? (
          <div className="text-center text-muted-foreground py-8">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Loading customers...
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {customerSearchQuery
              ? "No customers match your search"
              : "No customers yet"}
          </div>
        ) : (
          filteredAndSortedCustomers.map((customer: Customer) => {
            const pickupHistory = getCustomerPickupHistory(customer.id);
            const completedPickups = pickupHistory.filter(
              (p: PickupRequest) => p.isCompleted
            ).length;
            const pendingPickups = pickupHistory.filter(
              (p: PickupRequest) => !p.isCompleted
            ).length;

            return (
              <div
                key={customer.id}
                className="bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                {/* Customer Header */}
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <p className="font-semibold text-lg">
                          {customer.lastName}, {customer.firstName}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="truncate">
                            {customer.businessName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-3 h-3 text-orange-500 flex-shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      </div>

                      {/* Pickup Statistics */}
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-gray-600">
                            {completedPickups} completed
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-gray-600">
                            {pendingPickups} pending
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span className="text-xs text-gray-600">
                            Since{" "}
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                      <Button
                        onClick={() => onEditCustomer(customer)}
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => onEmailCustomer(customer)}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white text-xs"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
