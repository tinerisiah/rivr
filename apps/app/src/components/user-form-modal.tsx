"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// Removed unused framer-motion imports
import { useState } from "react";
import { CheckCircle, AlertTriangle, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserInfo) => void;
}

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().min(1, "Address is required"),
});

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [addressValidation, setAddressValidation] = useState<{
    status: "idle" | "validating" | "valid" | "invalid";
    message?: string;
  }>({ status: "idle" });

  const form = useForm<UserInfo>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: "",
      address: "",
    },
  });

  const validateAddress = async (address: string) => {
    if (!address || address.length < 8) {
      setAddressValidation({ status: "idle" });
      return;
    }

    setAddressValidation({ status: "validating" });

    try {
      // More flexible address validation
      const trimmedAddress = address.trim();

      // Check for basic components (more flexible)
      const hasNumber = /\d/.test(trimmedAddress);
      const hasLetters = /[a-zA-Z]/.test(trimmedAddress);
      const hasMultipleParts =
        trimmedAddress.includes(",") || trimmedAddress.includes(" ");

      // Check for common street identifiers (more comprehensive)
      const streetPattern =
        /(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|place|pl|court|ct|circle|cir|parkway|pkwy|highway|hwy|trail|tr|square|sq|alley|ally)/i;
      // Check if address contains street type identifier
      streetPattern.test(trimmedAddress);

      // More lenient validation - if it has basic address components, accept it
      if (
        hasNumber &&
        hasLetters &&
        hasMultipleParts &&
        trimmedAddress.length >= 15
      ) {
        setAddressValidation({
          status: "valid",
          message: "Address format looks good!",
        });
      } else if (hasNumber && hasLetters && trimmedAddress.length >= 10) {
        // Accept shorter addresses but suggest improvement
        setAddressValidation({
          status: "valid",
          message:
            "Address accepted. For best results, include city and state.",
        });
      } else {
        setAddressValidation({
          status: "invalid",
          message:
            "Please provide a complete address with street number and name",
        });
      }
    } catch {
      setAddressValidation({
        status: "invalid",
        message: "Address validation failed. Please try again.",
      });
    }
  };

  const handleSubmit = (data: UserInfo) => {
    // Only block submission if validation explicitly failed
    // Allow submission for 'idle' or 'valid' status
    if (addressValidation.status === "invalid") {
      form.setError("address", {
        message: "Please provide a valid address before submitting",
      });
      return;
    }
    onSubmit(data);
    form.reset();
    setAddressValidation({ status: "idle" });
  };

  const handleClose = () => {
    form.reset();
    setAddressValidation({ status: "idle" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full mobile-modal-full overscroll-none">
        <DialogHeader>
          <DialogTitle className="mobile-subtitle mb-2 tracking-wide">
            SETUP YOUR SERVICE PROFILE
          </DialogTitle>
          <DialogDescription className="mobile-caption text-muted-foreground uppercase tracking-widest">
            We'll save this information for future service requests
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
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
                      <Input placeholder="Doe" {...field} />
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Name */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Auto Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Form Actions */}
            <div className="flex flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 tap-highlight-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 font-semibold text-xs sm:text-sm tap-highlight-none min-w-0"
              >
                <span>SAVE & REQUEST</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
