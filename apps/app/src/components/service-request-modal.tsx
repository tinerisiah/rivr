"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTenant } from "@/lib/tenant-context";
import { AlertTriangle, CheckCircle, MapPin } from "lucide-react";

export type CombinedServiceRequestData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName: string;
  address: string;
  roNumber?: string;
  notes?: string;
  businessSubdomain?: string;
};

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CombinedServiceRequestData) => void | Promise<void>;
  initialData?: Partial<CombinedServiceRequestData>;
  disableUserFields?: boolean;
}

const combinedSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().min(1, "Address is required"),
  roNumber: z
    .string()
    .max(64, "RO number is too long")
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  notes: z
    .string()
    .max(2000, "Notes are too long")
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  businessSubdomain: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .transform((v) =>
      v && v.trim().length > 0 ? v.trim().toLowerCase() : undefined
    ),
});

export default function ServiceRequestModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  disableUserFields = false,
}: ServiceRequestModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const { subdomain } = useTenant();

  const form = useForm<CombinedServiceRequestData>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: subdomain || "",
      address: "",
      roNumber: "",
      notes: "",
      businessSubdomain: subdomain || "",
    },
  });

  // Address validation state
  const [addressValidation, setAddressValidation] = useState<{
    status: "idle" | "validating" | "valid" | "invalid";
    message?: string;
  }>({ status: "idle" });

  // Available businesses (only when no tenant in URL)
  const [businesses, setBusinesses] = useState<
    { id: number; businessName: string; subdomain: string }[]
  >([]);
  useEffect(() => {
    (async () => {
      if (subdomain) return; // Only load for marketing/root where tenant not in host
      try {
        const res = await apiRequest("GET", "/api/public/businesses");
        const json = (await res.json()) as {
          success: boolean;
          businesses: { id: number; businessName: string; subdomain: string }[];
        };
        if (json?.success && Array.isArray(json.businesses)) {
          setBusinesses(json.businesses);
        }
      } catch {
        // ignore optional list errors
      }
    })();
  }, [subdomain]);

  useEffect(() => {
    // Prefill business name from tenant when available
    if (isOpen && subdomain) {
      form.setValue("businessName", subdomain);
      form.setValue("businessSubdomain", subdomain);
    }
  }, [form, isOpen, subdomain]);

  // Prefill from provided initial data when opening
  useEffect(() => {
    if (!isOpen) return;
    if (!initialData) return;
    const nextValues: CombinedServiceRequestData = {
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
      email: initialData.email || "",
      phone: initialData.phone || "",
      businessName: initialData.businessName || subdomain || "",
      address: initialData.address || "",
      roNumber: initialData.roNumber || "",
      notes: initialData.notes || "",
      businessSubdomain: initialData.businessSubdomain || subdomain || "",
    };
    form.reset(nextValues);
  }, [form, initialData, isOpen, subdomain]);

  const validateAddress = async (address: string) => {
    if (!address || address.length < 8) {
      setAddressValidation({ status: "idle" });
      return;
    }
    setAddressValidation({ status: "validating" });
    try {
      const trimmedAddress = address.trim();
      const hasNumber = /\d/.test(trimmedAddress);
      const hasLetters = /[a-zA-Z]/.test(trimmedAddress);
      const hasMultipleParts =
        trimmedAddress.includes(",") || trimmedAddress.includes(" ");
      if (
        hasNumber &&
        hasLetters &&
        hasMultipleParts &&
        trimmedAddress.length >= 10
      ) {
        setAddressValidation({
          status: "valid",
          message: "Address looks good",
        });
      } else {
        setAddressValidation({
          status: "invalid",
          message: "Please provide a complete address with street and number",
        });
      }
    } catch {
      setAddressValidation({
        status: "invalid",
        message: "Address validation failed. Please try again.",
      });
    }
  };

  const handleSubmit = async (values: CombinedServiceRequestData) => {
    try {
      setSubmitting(true);
      const sub = values.businessSubdomain?.trim();
      if (typeof window !== "undefined" && sub) {
        window.localStorage.setItem("tenant_subdomain", sub);
      }
      await onSubmit(values);
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        businessName: subdomain || "",
        address: "",
        roNumber: "",
        notes: "",
        businessSubdomain: subdomain || "",
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: subdomain || "",
      address: "",
      roNumber: "",
      notes: "",
      businessSubdomain: subdomain || "",
    });
    setAddressValidation({ status: "idle" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl w-full mobile-modal-full overscroll-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-wide">
            Service Request
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter your information and any details for your service request
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Business selection when no tenant */}
            {!subdomain && businesses.length > 0 && (
              <FormField
                control={form.control}
                name="businessSubdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        const selected = businesses.find(
                          (b) => b.subdomain === val
                        );
                        if (selected) {
                          form.setValue("businessName", selected.businessName);
                        }
                      }}
                      value={field.value || ""}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select business to link" />
                      </SelectTrigger>
                      <SelectContent>
                        {businesses.map((b) => (
                          <SelectItem key={b.id} value={b.subdomain}>
                            {b.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        disabled={disableUserFields}
                      />
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
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        {...field}
                        disabled={disableUserFields}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address*</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      {...field}
                      disabled={disableUserFields}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...field}
                      disabled={disableUserFields}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business name (hidden when tenant present) */}
            {!subdomain && (
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Auto Service"
                        {...field}
                        disabled={disableUserFields}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Address*</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="123 Main Street, Nashville, TN 37201"
                        rows={3}
                        className="resize-none pr-10"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          validateAddress(e.target.value);
                        }}
                      />
                      <div className="absolute right-2 top-2">
                        {addressValidation.status === "validating" && (
                          <MapPin className="w-4 h-4 text-gray-400 animate-pulse" />
                        )}
                        {addressValidation.status === "valid" && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        {addressValidation.status === "invalid" && (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  </FormControl>
                  {addressValidation.message && (
                    <p
                      className={`text-xs mt-1 ${
                        addressValidation.status === "valid"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {addressValidation.message}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service details */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="roNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RO Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your RO number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Any specific instructions or notes for the service team"
                        {...field}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between pt-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="min-w-[120px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="min-w-[160px]"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
