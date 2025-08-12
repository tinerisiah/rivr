# RIVR Multi-Tenant Authentication System

This document provides a comprehensive guide to the RIVR authentication system, which supports multi-tenant business accounts with role-based access control.

## Overview

The RIVR authentication system provides:

- **Multi-tenant support** with subdomain-based tenant isolation
- **Role-based access control** (RBAC) for different user types
- **JWT-based authentication** with access and refresh tokens
- **Secure password hashing** using bcrypt
- **Business registration** with subdomain validation
- **Admin portal** for RIVR platform management

## Architecture

### Backend Components

#### 1. Authentication Module (`auth.ts`)

- JWT token generation and validation
- Password hashing with bcrypt
- Authentication and authorization middleware
- Business owner and admin authentication functions
- Token refresh and logout functionality

#### 2. Authentication Routes (`auth-routes.ts`)

- RESTful API endpoints for authentication
- Login, registration, token refresh, and logout
- Protected route examples with role-based access

#### 3. Tenant Middleware (`tenant-middleware.ts`)

- Subdomain-based tenant resolution
- Business account validation
- Request context enrichment

### Frontend Components

#### 1. Authentication Context (`use-auth.tsx`)

- React context for authentication state management
- Custom hooks for authentication and authorization
- Token management and API request handling

#### 2. Authentication Components

- `LoginForm`: Business owner and admin login
- `RegisterForm`: Business registration with subdomain validation
- `ProtectedRoute`: Route protection with role-based access control

## Database Schema

### Multi-Tenant Tables

#### `businesses`

Multi-tenant business accounts with subscription management:

```sql
- id: Primary key
- businessName: Business name
- ownerFirstName, ownerLastName: Business owner details
- ownerEmail: Unique email for login
- subdomain: Unique subdomain (e.g., "acme-corp")
- databaseSchema: Isolated database schema name
- status: pending, active, suspended, canceled
- subscriptionPlan: starter, professional, enterprise
- subscriptionStatus: trial, active, past_due, canceled, suspended
- maxUsers, maxDrivers, maxCustomers: Plan limits
- monthlyRevenue, annualRevenue: Revenue tracking
```

#### `rivr_admins`

Platform administrators:

```sql
- id: Primary key
- firstName, lastName: Admin name
- email: Unique email for login
- password: Hashed password
- role: admin, super_admin
- isActive: Account status
- lastLoginAt: Last login timestamp
```

#### `users`

Legacy user accounts (for business owners):

```sql
- id: Primary key
- username: Email address
- password: Hashed password
```

## API Endpoints

### Authentication Endpoints

#### Business Owner Authentication

```
POST /api/auth/business/login
Content-Type: application/json

{
  "email": "john@acme-corp.com",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@acme-corp.com",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Acme Corp",
    "subdomain": "acme-corp",
    "role": "business_owner"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### RIVR Admin Authentication

```
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@rivr.com",
  "password": "adminpassword123"
}
```

#### Token Management

```
POST /api/auth/refresh
# Uses refresh token from HTTP-only cookie

POST /api/auth/logout
Authorization: Bearer <access_token>
# Clears refresh token cookie

GET /api/auth/profile
Authorization: Bearer <access_token>
# Returns current user profile
```

#### Business Registration

```
POST /api/auth/business/register
Content-Type: application/json

{
  "businessName": "Acme Corporation",
  "ownerFirstName": "John",
  "ownerLastName": "Doe",
  "ownerEmail": "john@acme-corp.com",
  "phone": "+1-555-0123",
  "address": "123 Business Ave, City, State 12345",
  "subdomain": "acme-corp",
  "password": "SecurePassword123!"
}
```

#### Protected Routes

```
GET /api/business/dashboard (business_owner role required)
GET /api/admin/dashboard (rivr_admin role required)
```

## Security Features

### 1. Password Security

- bcrypt hashing with 12 salt rounds
- Minimum 8 characters with complexity requirements
- Secure password validation

### 2. JWT Tokens

- Access tokens (24h expiry)
- Refresh tokens (7 days expiry)
- HTTP-only cookies for refresh tokens
- Secure token validation

### 3. Role-Based Access Control

- Fine-grained permission system
- Route-level protection
- Component-level authorization

### 4. Multi-Tenant Isolation

- Subdomain-based tenant resolution
- Database schema isolation
- Request context validation

## Frontend Integration

### 1. Setup Authentication Provider

Wrap your app with `AuthProvider`:

```tsx
import { AuthProvider } from "./lib/auth";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### 2. Use Authentication Hooks

