/**
 * Navigation utilities for cross-platform turn-by-turn navigation
 * Automatically detects device platform and opens the appropriate native maps app
 */

export interface NavigationPoint {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

export interface NavigationOptions {
  origin?: NavigationPoint;
  destination: NavigationPoint;
  waypoints?: NavigationPoint[];
  travelMode?: "driving" | "walking" | "transit";
}

/**
 * Device detection utilities
 */
export const DeviceDetection = {
  isIOS: (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  isMacOS: (): boolean => {
    return /Macintosh|Mac OS X/.test(navigator.userAgent);
  },

  isAndroid: (): boolean => {
    return /Android/.test(navigator.userAgent);
  },

  isMobile: (): boolean => {
    return /Mobi|Android/i.test(navigator.userAgent);
  },

  isStandalone: (): boolean => {
    return (
      (window.navigator as { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches
    );
  },

  getSafariVersion: (): number | null => {
    const match = navigator.userAgent.match(/Version\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  },
};

/**
 * Create Apple Maps URL for iOS devices with enhanced multi-point support
 */
function createAppleMapsUrl(options: NavigationOptions): string {
  const { origin, destination, waypoints, travelMode = "driving" } = options;

  // Prefer native scheme on iOS, use https on macOS for better browser compatibility
  const useNativeScheme = DeviceDetection.isIOS();
  let url = useNativeScheme
    ? "maps://maps.apple.com/?"
    : "https://maps.apple.com/?";
  const params: string[] = [];

  // Set origin if provided
  if (origin) {
    if (origin.address) {
      params.push(`saddr=${encodeURIComponent(origin.address)}`);
    } else {
      params.push(`saddr=${origin.lat},${origin.lng}`);
    }
  }

  // Set destination
  if (destination.address) {
    params.push(`daddr=${encodeURIComponent(destination.address)}`);
  } else {
    params.push(`daddr=${destination.lat},${destination.lng}`);
  }

  // Enhanced waypoint support for Apple Maps - create individual stop points
  if (waypoints && waypoints.length > 0) {
    waypoints.forEach((waypoint, index) => {
      const waypointStr = waypoint.address
        ? encodeURIComponent(waypoint.address)
        : `${waypoint.lat},${waypoint.lng}`;

      // Add each waypoint as both a waypoint and destination for comprehensive routing
      params.push(`wayp${index}=${waypointStr}`);
      params.push(`daddr=${waypointStr}`);
    });
  }

  // Set travel mode
  const appleModes: Record<string, string> = {
    driving: "d",
    walking: "w",
    transit: "r",
  };
  params.push(`dirflg=${appleModes[travelMode] || "d"}`);

  // Enable navigation mode for turn-by-turn directions
  params.push("nav=1");

  // Set map type to standard
  params.push("t=m");

  return url + params.join("&");
}

/**
 * Create enhanced Apple Maps URL with all pickup locations as individual stops
 */
function createAppleMapsMultiStopUrl(
  currentLocation: NavigationPoint | null,
  pickupLocations: NavigationPoint[]
): string {
  // Prefer native scheme on iOS, use https on macOS for better browser compatibility
  const useNativeScheme = DeviceDetection.isIOS();
  let url = useNativeScheme
    ? "maps://maps.apple.com/?"
    : "https://maps.apple.com/?";
  const params: string[] = [];

  // Set starting location
  if (currentLocation) {
    if (currentLocation.address) {
      params.push(`saddr=${encodeURIComponent(currentLocation.address)}`);
    } else {
      params.push(`saddr=${currentLocation.lat},${currentLocation.lng}`);
    }
  }

  // Add each pickup location as a separate destination parameter
  // This creates individual waypoints that Apple Maps will navigate through sequentially
  pickupLocations.forEach((pickup, index) => {
    const destination = pickup.address
      ? encodeURIComponent(pickup.address)
      : `${pickup.lat},${pickup.lng}`;

    // For Apple Maps, we can add multiple daddr parameters to create a multi-stop route
    params.push(`daddr=${destination}`);

    // Also add waypoint parameter for better route planning
    if (index < pickupLocations.length - 1) {
      params.push(`wayp=${destination}`);
    }
  });

  // Set driving mode for delivery routes
  params.push("dirflg=d");

  // Enable navigation mode
  params.push("nav=1");

  // Set map type to standard
  params.push("t=m");

  return url + params.join("&");
}

/**
 * Create Google Maps URL for Android and web
 */
function createGoogleMapsUrl(options: NavigationOptions): string {
  const { origin, destination, waypoints, travelMode = "driving" } = options;

  let url = "https://www.google.com/maps/dir/?api=1";
  const params: string[] = [];

  // Set origin if provided
  if (origin) {
    if (origin.address) {
      params.push(`origin=${encodeURIComponent(origin.address)}`);
    } else {
      params.push(`origin=${origin.lat},${origin.lng}`);
    }
  }

  // Set destination
  if (destination.address) {
    params.push(`destination=${encodeURIComponent(destination.address)}`);
  } else {
    params.push(`destination=${destination.lat},${destination.lng}`);
  }

  // Add waypoints
  if (waypoints && waypoints.length > 0) {
    const waypointStrings = waypoints.map((wp) =>
      wp.address ? encodeURIComponent(wp.address) : `${wp.lat},${wp.lng}`
    );
    params.push(`waypoints=${waypointStrings.join("|")}`);
  }

  // Set travel mode
  params.push(`travelmode=${travelMode}`);

  // Enable navigation mode
  params.push("dir_action=navigate");

  if (params.length > 0) {
    url += "&" + params.join("&");
  }

  return url;
}

/**
 * Create Waze URL as alternative for advanced navigation
 */
function createWazeUrl(options: NavigationOptions): string {
  const { destination } = options;

  if (destination.address) {
    return `https://waze.com/ul?q=${encodeURIComponent(destination.address)}&navigate=yes`;
  } else {
    return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
  }
}

/**
 * Main navigation function that automatically selects the best maps app
 */
export function openNativeNavigation(options: NavigationOptions): void {
  const { isIOS, isAndroid, isMobile } = DeviceDetection;

  let navigationUrl: string;

  if (isIOS() || DeviceDetection.isMacOS()) {
    // Use Apple Maps on iOS for better integration
    navigationUrl = createAppleMapsUrl(options);

    // Fallback to Google Maps if Apple Maps fails to open
    const fallbackUrl = createGoogleMapsUrl(options);

    // Try to open Apple Maps using different methods for better compatibility
    try {
      // Method 1: Try direct location change (works best on iOS Safari)
      if (
        (window.navigator as { standalone?: boolean }).standalone ||
        /CriOS/.test(navigator.userAgent) ||
        /FxiOS/.test(navigator.userAgent)
      ) {
        window.location.href = navigationUrl;
      } else {
        // Method 2: Try opening in new window first, then fallback
        const mapWindow = window.open(navigationUrl, "_blank");

        // If popup blocked or failed, try location.href
        if (
          !mapWindow ||
          mapWindow.closed ||
          typeof mapWindow.closed === "undefined"
        ) {
          window.location.href = navigationUrl;
        }
      }

      // Provide a delayed fallback only on iOS (not macOS) to avoid opening Google Maps web
      if (isIOS() && !DeviceDetection.isMacOS()) {
        setTimeout(() => {
          const stillOnPage =
            document.visibilityState === "visible" && document.hasFocus();
          if (stillOnPage) {
            window.open(fallbackUrl, "_blank");
          }
        }, 3000);
      }
    } catch (error) {
      // Apple Maps failed, fallback to Google Maps
      window.open(fallbackUrl, "_blank");
    }
  } else if (isAndroid()) {
    // Use Google Maps on Android (usually pre-installed)
    navigationUrl = createGoogleMapsUrl(options);
    window.location.href = navigationUrl;
  } else {
    // For desktop/web, open Google Maps in new tab
    navigationUrl = createGoogleMapsUrl(options);
    window.open(navigationUrl, "_blank");
  }
}

/**
 * Get multiple navigation options for user choice
 */
export function getNavigationOptions(options: NavigationOptions): Array<{
  name: string;
  url: string;
  icon: string;
  primary: boolean;
}> {
  const { isIOS, isAndroid } = DeviceDetection;

  const navigationOptions = [];

  // Add primary option based on platform
  if (isIOS()) {
    navigationOptions.push({
      name: "Apple Maps",
      url: createAppleMapsUrl(options),
      icon: "🗺️",
      primary: true,
    });
    navigationOptions.push({
      name: "Google Maps",
      url: createGoogleMapsUrl(options),
      icon: "🌍",
      primary: false,
    });
  } else {
    navigationOptions.push({
      name: "Google Maps",
      url: createGoogleMapsUrl(options),
      icon: "🌍",
      primary: true,
    });
    if (isAndroid()) {
      navigationOptions.push({
        name: "Apple Maps",
        url: createAppleMapsUrl(options),
        icon: "🗺️",
        primary: false,
      });
    }
  }

  // Add Waze as alternative
  navigationOptions.push({
    name: "Waze",
    url: createWazeUrl(options),
    icon: "🚗",
    primary: false,
  });

  return navigationOptions;
}

/**
 * Create Apple Maps URL for multiple pickup route
 */
export function createAppleMapsRouteUrl(
  currentLocation: NavigationPoint | null,
  pickupLocations: NavigationPoint[]
): string {
  // Prefer native scheme on iOS, use https on macOS for better browser compatibility
  const useNativeScheme = DeviceDetection.isIOS();
  let url = useNativeScheme
    ? "maps://maps.apple.com/?"
    : "https://maps.apple.com/?";
  const params: string[] = [];

  // Set starting location
  if (currentLocation) {
    if (currentLocation.address) {
      params.push(`saddr=${encodeURIComponent(currentLocation.address)}`);
    } else {
      params.push(`saddr=${currentLocation.lat},${currentLocation.lng}`);
    }
  }

  // Add all pickup locations as destinations
  pickupLocations.forEach((pickup, index) => {
    if (pickup.address) {
      params.push(`daddr=${encodeURIComponent(pickup.address)}`);
    } else {
      params.push(`daddr=${pickup.lat},${pickup.lng}`);
    }
  });

  // Set driving mode
  params.push("dirflg=d");
  params.push("t=m"); // Map type

  return url + params.join("&");
}

/**
 * Create Google Maps URL for multiple pickup route
 */
export function createGoogleMapsRouteUrl(
  currentLocation: NavigationPoint | null,
  pickupLocations: NavigationPoint[]
): string {
  let url = "https://www.google.com/maps/dir/";

  // Add starting location
  if (currentLocation) {
    if (currentLocation.address) {
      url += encodeURIComponent(currentLocation.address) + "/";
    } else {
      url += `${currentLocation.lat},${currentLocation.lng}/`;
    }
  }

  // Add all pickup locations as waypoints
  pickupLocations.forEach((pickup) => {
    if (pickup.address) {
      url += encodeURIComponent(pickup.address) + "/";
    } else {
      url += `${pickup.lat},${pickup.lng}/`;
    }
  });

  // Add parameters for navigation
  url += "?travelmode=driving&dir_action=navigate";

  return url;
}

/**
 * Create optimized route with multiple waypoints
 */
export function openOptimizedRouteNavigation(
  startLocation: NavigationPoint,
  destinations: NavigationPoint[],
  travelMode: "driving" | "walking" | "transit" = "driving"
): void {
  if (destinations.length === 0) {
    return;
  }

  if (destinations.length === 1) {
    // Single destination - direct navigation
    openNativeNavigation({
      origin: startLocation,
      destination: destinations[0],
      travelMode,
    });
  } else {
    // Multiple destinations - use enhanced multi-stop navigation
    const { isIOS } = DeviceDetection;

    if (isIOS() || DeviceDetection.isMacOS()) {
      // Use enhanced Apple Maps multi-stop URL for iOS
      const appleMapsUrl = createAppleMapsMultiStopUrl(
        startLocation,
        destinations
      );
      window.location.href = appleMapsUrl;
    } else {
      // Use Google Maps for Android/Web with waypoint optimization
      const [firstDestination, ...waypoints] = destinations;

      openNativeNavigation({
        origin: startLocation,
        destination: firstDestination,
        waypoints: waypoints.slice(0, 8), // Limit waypoints for compatibility
        travelMode,
      });
    }
  }
}

/**
 * Open Apple Maps with all pickup locations as individual stops for comprehensive navigation
 */
export function openAppleMapsWithAllPickups(
  currentLocation: NavigationPoint | null,
  pickupLocations: NavigationPoint[]
): void {
  if (pickupLocations.length === 0) {
    return;
  }

  const appleMapsUrl = createAppleMapsMultiStopUrl(
    currentLocation,
    pickupLocations
  );
  const googleMapsUrl = createGoogleMapsUrl({
    origin: currentLocation || undefined,
    destination: pickupLocations[pickupLocations.length - 1],
    waypoints: pickupLocations.slice(0, -1),
    travelMode: "driving",
  });

  if (DeviceDetection.isIOS() || DeviceDetection.isMacOS()) {
    try {
      // Enhanced iOS detection and opening method
      const isStandalone = (window.navigator as { standalone?: boolean })
        .standalone;
      const isSafari =
        /Safari/.test(navigator.userAgent) &&
        !/CriOS|FxiOS/.test(navigator.userAgent);

      if (isStandalone || isSafari) {
        // For Safari or standalone web apps, use location.href
        window.location.href = appleMapsUrl;
      } else {
        // For other iOS browsers, try window.open first
        const mapWindow = window.open(appleMapsUrl, "_blank");

        if (!mapWindow) {
          window.location.href = appleMapsUrl;
        }
      }

      // Attempting to open Apple Maps with multiple pickup locations as individual stops

      // Only provide fallback on iOS (not macOS) to avoid opening Google Maps web
      if (DeviceDetection.isIOS() && !DeviceDetection.isMacOS()) {
        setTimeout(() => {
          const stillOnPage =
            document.visibilityState === "visible" && document.hasFocus();
          if (stillOnPage) {
            window.open(googleMapsUrl, "_blank");
          }
        }, 3000);
      }
    } catch (error) {
      // Error opening Apple Maps, using fallback
      window.open(googleMapsUrl, "_blank");
    }
  } else {
    // For non-iOS devices, always use Google Maps
    // Opening Google Maps for non-iOS device
    window.open(googleMapsUrl, "_blank");
  }
}

/**
 * Get current device location for navigation origin
 */
export function getCurrentLocationForNavigation(): Promise<NavigationPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache for 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: "Current Location",
        });
      },
      (error) => {
        reject(new Error(`Location error: ${error.message}`));
      },
      options
    );
  });
}

/**
 * Quick navigation to address with automatic location detection
 */
export async function navigateToAddress(
  address: string,
  useCurrentLocation: boolean = true
): Promise<void> {
  const destination: NavigationPoint = {
    lat: 0, // Will be ignored if address is provided
    lng: 0,
    address,
    name: address,
  };

  if (useCurrentLocation) {
    try {
      const currentLocation = await getCurrentLocationForNavigation();
      openNativeNavigation({
        origin: currentLocation,
        destination,
        travelMode: "driving",
      });
    } catch (error) {
      // Could not get current location, using destination-only navigation
      openNativeNavigation({
        destination,
        travelMode: "driving",
      });
    }
  } else {
    openNativeNavigation({
      destination,
      travelMode: "driving",
    });
  }
}
