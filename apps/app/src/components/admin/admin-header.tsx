"use client";
import { Button } from "@/components/ui/button";
import { RivrLogo } from "@/components/rivr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Truck, ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  customLogo?: string | null;
  onLogout: () => void;
  showDriverLink?: boolean;
  showCustomerLink?: boolean;
  driverLinkText?: string;
  customerLinkText?: string;
}

export function AdminHeader({
  title,
  subtitle,
  customLogo,
  onLogout,
  showDriverLink = true,
  showCustomerLink = true,
  driverLinkText = "Driver Dashboard",
  customerLinkText = "Customer View",
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
        <RivrLogo size="md" customLogo={customLogo} />
        <div className="text-left flex-1">
          <h1 className="mobile-title text-foreground mb-1 tracking-wide">
            {title}
          </h1>
          <p className="text-muted-foreground mobile-caption tracking-wide">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mobile-flex-row w-full sm:w-auto flex gap-2 items-center">
        <ThemeToggle />
        {showDriverLink && (
          <Link href="/driver">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white mobile-button w-full sm:w-auto tap-highlight-none"
            >
              <Truck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{driverLinkText}</span>
              <span className="sm:hidden">Driver</span>
            </Button>
          </Link>
        )}
        {showCustomerLink && (
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white mobile-button w-full sm:w-auto tap-highlight-none"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{customerLinkText}</span>
            <span className="sm:hidden">Customer</span>
          </Button>
        )}
        <Button
          onClick={(e) => {
            e.preventDefault();
            console.log("Admin logout button clicked");
            onLogout();
          }}
          variant="outline"
          className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white mobile-button w-full sm:w-auto tap-highlight-none"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Logout</span>
        </Button>
      </div>
    </div>
  );
}
