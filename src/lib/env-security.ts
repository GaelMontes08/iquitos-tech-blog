/**
 * Environment Security Manager
 * Handles secure loading, validation, and management of API keys and environment variables
 */

interface EnvironmentConfig {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'key';
  sensitive: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  description: string;
}

/**
 * Environment variable configuration registry
 */
const ENV_CONFIG: Record<string, EnvironmentConfig> = {
  // WordPress Configuration
  WP_DOMAIN: {
    name: 'WP_DOMAIN',
    required: true,
    type: 'url',
    sensitive: false,
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
    description: 'WordPress CMS domain'
  },

  // Database Configuration
  PUBLIC_SUPABASE_URL: {
    name: 'PUBLIC_SUPABASE_URL',
    required: true,
    type: 'url',
    sensitive: false,
    pattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
    description: 'Supabase project URL'
  },
  PUBLIC_SUPABASE_ANON_KEY: {
    name: 'PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    type: 'key',
    sensitive: true,
    minLength: 100,
    maxLength: 200,
    description: 'Supabase anonymous key'
  },

  // Email Service
  RESEND_API_KEY: {
    name: 'RESEND_API_KEY',
    required: true,
    type: 'key',
    sensitive: true,
    pattern: /^re_[a-zA-Z0-9_-]+$/,
    description: 'Resend email service API key'
  },
  RESEND_AUDIENCE_ID: {
    name: 'RESEND_AUDIENCE_ID',
    required: false,
    type: 'string',
    sensitive: false,
    description: 'Resend audience ID for newsletters'
  },

  // reCAPTCHA Configuration
  PUBLIC_RECAPTCHA_SITE_KEY: {
    name: 'PUBLIC_RECAPTCHA_SITE_KEY',
    required: true,
    type: 'key',
    sensitive: false,
    pattern: /^6L[a-zA-Z0-9_-]+$/,
    description: 'reCAPTCHA v3 site key'
  },
  RECAPTCHA_SECRET_KEY: {
    name: 'RECAPTCHA_SECRET_KEY',
    required: true,
    type: 'key',
    sensitive: true,
    pattern: /^6L[a-zA-Z0-9_-]+$/,
    description: 'reCAPTCHA v3 secret key'
  },

  // Google OAuth
  PUBLIC_GOOGLE_CLIENT_ID: {
    name: 'PUBLIC_GOOGLE_CLIENT_ID',
    required: false,
    type: 'string',
    sensitive: false,
    pattern: /^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/,
    description: 'Google OAuth client ID'
  },
  GOOGLE_CLIENT_SECRET: {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    type: 'key',
    sensitive: true,
    pattern: /^GOCSPX-[a-zA-Z0-9_-]+$/,
    description: 'Google OAuth client secret'
  },

  // Application Configuration
  MODE: {
    name: 'MODE',
    required: false,
    type: 'string',
    sensitive: false,
    pattern: /^(development|production|test)$/,
    description: 'Application mode'
  }
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  masked: Record<string, string>;
}

/**
 * Secure Environment Manager
 */
export class EnvironmentSecurity {
  private static instance: EnvironmentSecurity;
  private validationCache = new Map<string, ValidationResult>();
  private loadTime = Date.now();

  private constructor() {}

  static getInstance(): EnvironmentSecurity {
    if (!EnvironmentSecurity.instance) {
      EnvironmentSecurity.instance = new EnvironmentSecurity();
    }
    return EnvironmentSecurity.instance;
  }

  /**
   * Validate all environment variables
   */
  validateEnvironment(): ValidationResult {
    const cacheKey = 'full_validation';
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      masked: {}
    };

    for (const [key, config] of Object.entries(ENV_CONFIG)) {
      const value = this.getEnvironmentValue(key);
      const validation = this.validateVariable(key, value, config);
      
      if (!validation.isValid) {
        result.isValid = false;
        result.errors.push(...validation.errors);
      }
      
      result.warnings.push(...validation.warnings);
      result.masked[key] = this.maskSensitiveValue(value, config.sensitive);
    }

    // Cache result for 5 minutes
    this.validationCache.set(cacheKey, result);
    setTimeout(() => this.validationCache.delete(cacheKey), 5 * 60 * 1000);

