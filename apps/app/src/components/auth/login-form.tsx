"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../../hooks/use-toast";
import { useAuth } from "../../lib/auth";
import { useTenant } from "../../lib/tenant-context";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import Link from "next/link";

// Base schema for credentials. We conditionally extend it with `tenant`
// for non-admin logins so the tenant value is preserved by the resolver.
const baseLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type BaseLoginFormData = z.infer<typeof baseLoginSchema>;
type LoginFormData = BaseLoginFormData & { tenant?: string };

interface LoginFormProps {
  type: "business" | "rivr_admin" | "driver" | "employee";
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({
  type,
  onSuccess,
  onSwitchToRegister,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const { subdomain: detectedSubdomain, isExec, baseDomain } = useTenant();

  const hasSubdomain = !!detectedSubdomain;

  // Build schema based on login type. Business and driver require a tenant.
  const shouldRequireTenant = type !== "rivr_admin" && !hasSubdomain;
  const schema = shouldRequireTenant
    ? baseLoginSchema.extend({
        tenant: z.string().min(1, "Please enter your tenant (subdomain)"),
      })
    : baseLoginSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const tenantInput = (data.tenant || detectedSubdomain || "")
        .trim()
        .toLowerCase();
      if (tenantInput) {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem("tenant_subdomain", tenantInput);
            // Optional: also set a session cookie for consistency with other flows
            document.cookie = `tenant_subdomain=${encodeURIComponent(
              tenantInput
            )}; path=/; samesite=lax`;
          } catch {
            // ignore storage errors
          }
        }
      }
      const result = await login(
        { email: data.email, password: data.password },
        type
      );

      if (result.success) {
        toast({
          title: "Login Successful",
          description: `Welcome back!`,
        });
        reset();
        // Ensure access token cookie is set on base domain before potential cross-subdomain redirect
        try {
          if (typeof window !== "undefined" && result.accessToken) {
            const host = window.location.hostname.toLowerCase();
            const isSecure = window.location.protocol === "https:";
            const cookieParts: string[] = [
              `accessToken=${encodeURIComponent(result.accessToken)}`,
              "Path=/",
              "SameSite=Lax",
            ];
            if (
              baseDomain &&
              baseDomain.includes(".") &&
              (host === baseDomain || host.endsWith(`.${baseDomain}`))
            ) {
              cookieParts.push(`Domain=.${baseDomain}`);
            }
            if (isSecure) cookieParts.push("Secure");
            document.cookie = cookieParts.join("; ");
          }
        } catch {
          // ignore cookie write errors
        }
        // Redirect to tenant subdomain if provided and not already on it
        try {
          if (typeof window !== "undefined") {
            const currentHost = window.location.hostname.toLowerCase();
            const targetSub =
              (result as any)?.user?.subdomain?.toLowerCase?.() || tenantInput;
            if (
              targetSub &&
              baseDomain &&
              (currentHost === baseDomain ||
                !currentHost.endsWith(`.${baseDomain}`) ||
                !currentHost.startsWith(`${targetSub}.`))
            ) {
              const targetHost = `${targetSub}.${baseDomain}`;
              const userRole = (result as any)?.user?.role || type;
              const path =
                userRole === "driver"
                  ? "/driver"
                  : userRole === "employee_viewer" ||
                      userRole === "business_owner"
                    ? "/business-admin"
                    : "/";
              const protocol = window.location.protocol;
              window.location.href = `${protocol}//${targetHost}${path}`;
              return;
            }
          }
        } catch {
          // ignore redirect errors
        }
        onSuccess?.();
      } else {
        setError(result.message);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const { subdomain } = useTenant();

  const title =
    type === "business"
      ? "Business Login"
      : type === "rivr_admin"
        ? "Admin Login"
        : type === "employee"
          ? "Employee Login"
          : "Driver Login";
  const description =
    type === "business"
      ? "Sign in to your business account"
      : type === "rivr_admin"
        ? "Sign in to RIVR admin portal"
        : type === "employee"
          ? "Sign in to your employee account"
          : "Sign in to your driver account";

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {title}
        </CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {shouldRequireTenant && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Input
                id="tenant"
                type="text"
                placeholder="your-tenant"
                {...register("tenant")}
                className={errors.tenant ? "border-red-500" : ""}
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end -mt-2">
            <Link
              href="/auth/forgot"
              className="text-sm text-muted-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {!subdomain && type === "business" && onSwitchToRegister && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={onSwitchToRegister}
                >
                  Register here
                </Button>
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
