"use client";

import { useState } from "react";
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
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

type ServiceDetails = {
  roNumber?: string;
  notes?: string;
  businessSubdomain?: string; // optional business selection to link request
};

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: ServiceDetails) => void | Promise<void>;
}

const serviceDetailsSchema = z.object({
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
}: ServiceRequestModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ServiceDetails>({
    resolver: zodResolver(serviceDetailsSchema),
    defaultValues: { roNumber: "", notes: "", businessSubdomain: "" },
  });

  // Load available businesses for optional selection
  const [businesses, setBusinesses] = useState<
    { id: number; businessName: string; subdomain: string }[]
  >([]);
  useEffect(() => {
    (async () => {
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
  }, []);

  const handleSubmit = async (values: ServiceDetails) => {
    try {
      setSubmitting(true);
      // If a business is selected, persist subdomain so API routes are tenant-scoped
      const sub = values.businessSubdomain?.trim();
      if (typeof window !== "undefined" && sub) {
        window.localStorage.setItem("tenant_subdomain", sub);
      }
      await onSubmit(values);
      form.reset({ roNumber: "", notes: "" });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await handleSubmit({});
  };

  const handleClose = () => {
    form.reset({ roNumber: "", notes: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full mobile-modal-full overscroll-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-wide">
            Service Request Details
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add any additional details for your service request (optional)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Optional Business Selection */}
            {businesses.length > 0 && (
              <FormField
                control={form.control}
                name="businessSubdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
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
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="roNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RO Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your RO number"
                      {...field}
                      className="bg-background"
                    />
                  </FormControl>
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
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={submitting}
                className="min-w-[120px]"
              >
                Skip
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