```tsx
import { useAuth, useRequireRole } from "./lib/auth";

function MyComponent() {
  const { user, login, logout } = useAuth();
  const { hasRequiredRole } = useRequireRole(["business_owner"]);

  // Your component logic
}
```

### 3. Protected Routes

```tsx
import {
  BusinessOwnerRoute,
  AdminRoute,
} from "./components/auth/protected-route";

function App() {
  return (
    <Routes>
      <Route
        path="/business"
        element={
          <BusinessOwnerRoute>
            <BusinessDashboard />
          </BusinessOwnerRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd apps/api
pnpm add bcryptjs jsonwebtoken cookie-parser @types/bcryptjs @types/jsonwebtoken @types/cookie-parser
```

### 2. Environment Variables

Add to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
DATABASE_URL=your-neon-database-url
```

### 3. Database Setup

```bash
# Push database schema
pnpm db:push

# Setup authentication system
pnpm setup-auth
```

### 4. Start Development Server

```bash
# Start API server
cd apps/api
pnpm dev

# Start Next.js app
cd apps/app
pnpm dev
```

## Sample Credentials

After running the setup script, you'll have these test accounts:

### RIVR Admin

- Email: `admin@rivr.com`
- Password: `Admin123!`

### Business Owner

- Email: `john@demobusiness.com`
- Password: `Business123!`
- Subdomain: `demo-business.rivr.com`

### Drivers

PIN-based authentication has been removed. Drivers authenticate using email/password credentials.

### Seeding

Use the unified seed script:

```
pnpm --filter api seed          # full seed (auth + sample data)
pnpm --filter api seed:auth     # auth-only seed (admins, drivers, businesses)
```

Requires `DATABASE_URL` in `.env`.

### Customers

- Token 1: `demo-token-1`
- Token 2: `demo-token-2`

## Multi-Tenant Features

### Subdomain Routing

Each business gets a unique subdomain:

- `demo-business.rivr.com`
- `acme-corp.rivr.com`
- `fast-delivery.rivr.com`

### Tenant Isolation

- Separate database schemas per tenant
- Isolated data and configurations
- Custom branding and settings

### Subscription Management

- Trial periods (30 days)
- Multiple subscription plans
- Usage limits and billing

## Security Best Practices

### Security

1. Always use HTTPS in production
2. Rotate JWT secrets regularly
3. Implement rate limiting
4. Use secure cookie settings
5. Validate all inputs

### Performance

1. Implement token caching
2. Use database indexes on frequently queried fields
3. Optimize database queries
4. Use connection pooling

### Scalability

1. Use connection pooling
2. Implement horizontal scaling
3. Use CDN for static assets
4. Monitor performance metrics

## Troubleshooting

### Common Issues

#### 1. Token Expired

- Check JWT_EXPIRES_IN environment variable
- Implement automatic token refresh
- Clear localStorage and re-authenticate

#### 2. CORS Issues

- Ensure API server is running on correct port
- Check CORS configuration in server.ts
- Verify frontend API endpoint URLs

#### 3. Database Connection

- Verify DATABASE_URL environment variable
- Check database schema exists
- Ensure database user has proper permissions

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=true
```

## API Documentation

For detailed API documentation, see the individual route files:

- `auth-routes.ts` - Authentication endpoints
- `routes.ts` - Main application routes

## Support

For issues or questions about the authentication system:

1. Check the troubleshooting section
2. Review the API documentation
3. Contact the development team
4. Create an issue in the repository
