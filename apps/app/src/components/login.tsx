"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function Login() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome to RIVR
          </h1>
          <p className="text-muted-foreground">
            Choose your portal to get started
          </p>
        </div>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-card-foreground mb-2">
              Select Portal
            </CardTitle>
            <p className="text-muted-foreground">
              Choose your portal to get started
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push("/auth?role=business")}
              className="w-full h-12 text-lg"
            >
              Business Portal
            </Button>
            <Button
              onClick={() => router.push("/auth?role=driver")}
              variant="outline"
              className="w-full h-12 text-lg"
            >
              Driver Dashboard
            </Button>
            <Button
              onClick={() => router.push("/admin")}
              variant="outline"
              className="w-full h-12 text-lg"
            >
              Admin Panel
            </Button>
            <Button
              onClick={() => router.push("/rivr-exec")}
              variant="outline"
              className="w-full h-12 text-lg"
            >
              RIVR Executive
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>Need help? Contact support</p>
        </div>
      </div>
    </div>
  );
}
