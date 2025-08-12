export interface FrontendDebugContext {
  component?: string;
  action?: string;
  userId?: number;
  customerId?: number;
  driverId?: number;
  metadata?: Record<string, unknown>;
}

class FrontendDebugLogger {
  private static instance: FrontendDebugLogger;
  private logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    context?: FrontendDebugContext;
  }> = [];
  private maxLogs = 500;

  static getInstance(): FrontendDebugLogger {
    if (!FrontendDebugLogger.instance) {
      FrontendDebugLogger.instance = new FrontendDebugLogger();
    }
    return FrontendDebugLogger.instance;
  }

  private formatMessage(
    level: string,
    message: string,
    context?: FrontendDebugContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  log(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    context?: FrontendDebugContext
  ) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    // Store in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Structured logging for production - no console output
  }

  info(message: string, context?: FrontendDebugContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: FrontendDebugContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: FrontendDebugContext) {
    this.log("error", message, context);
  }

  debug(message: string, context?: FrontendDebugContext) {
    this.log("debug", message, context);
  }

  // Get recent logs for debugging purposes
  getRecentLogs(limit = 50): Array<{
    timestamp: Date;
    level: string;
    message: string;
    context?: FrontendDebugContext;
  }> {
    return this.logs.slice(-limit);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Performance timing utility
  startTimer(name: string): () => void {
    const start = Date.now();
    this.debug(`Timer started: ${name}`);

    return () => {
      const duration = Date.now() - start;
      this.info(`Timer ${name}: ${duration}ms`);
    };
  }
}

export const frontendDebugLogger = FrontendDebugLogger.getInstance();

// API request debugging wrapper
export function debugApiRequest(
  method: string,
  url: string,
  data?: unknown,
  component?: string
) {
  frontendDebugLogger.info(`API ${method.toUpperCase()} request`, {
    component: component || "api",
    action: "request",
    metadata: {
      url,
      method,
      dataSize: data ? JSON.stringify(data).length : 0,
    },
  });
}

export function debugApiResponse(
  method: string,
  url: string,
  response: Response,
  data?: unknown,
  component?: string
) {
  frontendDebugLogger.info(`API ${method.toUpperCase()} response`, {
    component: component || "api",
    action: "response",
    metadata: {
      url,
      method,
      status: response.status,
      ok: response.ok,
      dataSize: data ? JSON.stringify(data).length : 0,
    },
  });
}

// Component lifecycle debugging
export function debugComponentMount(
  componentName: string,
  props?: Record<string, unknown>
) {
  frontendDebugLogger.debug(`Component mounted: ${componentName}`, {
    component: componentName,
    action: "mount",
    metadata: props ? { propsCount: Object.keys(props).length } : undefined,
  });
}

export function debugComponentUnmount(componentName: string) {
  frontendDebugLogger.debug(`Component unmounted: ${componentName}`, {
    component: componentName,
    action: "unmount",
  });
}

// Form debugging
export function debugFormSubmit(
  formName: string,
  data: Record<string, unknown>
) {
  frontendDebugLogger.info(`Form submitted: ${formName}`, {
    component: "form",
    action: "submit",
    metadata: {
      formName,
      fieldCount: Object.keys(data).length,
      fields: Object.keys(data),
    },
  });
}

export function debugFormError(
  formName: string,
  errors: Record<string, unknown>
) {
  frontendDebugLogger.warn(`Form validation errors: ${formName}`, {
    component: "form",
    action: "validation_error",
    metadata: {
      formName,
      errorCount: Object.keys(errors).length,
      errorFields: Object.keys(errors),
    },
  });
}

// Navigation debugging
export function debugNavigation(from: string, to: string) {
  frontendDebugLogger.info(`Navigation: ${from} → ${to}`, {
    component: "navigation",
    action: "navigate",
    metadata: { from, to },
  });
}

// QR Scanner debugging
export function debugQRScan(
  action: string,
  codes: string[],
  component?: string
) {
  frontendDebugLogger.info(`QR Scanner: ${action}`, {
    component: component || "qr_scanner",
    action,
    metadata: {
      codeCount: codes.length,
      codes: codes.slice(0, 3), // Only log first 3 codes for privacy
    },
  });
}

// Location debugging
export function debugLocation(
  action: string,
  location?: { lat: number; lng: number }
) {
  frontendDebugLogger.info(`Location: ${action}`, {
    component: "location",
    action,
    metadata: location ? { lat: location.lat, lng: location.lng } : undefined,
  });
}

// Driver dashboard debugging
export function debugDriverAction(
  action: string,
  data?: Record<string, unknown>
) {
  frontendDebugLogger.info(`Driver: ${action}`, {
    component: "driver_dashboard",
    action,
    metadata: data,
  });
}

// Admin panel debugging
export function debugAdminAction(
  action: string,
  data?: Record<string, unknown>
) {
  frontendDebugLogger.info(`Admin: ${action}`, {
    component: "admin_panel",
    action,
    metadata: data,
  });
}

// Error boundary debugging
export function debugError(
  error: Error,
  component?: string,
  context?: Record<string, unknown>
) {
  frontendDebugLogger.error(`Unhandled error: ${error.message}`, {
    component: component || "error_boundary",
    action: "error",
    metadata: {
      stack: error.stack,
      context,
    },
  });
}

// Export the logger instance as debug and default
export const debug = frontendDebugLogger;
export default frontendDebugLogger;
