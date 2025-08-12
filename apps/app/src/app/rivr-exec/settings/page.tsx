"use client";

import { AdminProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default function RivrExecSettingsPage() {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold">
                RIVR Exec Settings
              </h1>
            </div>
            <Link href="/rivr-exec">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>

          <Card className="p-4 sm:p-6 border border-border space-y-4">
            <h2 className="text-lg font-semibold">Portal Preferences</h2>
            <div className="text-sm text-muted-foreground">
              Manage RIVR Exec portal preferences. Hook into real settings
              later.
            </div>
          </Card>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
