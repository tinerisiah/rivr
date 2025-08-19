"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/lib/tenant-context";
import { coreApiRequest } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

type RoleOption =
  | "business_owner"
  | "rivr_admin"
  | "driver"
  | "employee_viewer"
  | "auto";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum([
    "business_owner",
    "rivr_admin",
    "driver",
    "employee_viewer",
    "auto",
  ]),
  tenant: z.string().optional(),
});

function ForgotPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const { subdomain: detectedSubdomain, isExec } = useTenant();

  const defaultRole = (params.get("role") as RoleOption) || "auto";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  useEffect(() => {
    if (defaultRole) setValue("role", defaultRole);
  }, [defaultRole, setValue]);

  const role = watch("role");
  const shouldAskTenant = useMemo(() => {
    const needsTenant =
      role === "driver" || role === "employee_viewer" || role === "auto";
    const hasSubdomain = Boolean(detectedSubdomain) && !isExec;
    return needsTenant && !hasSubdomain;
  }, [role, detectedSubdomain, isExec]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      // Persist tenant for header forwarding if provided
      const tenantInput = (data.tenant || detectedSubdomain || "")
        .trim()
        .toLowerCase();
      if (tenantInput && typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tenant_subdomain", tenantInput);
          document.cookie = `tenant_subdomain=${encodeURIComponent(tenantInput)}; path=/; samesite=lax`;
        } catch {}
      }

      const body: any = { email: data.email };
      if (data.role && data.role !== "auto") body.role = data.role;

      await coreApiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast({
        title: "Check your email",
        description: "If an account exists, we sent a reset link.",
      });
      router.push("/auth");
    } catch (e) {
      toast({
        title: "Request failed",
        description: e instanceof Error ? e.message : "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Forgot password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">
                  {errors.email.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Account type</Label>
              <Select
                value={role}
                onValueChange={(value) => setValue("role", value as RoleOption)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="auto">Auto detect</SelectItem>
                  <SelectItem value="business_owner">Business owner</SelectItem>
                  <SelectItem value="rivr_admin">RIVR admin</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="employee_viewer">
                    Employee (viewer)
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">
                  {errors.role.message as string}
                </p>
              )}
            </div>

            {shouldAskTenant && (
              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant (subdomain)</Label>
                <Input
                  id="tenant"
                  placeholder="your-tenant"
                  {...register("tenant")}
                />
                <p className="text-xs text-muted-foreground">
                  Required for driver or employee accounts.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          Loading...
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
