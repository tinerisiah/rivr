"use client";
import { useState } from "react";
import { AdminPanelRefactored } from "./admin-panel-refactored";

export function BusinessAdminPanel() {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  return (
    <AdminPanelRefactored
      title="Business Admin Dashboard"
      subtitle="Manage your business operations and customers"
      showDriverLink={false}
      showCustomerLink={true}
      showBusinessesTab={false}
      driverLinkText=""
      customerLinkText="Customer Portal"
      customLogo={customLogo}
      onLogoChange={setCustomLogo}
    />
  );
}
