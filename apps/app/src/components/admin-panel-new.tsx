"use client";
import { useState } from "react";
import { AdminPanelRefactored } from "./admin-panel-refactored";

export function AdminPanel() {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  return (
    <AdminPanelRefactored
      title="Admin Dashboard"
      subtitle="Manage customers and pickup requests"
      showDriverLink={true}
      showCustomerLink={true}
      driverLinkText="Driver Dashboard"
      customerLinkText="Customer View"
      customLogo={customLogo}
      onLogoChange={setCustomLogo}
    />
  );
}
