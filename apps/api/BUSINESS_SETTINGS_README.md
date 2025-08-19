# Business Settings API

This document describes the new business settings functionality that allows businesses to customize their branding and preferences.

## Overview

The business settings system provides a way for each business tenant to store and manage:
- Custom logos
- Branding preferences
- Email settings
- Notification preferences

## Database Schema

### Main Database Table
```sql
CREATE TABLE business_settings (
  id serial PRIMARY KEY,
  business_id integer NOT NULL REFERENCES businesses(id),
  custom_logo text,
  custom_branding text,
  email_settings text,
  notification_settings text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
```

### Tenant Schema Table
Each tenant schema also has a `business_settings` table for tenant-specific configuration.

## API Endpoints

### GET /api/admin/business-settings
Retrieves the current business settings for the authenticated business.

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Subdomain: <subdomain>`

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "businessId": 123,
    "customLogo": "data:image/png;base64,...",
    "customBranding": null,
    "emailSettings": null,
    "notificationSettings": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /api/admin/business-settings
Updates the business settings.

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Subdomain: <subdomain>`

**Body:**
```json
{
  "customLogo": "data:image/png;base64,...",
  "customBranding": "{\"primaryColor\": \"#007bff\"}",
  "emailSettings": "{\"autoSend\": true}",
  "notificationSettings": "{\"pushNotifications\": true}"
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "businessId": 123,
    "customLogo": "data:image/png;base64,...",
    "customBranding": "{\"primaryColor\": \"#007bff\"}",
    "emailSettings": "{\"autoSend\": true}",
    "notificationSettings": "{\"pushNotifications\": true}",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "message": "Business settings updated successfully"
}
```

## Setup Instructions

### 1. Run Database Migration
```bash
cd apps/api
pnpm ts-node src/scripts/migrate-business-settings.ts
```

### 2. Update Existing Tenants
For existing tenants, the `business_settings` table will be created automatically when they access the settings.

### 3. Frontend Integration
The frontend components have been updated to use the API instead of localStorage:

- `LogoUpload` component now saves to the backend
- `SettingsTab` loads settings from the API on mount
- Fallback to localStorage if API calls fail

## Frontend Usage

### Logo Upload
```tsx
import LogoUpload from "@/components/logo-upload";

<LogoUpload
  onLogoChange={(logo) => setCustomLogo(logo)}
  currentLogo={customLogo}
/>
```

### Loading Settings
```tsx
import { getBusinessSettings } from "@/lib/api";

useEffect(() => {
  const loadSettings = async () => {
    try {
      const response = await getBusinessSettings();
      if (response.success && response.settings?.customLogo) {
        setCustomLogo(response.settings.customLogo);
      }
    } catch (error) {
      // Fallback to localStorage
      const savedLogo = localStorage.getItem("customLogo");
      if (savedLogo) setCustomLogo(savedLogo);
    }
  };
  
  loadSettings();
}, []);
```

## Security

- All endpoints require authentication
- Business settings are scoped to the authenticated business
- Tenants can only access their own settings
- Admin users can access all business settings

## Error Handling

The system includes comprehensive error handling:
- API failures fall back to localStorage
- Toast notifications for success/error states
- Loading states during API calls
- Graceful degradation if settings can't be loaded

## Future Enhancements

- Logo file upload to cloud storage (S3, etc.)
- Image optimization and resizing
- Brand color schemes
- Custom CSS injection
- Email template customization
- Advanced notification preferences
