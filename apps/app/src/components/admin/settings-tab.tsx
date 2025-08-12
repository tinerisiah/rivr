"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RivrLogo } from "@/components/rivr-logo";
import LogoUpload from "@/components/logo-upload";
import { Settings, Mail } from "lucide-react";

interface SettingsTabProps {
  customLogo: string | null;
  onLogoChange: (logo: string | null) => void;
  onEmailTemplatesClick: () => void;
  onEmailLogsClick: () => void;
}

export function SettingsTab({
  customLogo,
  onLogoChange,
  onEmailTemplatesClick,
  onEmailLogsClick,
}: SettingsTabProps) {
  return (
    <Card className="bg-card border border-border shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Business Settings
            </h3>
            <p className="text-sm text-muted-foreground">
              Customize your business branding and preferences
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Logo Customization Section */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-md font-medium text-foreground mb-4">
              Brand Logo
            </h4>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-shrink-0">
                <div className="text-sm text-muted-foreground mb-2">
                  Current Logo:
                </div>
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <RivrLogo size="md" customLogo={customLogo} />
                </div>
              </div>
              <div className="flex-1">
                <LogoUpload
                  onLogoChange={onLogoChange}
                  currentLogo={customLogo}
                />
                <div className="mt-3 text-sm text-muted-foreground">
                  Upload your business logo to customize the platform branding.
                  Recommended size: 400x100px (PNG, JPG, or SVG).
                </div>
              </div>
            </div>
          </div>

          {/* Email Automation Settings */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-md font-medium text-foreground mb-4">
              Email Automation
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Customer Email Updates
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically send email updates to customers throughout the
                    workflow
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={onEmailTemplatesClick}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Templates
                </Button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                  onClick={onEmailLogsClick}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  View Email Logs
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Customize email templates for customer workflow stages: Pending
                → In Process → Ready for Delivery
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-md font-medium text-foreground mb-2">
              Business Information
            </h4>
            <p className="text-sm text-muted-foreground">
              Additional business settings and preferences will be available
              here in future updates.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
