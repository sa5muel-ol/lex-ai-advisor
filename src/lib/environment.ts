/**
 * Environment detection utility
 * Automatically detects development vs production environment
 */

export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  proxyUrl: string;
  elasticsearchUrl: string;
  domain: string;
}

/**
 * Detects the current environment based on various indicators
 */
export function detectEnvironment(): Environment {
  // Check if we're in a browser
  if (typeof window !== 'undefined') {
    // Development indicators
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('localhost') ||
      window.location.port === '8080' ||
      window.location.port === '3000' ||
      window.location.port === '5173' // Vite dev server
    ) {
      return 'development';
    }
  }

  // Check Node.js environment variables
  if (typeof process !== 'undefined') {
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }
  }

  // Default to production for safety
  return 'production';
}

/**
 * Gets environment-specific configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const environment = detectEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  let domain = 'juristinsight.com';
  let proxyUrl: string;
  let elasticsearchUrl: string;

  if (isDevelopment) {
    proxyUrl = 'http://localhost:3001';
    elasticsearchUrl = 'http://localhost:9200';
  } else {
    // Production - use current domain or fallback
    if (typeof window !== 'undefined') {
      domain = window.location.hostname;
    }
    proxyUrl = `https://${domain}`;
    elasticsearchUrl = `https://${domain}/es`;
  }

  return {
    environment,
    isDevelopment,
    isProduction,
    proxyUrl,
    elasticsearchUrl,
    domain,
  };
}

/**
 * Gets the appropriate URL for a given service
 */
export function getServiceUrl(service: 'proxy' | 'elasticsearch'): string {
  const config = getEnvironmentConfig();
  
  switch (service) {
    case 'proxy':
      return config.proxyUrl;
    case 'elasticsearch':
      return config.elasticsearchUrl;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

// Export default config for easy access
export const envConfig = getEnvironmentConfig();
