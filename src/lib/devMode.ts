/**
 * Development Mode & Guest Mode Utilities
 * Provides easy authentication bypass for localhost development and guest access
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

export const isGuestModeEnabled = (): boolean => {
  // Check if guest mode is enabled via environment variable
  return import.meta.env.VITE_GUEST_MODE_ENABLED === 'true';
};

export const shouldBypassAuth = (): boolean => {
  // Bypass auth in development mode OR when guest mode is enabled
  return isDevelopmentMode() || isGuestModeEnabled();
};

export const getDevUserId = (): string => {
  // Return a consistent dev user ID for localhost
  return 'dev-user-localhost';
};

export const getDevUserEmail = (): string => {
  return 'dev@localhost';
};

export const getGuestUserId = (): string => {
  // Return a consistent guest user ID
  return 'guest-user-demo';
};

export const getGuestUserEmail = (): string => {
  return 'guest@juristinsight.com';
};

export const getCurrentUserId = (): string => {
  if (isDevelopmentMode()) {
    return getDevUserId();
  } else if (isGuestModeEnabled()) {
    return getGuestUserId();
  }
  return '';
};

export const getCurrentUserEmail = (): string => {
  if (isDevelopmentMode()) {
    return getDevUserEmail();
  } else if (isGuestModeEnabled()) {
    return getGuestUserEmail();
  }
  return '';
};

export const isGuestUser = (): boolean => {
  return isGuestModeEnabled() && !isDevelopmentMode();
};