    return result;
  }

  /**
   * Validate a specific environment variable with provided value
   */
  validateSecureEnv(key: string, value?: string): string | undefined {
    const config = ENV_CONFIG[key];
    
    if (!config) {
      console.warn(`🔒 Unknown environment variable requested: ${key}`);
      return undefined;
    }

    const validation = this.validateVariable(key, value, config);
    
    if (!validation.isValid) {
      console.error(`🔒 Invalid environment variable ${key}:`, validation.errors);
      return undefined;
    }

    if (validation.warnings.length > 0) {
      console.warn(`🔒 Environment variable ${key} warnings:`, validation.warnings);
    }

    return value;
  }

  /**
   * Validate environment variables with provided values
   */
  validateEnvironmentValues(envValues: Record<string, string | undefined>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      masked: {}
    };

    for (const [key, config] of Object.entries(ENV_CONFIG)) {
      const value = envValues[key];
      const validation = this.validateVariable(key, value, config);
      
      if (!validation.isValid) {
        result.isValid = false;
        result.errors.push(...validation.errors);
      }
      
      result.warnings.push(...validation.warnings);
      result.masked[key] = this.maskSensitiveValue(value, config.sensitive);
    }

    return result;
  }

  /**
   * Generate security report for provided environment values
   */
  generateSecurityReportForValues(envValues: Record<string, string | undefined>): {
    summary: string;
    requiredVariables: { configured: number; total: number };
    sensitiveVariables: { secured: number; total: number };
    issues: string[];
    recommendations: string[];
  } {
    const validation = this.validateEnvironmentValues(envValues);
    
    const totalRequired = Object.values(ENV_CONFIG).filter(c => c.required).length;
    const configuredRequired = Object.entries(ENV_CONFIG)
      .filter(([key, config]) => config.required && envValues[key])
      .length;
    
    const totalSensitive = Object.values(ENV_CONFIG).filter(c => c.sensitive).length;
    const securedSensitive = Object.entries(ENV_CONFIG)
      .filter(([key, config]) => config.sensitive && envValues[key] && !validation.errors.some(e => e.includes(key)))
      .length;

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for missing required variables
    const missingRequired = Object.entries(ENV_CONFIG)
      .filter(([key, config]) => config.required && !envValues[key])
      .map(([key]) => key);

    if (missingRequired.length > 0) {
      issues.push(`Missing required environment variables: ${missingRequired.join(', ')}`);
      recommendations.push('Configure all required environment variables');
    }

    // Check for development mode in production
    const mode = envValues['MODE'];
    if (mode === 'development' && this.isProduction()) {
      issues.push('Application running in development mode in production');
      recommendations.push('Set MODE=production for production deployments');
    }

    // Check for weak keys
    if (validation.warnings.some(w => w.includes('weak'))) {
      issues.push('Weak API keys detected');
      recommendations.push('Regenerate API keys with stronger entropy');
    }

    const summary = validation.isValid ? 
      '🟢 Environment security: SECURE' : 
      '🔴 Environment security: ISSUES DETECTED';

    return {
      summary,
      requiredVariables: { configured: configuredRequired, total: totalRequired },
      sensitiveVariables: { secured: securedSensitive, total: totalSensitive },
      issues,
      recommendations
    };
  }

  /**
   * Get environment variable securely
   */
  getSecureEnv(key: string): string | undefined {
    return this.validateSecureEnv(key, this.getEnvironmentValue(key));
  }

  /**
   * Check if all required environment variables are set
   */
  checkRequiredVariables(): { missing: string[], invalid: string[] } {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const [key, config] of Object.entries(ENV_CONFIG)) {
      if (config.required) {
        const value = this.getEnvironmentValue(key);
        
        if (!value) {
          missing.push(key);
        } else {
          const validation = this.validateVariable(key, value, config);
          if (!validation.isValid) {
            invalid.push(key);
          }
        }
      }
    }

    return { missing, invalid };
  }

  /**
   * Generate environment security report
   */
  generateSecurityReport(): {
    summary: string;
    requiredVariables: { configured: number; total: number };
    sensitiveVariables: { secured: number; total: number };
    issues: string[];
    recommendations: string[];
  } {
    const validation = this.validateEnvironment();
    const required = this.checkRequiredVariables();
    
    const totalRequired = Object.values(ENV_CONFIG).filter(c => c.required).length;
    const configuredRequired = totalRequired - required.missing.length;
    
    const totalSensitive = Object.values(ENV_CONFIG).filter(c => c.sensitive).length;
    const securedSensitive = totalSensitive - validation.errors.filter(e => 
      Object.keys(ENV_CONFIG).find(k => ENV_CONFIG[k].sensitive && e.includes(k))
    ).length;

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for hardcoded keys in code
    if (validation.errors.some(e => e.includes('hardcoded'))) {
      issues.push('Hardcoded API keys detected in source code');
      recommendations.push('Move all API keys to environment variables');
    }

    // Check for weak keys
    if (validation.warnings.some(w => w.includes('weak'))) {
      issues.push('Weak API keys detected');
      recommendations.push('Regenerate API keys with stronger entropy');
    }

    // Check for missing required variables
    if (required.missing.length > 0) {
      issues.push(`Missing required environment variables: ${required.missing.join(', ')}`);
      recommendations.push('Configure all required environment variables');
    }

    // Check for development mode in production
    const mode = this.getEnvironmentValue('MODE');
    if (mode === 'development' && this.isProduction()) {
      issues.push('Application running in development mode in production');
      recommendations.push('Set MODE=production for production deployments');
    }

    const summary = validation.isValid ? 
      '🟢 Environment security: SECURE' : 
      '🔴 Environment security: ISSUES DETECTED';

    return {
      summary,
      requiredVariables: { configured: configuredRequired, total: totalRequired },
      sensitiveVariables: { secured: securedSensitive, total: totalSensitive },
      issues,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private getEnvironmentValue(key: string): string | undefined {
    // In Astro server-side context, use the passed value or fallback
    // This function should be called with values from import.meta.env
    return undefined; // Placeholder - values should be passed to validation functions
  }

  private validateVariable(key: string, value: string | undefined, config: EnvironmentConfig): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      masked: {}
    };

    // Check if required variable is missing
    if (config.required && !value) {
      result.isValid = false;
      result.errors.push(`Required environment variable ${key} is missing`);
      return result;
    }

    if (!value) {
      return result; // Optional variable not set
    }

    // Validate type and format
    switch (config.type) {
      case 'url':
        if (!this.isValidUrl(value)) {
          result.isValid = false;
          result.errors.push(`${key} is not a valid URL`);
        }
        break;
      
      case 'email':
        if (!this.isValidEmail(value)) {
          result.isValid = false;
          result.errors.push(`${key} is not a valid email address`);
        }
        break;
      
      case 'key':
        if (config.minLength && value.length < config.minLength) {
          result.isValid = false;
          result.errors.push(`${key} is too short (minimum ${config.minLength} characters)`);
        }
        if (config.maxLength && value.length > config.maxLength) {
          result.isValid = false;
          result.errors.push(`${key} is too long (maximum ${config.maxLength} characters)`);
        }
        break;
    }

    // Validate pattern
    if (config.pattern && !config.pattern.test(value)) {
      result.isValid = false;
      result.errors.push(`${key} does not match required format`);
    }

    // Security checks for sensitive variables
    if (config.sensitive) {
      if (this.isWeakKey(value)) {
        result.warnings.push(`${key} appears to be a weak key`);
      }
      
      if (this.isTestKey(value)) {
        result.warnings.push(`${key} appears to be a test/example key`);
      }
    }

    return result;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isWeakKey(key: string): boolean {
    const weakPatterns = [
      /^(test|demo|example|sample)/i,
      /^(123|abc|password)/i,
      /(.)\1{4,}/, // Repeated characters
      /^[a-zA-Z0-9]{1,10}$/ // Too short
    ];
    
    return weakPatterns.some(pattern => pattern.test(key));
  }

  private isTestKey(key: string): boolean {
    const testPatterns = [
      /test/i,
      /demo/i,
      /example/i,
      /sample/i,
      /dev/i
    ];
    
    return testPatterns.some(pattern => pattern.test(key));
  }

  private maskSensitiveValue(value: string | undefined, sensitive: boolean): string {
    if (!value) return 'undefined';
    if (!sensitive) return value;
    
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    
    return value.substring(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.substring(value.length - 4);
  }

  private isProduction(): boolean {
    const mode = this.getEnvironmentValue('MODE');
    const nodeEnv = this.getEnvironmentValue('NODE_ENV');
    return mode === 'production' || nodeEnv === 'production';
  }
}

/**
 * Singleton instance for global access
 */
export const envSecurity = EnvironmentSecurity.getInstance();

/**
 * Utility functions for common environment variable access
 */
export function getSecureEnv(key: string, envValue?: string): string | undefined {
  return envSecurity.validateSecureEnv(key, envValue);
}

export function validateEnvironmentVariables(envValues: Record<string, string | undefined>): ValidationResult {
  return envSecurity.validateEnvironmentValues(envValues);
}

export function generateEnvironmentSecurityReport(envValues: Record<string, string | undefined>) {
  return envSecurity.generateSecurityReportForValues(envValues);
}
