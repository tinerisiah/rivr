# Admin Panel Components

This directory contains the refactored admin panel components that have been split into smaller, reusable pieces.

## Components

### Core Components

- **`AdminHeader`** - Reusable header component with logo, title, and action buttons
- **`AdminTabs`** - Reusable tabs component for navigation
- **`AdminPanelRefactored`** - Main admin panel component that orchestrates all sub-components

### Tab Components

- **`OverviewTab`** - Dashboard overview with statistics and production pipeline
- **`CustomersTab`** - Customer CRM with search, filtering, and management
- **`DriversTab`** - Driver management with CRUD operations
- **`ProductionTab`** - Production workflow management with status updates
- **`QuotesTab`** - Quote request management and responses
- **`SettingsTab`** - Business settings and configuration

## Usage

### Basic Admin Panel

```tsx
import { AdminPanel } from "@/components/admin-panel-new";

export default function AdminPage() {
  return <AdminPanel />;
}
```

### Business Admin Panel

```tsx
import { BusinessAdminPanel } from "@/components/business-admin-panel";

export default function BusinessAdminPage() {
  return <BusinessAdminPanel />;
}
```

### Custom Admin Panel

```tsx
import { AdminPanelRefactored } from "@/components/admin-panel-refactored";

export default function CustomAdminPage() {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  return (
    <AdminPanelRefactored
      title="Custom Admin Dashboard"
      subtitle="Custom subtitle"
      showDriverLink={false}
      showCustomerLink={true}
      driverLinkText=""
      customerLinkText="Customer Portal"
      customLogo={customLogo}
      onLogoChange={setCustomLogo}
    />
  );
}
```

## Props

### AdminPanelRefactored Props

- `title?: string` - Dashboard title (default: "Admin Dashboard")
- `subtitle?: string` - Dashboard subtitle (default: "Manage customers and pickup requests")
- `showDriverLink?: boolean` - Show driver dashboard link (default: true)
- `showCustomerLink?: boolean` - Show customer view link (default: true)
- `driverLinkText?: string` - Driver link text (default: "Driver Dashboard")
- `customerLinkText?: string` - Customer link text (default: "Customer View")
- `customLogo?: string | null` - Custom logo URL
- `onLogoChange?: (logo: string | null) => void` - Logo change handler

## Benefits of Refactoring

1. **Reusability** - Components can be used in different admin panels
2. **Maintainability** - Smaller, focused components are easier to maintain
3. **Testability** - Individual components can be tested in isolation
4. **Flexibility** - Easy to customize for different use cases
5. **Performance** - Better code splitting and lazy loading opportunities

## Migration

The original `admin-panel.tsx` has been replaced with a much simpler version that uses the refactored components. The business admin panel now reuses the same structure with different configuration.

## File Structure

```
admin/
├── index.ts                 # Export all components
├── README.md               # This documentation
├── admin-header.tsx        # Header component
├── admin-tabs.tsx          # Tabs navigation
├── overview-tab.tsx        # Overview dashboard
├── customers-tab.tsx       # Customer management
├── drivers-tab.tsx         # Driver management
├── production-tab.tsx      # Production workflow
├── quotes-tab.tsx          # Quote management
└── settings-tab.tsx        # Settings and configuration
```
