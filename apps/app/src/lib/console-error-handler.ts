/**
 * Console Error Handler for Replit Environment
 * Suppresses known development-only errors that don't affect functionality
 */

export function initializeConsoleErrorHandler(): void {
  if (import.meta.env.DEV) {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // List of known development-only error patterns to suppress
    const suppressedPatterns = [
      '[vite] failed to connect to websocket',
      'WebSocket (failing)',
      '[vite] connecting...',
      'your current setup:',
      'Check out your Vite / network configuration',
      'localhost:5173',
      'WebSocket connection to',
      'vite.dev/config/server-options'
    ];

    // Enhanced error handler
    console.error = (...args: unknown[]) => {
      const message = String(args[0] || '').toLowerCase();
      
      // Check if this error should be suppressed
      const shouldSuppress = suppressedPatterns.some(pattern => 
        message.includes(pattern.toLowerCase())
      );
      
      if (!shouldSuppress) {
        originalError.apply(console, args);
      }
    };

    // Enhanced warn handler for Vite warnings
    console.warn = (...args: unknown[]) => {
      const message = String(args[0] || '').toLowerCase();
      
      const shouldSuppress = suppressedPatterns.some(pattern => 
        message.includes(pattern.toLowerCase())
      );
      
      if (!shouldSuppress) {
        originalWarn.apply(console, args);
      }
    };

    // Keep log messages as is for debugging
    console.log = (...args: unknown[]) => {
      const message = String(args[0] || '').toLowerCase();
      
      // Only suppress Vite connection logs
      if (message.includes('[vite] connecting') || 
          message.includes('websocket') && message.includes('vite')) {
        return;
      }
      
      originalLog.apply(console, args);
    };
  }
}

// Global error handler for unhandled errors
export function initializeGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    // Log actual application errors but suppress Vite dev server issues
    if (event.message.includes('websocket') || 
        event.message.includes('[vite]')) {
      event.preventDefault();
      return;
    }
    
    // Let other errors through for debugging
    console.error('Unhandled error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Handle promise rejections
    const reason = event.reason;
    if (reason && String(reason).includes('websocket')) {
      event.preventDefault();
      return;
    }
    
    console.error('Unhandled promise rejection:', reason);
  });
}