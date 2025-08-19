"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTenant } from "@/lib/tenant-context";
import { apiRequest } from "@/lib/api";

const schema = z.object({
  tenant: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function DriverRegister() {
  const router = useRouter();
  const { subdomain } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenant: "",
      name: "",
      email: "",
      password: "",
      phone: "",
      licenseNumber: "",
    },
  });

  const requireTenant = !subdomain;

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const tenantValue = (data.tenant || subdomain || "").trim().toLowerCase();
      if (!tenantValue) {
        setError("Please enter your business subdomain");
        setIsLoading(false);
        return;
      }

      // Persist tenant so the API layer forwards it in headers
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tenant_subdomain", tenantValue);
          document.cookie = `tenant_subdomain=${encodeURIComponent(
            tenantValue
          )}; path=/; samesite=lax`;
        } catch {}
      }

      const resp = await apiRequest("/api/auth/driver/register", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          licenseNumber: data.licenseNumber,
        }),
      });

      const result = await resp.json();
      if (!result.success) {
        setError(result.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      if (typeof window !== "undefined" && result.accessToken) {
        window.localStorage.setItem("accessToken", result.accessToken);
      }

      router.push("/driver");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Driver Registration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {requireTenant && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Input
                id="tenant"
                type="text"
                placeholder="your-tenant"
                {...register("tenant")}
              />
              {errors.tenant && (
                <p className="text-sm text-red-500">
                  {errors.tenant.message as string}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter your business subdomain (tenant), e.g. "acme".
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Smith"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="driver@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number (optional)</Label>
            <Input
              id="licenseNumber"
              type="text"
              placeholder="DL123456789"
              {...register("licenseNumber")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Registering..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
