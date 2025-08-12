"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  address: string;
}

export function PickupWidget() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for token in URL params or localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get("token");

      if (tokenFromUrl) {
        setCustomerToken(tokenFromUrl);
        localStorage.setItem("customerToken", tokenFromUrl);
        // Clear the token from URL for cleaner look
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } else {
        const stored = localStorage.getItem("customerToken");
        if (stored) {
          setCustomerToken(stored);
        }
      }
    }
  }, []);

  const handlePickupClick = async () => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show success message
      alert("Pickup request sent successfully!");
    } catch (error) {
      alert("Failed to send pickup request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuoteRequest = () => {
    alert("Quote request feature coming soon!");
  };

  const getStatusText = () => {
    if (userInfo) {
      return `Ready for ${userInfo.firstName} ${userInfo.lastName}`;
    }
    return "Ready for pickup request";
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"></div>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        <Card className="bg-card rounded-2xl shadow-2xl p-8 text-center border border-border shadow-primary/10">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-card-foreground mb-2 tracking-wide">
              SERVICE REQUEST
            </h2>
            <p className="text-sm text-muted-foreground uppercase tracking-widest">
              Click to request service
            </p>
          </div>

          {/* Main Pickup Button */}
          <div className="mb-8">
            <Button
              onClick={handlePickupClick}
              disabled={isLoading}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-bold text-lg shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "PICKUP"
              )}
            </Button>
          </div>

          {/* Status Display */}
          <div className="text-sm text-muted-foreground mb-6">
            <span className="uppercase tracking-wide font-medium">
              {getStatusText()}
            </span>
          </div>

          {/* Quote Request Button */}
          <div className="mb-6">
            <Button
              onClick={handleQuoteRequest}
              variant="outline"
              className="border-border text-foreground hover:bg-muted hover:text-primary hover:border-primary transition-all"
            >
              <FileText className="w-4 h-4 mr-2" />
              REQUEST A QUOTE
            </Button>
          </div>

          {/* Back Button */}
          <div className="mb-4">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Admin Link */}
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors opacity-50 hover:opacity-100"
            >
              admin
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
