import { storage } from "./storage";
import type { PickupRequest, Route } from "@repo/schema";

interface OptimizedRoute {
  totalDistance: number;
  totalDuration: number;
  waypoints: Array<{
    id: number;
    address: string;
    businessName: string;
    latitude?: string;
    longitude?: string;
  }>;
}

class RouteOptimizer {
  async optimizeRoute(
    pickups: PickupRequest[],
    driverLocation?: { lat: number; lng: number }
  ): Promise<OptimizedRoute> {
    // Simplified route optimization - in a real implementation you'd use a proper routing service
    const waypoints = pickups.map((pickup, index) => ({
      id: pickup.id,
      address: pickup.address,
      businessName: pickup.businessName,
      latitude: pickup.latitude ?? undefined,
      longitude: pickup.longitude ?? undefined,
      order: index + 1,
    }));

    // Calculate estimated distance and duration (simplified)
    const totalDistance = waypoints.length * 5; // 5 miles per stop
    const totalDuration = waypoints.length * 15; // 15 minutes per stop

    return {
      totalDistance,
      totalDuration,
      waypoints,
    };
  }

  async createOptimizedRoute(
    pickupIds: number[],
    driverId?: number
  ): Promise<Route> {
    const pickups = await Promise.all(
      pickupIds.map((id) => storage.getPickupRequest(id))
    );

    const validPickups = pickups.filter(Boolean) as PickupRequest[];

    if (validPickups.length === 0) {
      throw new Error("No valid pickups found");
    }

    const optimizedRoute = await this.optimizeRoute(validPickups);

    const route = await storage.createRoute({
      name: `Route ${new Date().toISOString().split("T")[0]}`,
      driverId: driverId || null,
      status: "pending",
      totalDistance: optimizedRoute.totalDistance.toString(),
      estimatedDuration: optimizedRoute.totalDuration,
      optimizedWaypoints: JSON.stringify(optimizedRoute.waypoints),
    });

    // Assign pickups to the route
    await storage.assignPickupsToRoute(route.id, pickupIds);

    return route;
  }

  async getNextPickupLocation(
    routeId: number,
    completedPickupId: number
  ): Promise<{
    nextPickup?: PickupRequest;
    routeComplete: boolean;
  }> {
    const route = await storage.getRoute(routeId);
    if (!route) {
      throw new Error("Route not found");
    }

    const routePickups = await storage.getPickupsByRoute(routeId);
    const incompletePickups = routePickups.filter((p) => !p.isCompleted);

    if (incompletePickups.length === 0) {
      return { routeComplete: true };
    }

    // Find the next pickup (simplified - just return the first incomplete one)
    const nextPickup = incompletePickups[0];

    return {
      nextPickup,
      routeComplete: false,
    };
  }
}

export const routeOptimizer = new RouteOptimizer();
