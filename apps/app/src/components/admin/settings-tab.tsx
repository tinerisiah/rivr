"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RivrLogo } from "@/components/rivr-logo";
import LogoUpload from "@/components/logo-upload";
import { Settings, Mail } from "lucide-react";
import {
  getBusinessSettings,
  getBusinessInfo,
  updateBusinessInfo,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SettingsTabProps {
  customLogo: string | null;
  onLogoChange: (logo: string | null) => void;
  readOnly?: boolean;
  onEmailTemplatesClick: () => void;
  onEmailLogsClick: () => void;
}

export function SettingsTab({
  customLogo,
  onLogoChange,
  readOnly = false,
  onEmailTemplatesClick,
  onEmailLogsClick,
}: SettingsTabProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [bizLoading, setBizLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [savingBiz, setSavingBiz] = useState(false);

  // Load business settings on mount
  useEffect(() => {
    const loadBusinessSettings = async () => {
      try {
        setIsLoading(true);
        const response = await getBusinessSettings();
        if (response.success && response.settings?.customLogo) {
          onLogoChange(response.settings.customLogo);
        }
      } catch (error) {
        console.error("Failed to load business settings:", error);
        // Fallback to localStorage if API fails
        const savedLogo = localStorage.getItem("customLogo");
        if (savedLogo && onLogoChange) {
          onLogoChange(savedLogo);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessSettings();
  }, [onLogoChange]);

  // Load business info for Business Information section
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        setBizLoading(true);
        const resp = await getBusinessInfo();
        if (resp?.success && resp.business) {
          setBusinessName(resp.business.businessName || "");
          setPhone(resp.business.phone || "");
          setAddress(resp.business.address || "");
          // setCustomDomain(resp.business.customDomain || "");
        }
      } catch (e) {
        console.error("Failed to load business info", e);
      } finally {
        setBizLoading(false);
      }
    };
    loadBusinessInfo();
  }, []);

  const handleSaveBusinessInfo = async () => {
    try {
      setSavingBiz(true);
      const payload: any = {};
      if (businessName) payload.businessName = businessName;
      if (phone) payload.phone = phone;
      if (address) payload.address = address;
      // if (customDomain) payload.customDomain = customDomain;
      const resp = await updateBusinessInfo(payload);
      if (resp?.success) {
        toast({ title: "Saved", description: "Business information updated" });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed",
        description: "Could not update business information",
        variant: "destructive",
      });
    } finally {
      setSavingBiz(false);
    }
  };

  return (
    <Card className="bg-card border border-border shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
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
                  {isLoading ? (
                    <div className="w-24 h-16 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <RivrLogo size="md" customLogo={customLogo} />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <LogoUpload
                  onLogoChange={onLogoChange}
                  currentLogo={customLogo}
                  readOnly={readOnly}
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
                {!readOnly && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white"
                    onClick={onEmailTemplatesClick}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Templates
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted hover:text-foreground"
                    onClick={onEmailLogsClick}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    View Email Logs
                  </Button>
                )}
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
            {bizLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground">
                      Business Name
                    </Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      disabled={readOnly}
                      placeholder="Your business name"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={readOnly}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={readOnly}
                    rows={3}
                    className="resize-none"
                    placeholder="123 Main St\nCity, ST 12345"
                  />
                </div>
                {/* <div>
                  <Label className="text-muted-foreground">Custom Domain</Label>
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    disabled={readOnly}
                    placeholder="example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional. Contact support to complete DNS setup.
                  </p>
                </div> */}
                {!readOnly && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={handleSaveBusinessInfo}
                      disabled={savingBiz}
                    >
                      {savingBiz ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
