"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DriverServiceRequestForm = {
  customerId: string; // keep as string for Select compatibility
  roNumber?: string;
  notes?: string;
  address?: string;
};

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
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
  address: z
    .string()
    .max(500, "Address too long")
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
});

export function DriverServiceRequestModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DriverServiceRequestForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      roNumber: "",
      notes: "",
      address: "",
    },
  });

  // Load customers for the driver's tenant when modal is open
  const { data, isLoading } = useQuery({
    queryKey: ["/api/driver/customers", isOpen],
    queryFn: async () => {
      if (!isOpen) return null;
      const res = await apiRequest("GET", "/api/driver/customers");
      return (await res.json()) as {
        success: boolean;
        customers: Array<{
          id: number;
          firstName: string;
          lastName: string;
          email: string;
          businessName: string;
        }>;
      };
    },
    enabled: isOpen,
  });

  const customers = useMemo(() => (data as any)?.customers ?? [], [data]);

  useEffect(() => {
    // When the selection changes, default address to the selected customer's address by refetching a minimal profile from list if available in payload
    // Our customers list does not include address; we let the driver optionally set it; backend will fallback to the customer's saved address if omitted
  }, [form.watch("customerId")]);

  const handleSubmit = async (values: DriverServiceRequestForm) => {
    try {
      setSubmitting(true);
      const payload = {
        customerId: Number(values.customerId),
        roNumber: values.roNumber,
        customerNotes: values.notes,
        address: values.address,
      };
      const res = await apiRequest(
        "POST",
        "/api/driver/pickup-requests",
        payload
      );
      const json = (await res.json()) as {
        success: boolean;
        requestId?: number;
        message?: string;
      };
      toast({
        title: json?.success ? "Request Created" : "Request Failed",
        description:
          json?.message ||
          (json?.success
            ? "Service request created."
            : "Failed to create request."),
        variant: json?.success ? "default" : "destructive",
      });
      if (json?.success) {
        form.reset({ customerId: "", roNumber: "", notes: "", address: "" });
        onClose();
        onCreated?.();
      }
    } catch (e) {
      toast({
        title: "Request Failed",
        description: "Could not create service request.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset({ customerId: "", roNumber: "", notes: "", address: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-wide">
            New Service Request
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a customer and add optional details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue
                        placeholder={
                          isLoading ? "Loading..." : "Select customer"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="roNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RO Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter RO number" {...field} />
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
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Leave empty to use customer's saved address"
                        {...field}
                      />
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
                        rows={3}
                        placeholder="Any special instructions"
                        {...field}
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
                disabled={submitting || isLoading}
                className="min-w-[160px]"
              >
                {submitting ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default DriverServiceRequestModal;
