"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  ChevronDown,
  Building2,
  Truck,
  User,
  LogOut,
  UserCircle,
  Shield,
  Crown,
} from "lucide-react";
import { Button } from "./button";
import { RivrLogo } from "../rivr-logo";
import { ThemeToggle } from "../theme-toggle";
import { TenantBranding } from "../tenant-branding";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface HeaderProps {
  className?: string;
  withPortalMenu?: boolean;
  minimal?: boolean;
}

export function Header({
  className = "",
  withPortalMenu = true,
  minimal = false,
}: HeaderProps) {
  const [showPortals, setShowPortals] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getUserDisplayName = () => {
    if (!user) return "";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.businessName) {
      return user.businessName;
    }
    return user.email;
  };

  const getPortalLink = () => {
    if (!user) return null;

    switch (user.role) {
      case "business_owner":
        return {
          href: "/business-admin",
          label: "Business Admin",
          icon: Settings,
        };
      case "driver":
        return {
          href: "/driver",
          label: "Driver Portal",
          icon: Truck,
        };
      case "rivr_admin":
        return {
          href: "/rivr-exec",
          label: "Admin Portal",
          icon: Shield,
        };
      default:
        return null;
    }
  };

  const portalLink = getPortalLink();

  return (
    <header className={`w-full ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div className="flex items-center w-full sm:w-auto">
          <RivrLogo size={minimal ? "sm" : "xl"} />
          <TenantBranding />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User Menu - Only show when authenticated */}
          {isAuthenticated && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  <UserCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">
                    {getUserDisplayName()}
                  </span>
                  <span className="sm:hidden">Account</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {user.role.replace("_", " ")}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Portal Link based on user role */}
                {portalLink && (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push(portalLink.href)}
                      className="text-primary focus:text-primary"
                    >
                      <portalLink.icon className="w-4 h-4 mr-2" />
                      {portalLink.label}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Portal Access - Only show when not authenticated or for admin users */}
          {withPortalMenu &&
            (!isAuthenticated || user?.role === "rivr_admin") && (
              <div className="relative w-full sm:w-auto">
                <Button
                  onClick={() => setShowPortals(!showPortals)}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted hover:text-foreground w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Portal Access</span>
                  <span className="sm:hidden">Portals</span>
                  <ChevronDown
                    className={`w-4 h-4 ml-2 transition-transform ${showPortals ? "rotate-180" : ""}`}
                  />
                </Button>

                {showPortals && (
                  <div className="absolute right-0 top-12 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-48 z-50">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => router.push("/business-admin")}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Business Portal
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => router.push("/rivr-exec")}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Portal
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => router.push("/driver")}
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Driver Portal
                    </Button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </header>
  );
}
