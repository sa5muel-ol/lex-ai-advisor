/**
 * Development Mode Utilities
 * Provides easy authentication bypass for localhost development
 */

export const isDevelopmentMode = (): boolean => {
  // Check if we're running on localhost in development
  return (
    import.meta.env.DEV && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '0.0.0.0')
  );
};

export const shouldBypassAuth = (): boolean => {
  // Only bypass auth in development mode
  return isDevelopmentMode();
};

export const getDevUserId = (): string => {
  // Return a consistent dev user ID for localhost
  return 'dev-user-localhost';
};

export const getDevUserEmail = (): string => {
  return 'dev@localhost';
};
