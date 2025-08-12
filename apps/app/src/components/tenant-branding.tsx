"use client";

import { useTenant } from "@/lib/tenant-context";
import { Badge } from "@/components/ui/badge";

export function TenantBranding() {
  const { subdomain, businessName } = useTenant();

  if (!subdomain) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        {businessName || subdomain}
      </Badge>
    </div>
  );
}

export function TenantHeader() {
  const { subdomain, businessName } = useTenant();

  if (!subdomain) {
    return null;
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {businessName || subdomain}
          </span>
        </div>
      </div>
    </div>
  );
}
