"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { useAuth, RegisterBusinessData } from "../../lib/auth";
import { buildApiUrl } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useRouter } from "next/navigation";

const registerSchema = z
  .object({
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters"),
    ownerFirstName: z
      .string()
      .min(2, "First name must be at least 2 characters"),
    ownerLastName: z.string().min(2, "Last name must be at least 2 characters"),
    ownerEmail: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    address: z.string().optional(),
    subdomain: z
      .string()
      .min(3, "Subdomain must be at least 3 characters")
      .max(63, "Subdomain must be less than 63 characters")
      .regex(
        /^[a-z0-9-]+$/,
        "Subdomain can only contain lowercase letters, numbers, and hyphens"
      )
      .refine(
        (val) => !val.startsWith("-") && !val.endsWith("-"),
        "Subdomain cannot start or end with a hyphen"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subdomainStatus, setSubdomainStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const { registerBusiness, login, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [successOpen, setSuccessOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [registeredInfo, setRegisteredInfo] = useState<{
    businessName: string;
    subdomain: string;
    ownerEmail: string;
    password: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchedSubdomain = watch("subdomain");

  // Check subdomain availability
  React.useEffect(() => {
    const checkSubdomain = async () => {
      if (!watchedSubdomain || watchedSubdomain.length < 3) {
        setSubdomainStatus("idle");
        return;
      }

      setSubdomainStatus("checking");

      try {
        const resp = await fetch(
          buildApiUrl(
            `/api/auth/subdomain-available?sub=${encodeURIComponent(watchedSubdomain)}`
          ),
          { credentials: "include" }
        );
        if (!resp.ok) throw new Error("check failed");
        const data = await resp.json();
        setSubdomainStatus(data.available ? "available" : "taken");
      } catch (error) {
        setSubdomainStatus("idle");
      }
    };

    const timeoutId = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedSubdomain]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);

      if (subdomainStatus === "taken") {
        setError("This subdomain is already taken. Please choose another one.");
        return;
      }

      const registerData: RegisterBusinessData = {
        businessName: data.businessName,
        ownerFirstName: data.ownerFirstName,
        ownerLastName: data.ownerLastName,
        ownerEmail: data.ownerEmail,
        phone: data.phone,
        address: data.address,
        subdomain: data.subdomain,
        password: data.password,
      };

      const result = await registerBusiness(registerData);

      if (result.success) {
        // Persist tenant for subsequent API calls
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tenant_subdomain", data.subdomain);
        }
        // Prepare modal and auto-redirect flow
        setRegisteredInfo({
          businessName: data.businessName,
          subdomain: data.subdomain,
          ownerEmail: data.ownerEmail,
          password: data.password,
        });
        setSuccessOpen(true);
        reset();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const continueToPortal = async () => {
    if (!registeredInfo) return;
    try {
      setIsRedirecting(true);
      // Attempt automatic login as business owner
      const loginResp = await login(
        { email: registeredInfo.ownerEmail, password: registeredInfo.password },
        "business"
      );
      if (!loginResp.success) {
        toast({
          title: "Auto-login failed",
          description: "Please sign in with your credentials",
          variant: "destructive",
        });
        router.push("/auth?role=business_owner");
        return;
      }
      router.push("/business");
    } finally {
      setIsRedirecting(false);
      setSuccessOpen(false);
    }
  };

  const getSubdomainStatusIcon = () => {
    switch (subdomainStatus) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "available":
        return <Check className="h-4 w-4 text-green-500" />;
      case "taken":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getSubdomainStatusText = () => {
    switch (subdomainStatus) {
      case "checking":
        return "Checking availability...";
      case "available":
        return "Subdomain available";
      case "taken":
        return "Subdomain already taken";
      default:
        return "";
    }
  };

  return (
    <>
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to RIVR</DialogTitle>
            <DialogDescription>
              {registeredInfo?.businessName} has been registered. Your portal is
              ready at {registeredInfo?.subdomain}.rivr.com
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={continueToPortal} disabled={isRedirecting}>
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Continue to Business Portal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Business Registration
          </CardTitle>
          <CardDescription className="text-center">
            Create your business account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Enter your business name"
                {...register("businessName")}
                className={errors.businessName ? "border-red-500" : ""}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName">First Name</Label>
                <Input
                  id="ownerFirstName"
                  placeholder="First name"
                  {...register("ownerFirstName")}
                  className={errors.ownerFirstName ? "border-red-500" : ""}
                />
                {errors.ownerFirstName && (
                  <p className="text-sm text-red-500">
                    {errors.ownerFirstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerLastName">Last Name</Label>
                <Input
                  id="ownerLastName"
                  placeholder="Last name"
                  {...register("ownerLastName")}
                  className={errors.ownerLastName ? "border-red-500" : ""}
                />
                {errors.ownerLastName && (
                  <p className="text-sm text-red-500">
                    {errors.ownerLastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="Enter your email"
                {...register("ownerEmail")}
                className={errors.ownerEmail ? "border-red-500" : ""}
              />
              {errors.ownerEmail && (
                <p className="text-sm text-red-500">
                  {errors.ownerEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="Enter your business address"
                {...register("address")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="relative">
                <Input
                  id="subdomain"
                  placeholder="your-business"
                  {...register("subdomain")}
                  className={errors.subdomain ? "border-red-500" : ""}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  {getSubdomainStatusIcon()}
                </div>
              </div>
              {errors.subdomain && (
                <p className="text-sm text-red-500">
                  {errors.subdomain.message}
                </p>
              )}
              {subdomainStatus !== "idle" && (
                <p
                  className={`text-sm ${
                    subdomainStatus === "available"
                      ? "text-green-500"
                      : subdomainStatus === "taken"
                        ? "text-red-500"
                        : "text-blue-500"
                  }`}
                >
                  {getSubdomainStatusText()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Your business will be accessible at:{" "}
                {watchedSubdomain
                  ? `${watchedSubdomain}.rivr.com`
                  : "your-subdomain.rivr.com"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
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
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || subdomainStatus === "taken"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Business Account"
              )}
            </Button>

            {onSwitchToLogin && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-semibold"
                    onClick={onSwitchToLogin}
                  >
                    Sign in here
                  </Button>
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
