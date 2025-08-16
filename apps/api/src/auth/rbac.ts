import type { Request, Response, NextFunction } from "express";

export type Role = "rivr_admin" | "business_owner" | "driver";

// Simple permission map; expand as needed
export const permissions: Record<Role, string[]> = {
  rivr_admin: [
    "admin:read",
    "admin:write",
    "business:read",
    "business:write",
    "driver:read",
    "driver:write",
  ],
  business_owner: [
    "business:read",
    "business:write",
    "driver:read",
    "driver:write",
    "pickup:read",
    "pickup:write",
  ],
  driver: ["driver:self", "pickup:read", "pickup:update_status"],
};

// Optional role inheritance (higher roles inherit from lower)
const roleInheritance: Partial<Record<Role, Role[]>> = {
  rivr_admin: ["business_owner", "driver"],
  business_owner: ["driver"],
};

function resolvePermissions(
  role: Role,
  visited: Set<Role> = new Set()
): Set<string> {
  if (visited.has(role)) return new Set();
  visited.add(role);
  const direct = new Set(permissions[role] ?? []);
  const parents = roleInheritance[role] ?? [];
  for (const parent of parents) {
    for (const perm of resolvePermissions(parent, visited)) {
      direct.add(perm);
    }
  }
  return direct;
}

export function hasPermission(role: Role, permission: string): boolean {
  return resolvePermissions(role).has(permission);
}

export function requirePermission(required: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role as Role | undefined;
    if (!role) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!hasPermission(role, required)) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }
    return next();
  };
}

export function requireTenantMatch() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.ENFORCE_TENANT !== "true") return next();
    const tokenTenant = req.user?.tenantId;
    const requestTenant = (req as any).businessId;
    if (
      typeof tokenTenant === "number" &&
      typeof requestTenant === "number" &&
      tokenTenant !== requestTenant
    ) {
      return res.status(403).json({
        success: false,
        message: "Token does not belong to this tenant",
      });
    }
    return next();
  };
}
