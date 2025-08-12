"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Edit, Copy } from "lucide-react";
import type { Driver } from "@/lib/schema";

interface DriversTabProps {
  drivers: Driver[];
  loadingDrivers: boolean;
  onAddDriver: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: number) => void;
  onCopyLink: (url: string) => void;
}

export function DriversTab({
  drivers,
  loadingDrivers,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
  onCopyLink,
}: DriversTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            Driver Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage driver profiles and access credentials
          </p>
        </div>
        <Button
          onClick={onAddDriver}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <Card className="bg-card border border-border shadow-sm">
        <div className="p-6">
          {loadingDrivers ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading drivers...</div>
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground mb-2">No drivers found</div>
              <div className="text-sm text-muted-foreground">
                Add your first driver to get started
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                      Driver ID
                    </th>
                    <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                      Name
                    </th>
                    <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                      Email
                    </th>
                    <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                      Phone
                    </th>

                    <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                      Status
                    </th>
                    <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver: Driver) => (
                    <tr key={driver.id} className="border-b border-border">
                      <td className="py-4 px-4">
                        <Badge className="bg-blue-100 text-blue-800 font-mono">
                          ID: {driver.id}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-foreground">
                          {driver.name}
                        </div>
                        {driver.licenseNumber && (
                          <div className="text-xs text-muted-foreground">
                            License: {driver.licenseNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-muted-foreground">
                          {driver.email}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-muted-foreground">
                          {driver.phone || "—"}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <Badge
                          className={`${
                            driver.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {driver.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              onCopyLink(
                                `${window.location.origin}/driver?id=${driver.id}`
                              )
                            }
                            variant="outline"
                            size="sm"
                            className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                          </Button>
                          <Button
                            onClick={() => onEditDriver(driver)}
                            variant="outline"
                            size="sm"
                            className="border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => onDeleteDriver(driver.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs"
                          >
                            <User className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">
              Driver Dashboard Access Instructions:
            </h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • Drivers access their dashboard using their account credentials
              </li>
              <li>• Share the dashboard link with the corresponding driver</li>
              <li>• Driver accounts are managed by admins in this panel</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
