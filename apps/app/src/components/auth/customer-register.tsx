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
import { coreApiRequest } from "@/lib/api";

const schema = z.object({
  tenant: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().min(1, "Address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export function CustomerRegister() {
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
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: subdomain || "",
      address: "",
      password: "",
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
          document.cookie = `tenant_subdomain=${encodeURIComponent(tenantValue)}; path=/; samesite=lax`;
        } catch {}
      }

      const resp = await coreApiRequest("/api/auth/customer/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          businessName: data.businessName,
          address: data.address,
          password: data.password,
        }),
      });

      const result = await resp.json();
      if (!result.success) {
        setError(result.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      router.push("/");
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
          Customer Registration
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
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
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
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="Acme Auto"
              {...register("businessName")}
            />
            {errors.businessName && (
              <p className="text-sm text-red-500">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              placeholder="123 Main St"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Registering..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
