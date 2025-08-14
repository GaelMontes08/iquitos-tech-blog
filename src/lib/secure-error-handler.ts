/**
 * Secure Error Handling System
 * Prevents sensitive information leakage in error responses
 */

export interface SecureErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

export interface ErrorContext {
  endpoint: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Error types and their safe public messages
 */
const ERROR_MAPPINGS = {
  // Database errors
  'SUPABASE_CONNECTION_ERROR': 'Servicio temporalmente no disponible. Inténtalo más tarde.',
  'DATABASE_TIMEOUT': 'El servicio está experimentando alta demanda. Inténtalo en unos minutos.',
  'INVALID_QUERY': 'Error en la solicitud. Verifica los datos enviados.',
  
  // Authentication errors
  'INVALID_API_KEY': 'Error de configuración del servidor.',
  'AUTHENTICATION_FAILED': 'Credenciales inválidas.',
  'TOKEN_EXPIRED': 'Sesión expirada. Inicia sesión nuevamente.',
  'UNAUTHORIZED_ACCESS': 'Acceso no autorizado.',
  
  // Validation errors
  'INVALID_EMAIL': 'El formato del email no es válido.',
  'INVALID_INPUT': 'Los datos proporcionados no son válidos.',
  'MISSING_REQUIRED_FIELD': 'Faltan campos obligatorios.',
  'INVALID_RECAPTCHA': 'Verificación de seguridad fallida. Inténtalo nuevamente.',
  
  // Rate limiting
  'RATE_LIMIT_EXCEEDED': 'Demasiadas solicitudes. Inténtalo más tarde.',
  'IP_BLOCKED': 'Acceso temporalmente restringido.',
  
  // External service errors
  'EMAIL_SERVICE_ERROR': 'Error al enviar email. Inténtalo más tarde.',
  'WORDPRESS_API_ERROR': 'Error al cargar contenido. Inténtalo más tarde.',
  'GOOGLE_OAUTH_ERROR': 'Error de autenticación con Google.',
  
  // General errors
  'INTERNAL_SERVER_ERROR': 'Error interno del servidor. Inténtalo más tarde.',
  'SERVICE_UNAVAILABLE': 'Servicio temporalmente no disponible.',
  'TIMEOUT_ERROR': 'La solicitud tardó demasiado. Inténtalo más tarde.',
  'NETWORK_ERROR': 'Error de conexión. Verifica tu internet.',
  'VALIDATION_ERROR': 'Error de validación de datos.',
  'CONFIGURATION_ERROR': 'Error de configuración del servidor.'
} as const;

type ErrorCode = keyof typeof ERROR_MAPPINGS;

/**
 * Sensitive patterns that should be masked in logs
 */
const SENSITIVE_PATTERNS = [
  // API Keys and tokens
  /\b[A-Za-z0-9]{20,}\b/g,           // Generic long alphanumeric strings
  /sk_[a-zA-Z0-9]+/g,                // Stripe secret keys
  /pk_[a-zA-Z0-9]+/g,                // Stripe public keys
  /re_[a-zA-Z0-9]+/g,                // Resend API keys
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // JWT tokens
  /password['":\s]*[^'";\s,}]+/gi,   // Passwords
  /secret['":\s]*[^'";\s,}]+/gi,     // Secrets
  /token['":\s]*[^'";\s,}]+/gi,      // Tokens
  
  // Personal information
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses (in error messages)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,          // SSN patterns
  
  // Database connection strings
  /postgresql:\/\/[^@]+@[^\/]+\/\w+/g,
  /mongodb:\/\/[^@]+@[^\/]+\/\w+/g,
  
  // File paths that might contain sensitive info
  /\/home\/[^\/\s]+/g,
  /C:\\Users\\[^\\\/\s]+/g,
];

/**
 * Secure Error Handler Class
 */
export class SecureErrorHandler {
  private static instance: SecureErrorHandler;
  private errorCounts = new Map<string, number>();
  private isProduction = process.env.NODE_ENV === 'production' || import.meta.env.MODE === 'production';

  private constructor() {}

  static getInstance(): SecureErrorHandler {
    if (!SecureErrorHandler.instance) {
      SecureErrorHandler.instance = new SecureErrorHandler();
    }
    return SecureErrorHandler.instance;
  }

  /**
   * Create a secure error response
   */
  createSecureError(
    error: Error | string,
    errorCode: ErrorCode = 'INTERNAL_SERVER_ERROR',
    context?: ErrorContext,
    status: number = 500
  ): { response: Response; logData: any } {
    const requestId = context?.requestId || this.generateRequestId();
    const timestamp = new Date().toISOString();

    // Create safe public response
    const publicResponse: SecureErrorResponse = {
      success: false,
      error: ERROR_MAPPINGS[errorCode],
      code: errorCode,
      timestamp,
      requestId
    };

    // Prepare detailed log data (for internal logging only)
    const logData = {
      requestId,
      timestamp,
      errorCode,
      endpoint: context?.endpoint,
      ip: this.maskIP(context?.ip),
      userAgent: context?.userAgent ? this.maskUserAgent(context?.userAgent) : undefined,
      originalError: this.isProduction ? this.sanitizeError(error) : error,
      stack: error instanceof Error ? this.sanitizeStackTrace(error.stack) : undefined,
      context: context ? this.sanitizeContext(context) : undefined
    };

    // Track error frequency
    this.trackError(errorCode, context?.endpoint);

    // Create response
    const response = new Response(JSON.stringify(publicResponse), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    return { response, logData };
  }

  /**
   * Handle and log errors securely
   */
  handleError(
    error: Error | string,
    errorCode: ErrorCode = 'INTERNAL_SERVER_ERROR',
    context?: ErrorContext,
    status: number = 500
  ): Response {
    const { response, logData } = this.createSecureError(error, errorCode, context, status);

    // Log error securely
    if (this.isProduction) {
      console.error('🚨 Error:', {
        requestId: logData.requestId,
        code: logData.errorCode,
        endpoint: logData.endpoint,
        timestamp: logData.timestamp
      });
    } else {
      console.error('🚨 Error Details:', logData);
    }

    return response;
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  private sanitizeError(error: Error | string): string {
    const message = error instanceof Error ? error.message : error;
    let sanitized = message;

    // Apply all sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Remove specific database error details
    sanitized = sanitized.replace(/duplicate key value violates unique constraint ".*"/gi, 'Duplicate entry detected');
    sanitized = sanitized.replace(/relation ".*" does not exist/gi, 'Database table not found');
    sanitized = sanitized.replace(/column ".*" of relation ".*" does not exist/gi, 'Database column error');

    return sanitized;
  }

  /**
   * Sanitize stack trace
   */
  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;

    let sanitized = stack;

    // Remove file paths that might contain sensitive info
    sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[USER]');
    sanitized = sanitized.replace(/C:\\Users\\[^\\\/\s]+/g, 'C:\\Users\\[USER]');
    
    // Remove node_modules paths that might leak project structure
    sanitized = sanitized.replace(/\/node_modules\/[^\/\s]+/g, '/node_modules/[MODULE]');

    return sanitized;
  }

  /**
   * Sanitize context information
   */
  private sanitizeContext(context: ErrorContext): Partial<ErrorContext> {
    return {
      endpoint: context.endpoint,
      ip: this.maskIP(context.ip),
      userAgent: this.maskUserAgent(context.userAgent),
      requestId: context.requestId
      // Exclude userId to prevent user tracking in logs
    };
  }

  /**
   * Mask IP address for privacy
   */
  private maskIP(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    // Mask last octet of IPv4
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
      }
    }
    
    // Mask IPv6
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
    }

    return 'xxx.xxx.xxx.xxx';
  }

  /**
   * Mask user agent for privacy
   */
  private maskUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    // Keep only browser and version, remove detailed system info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    return browserMatch ? browserMatch[0] : 'Unknown Browser';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track error frequency
   */
  private trackError(errorCode: string, endpoint?: string): void {
    const key = endpoint ? `${endpoint}:${errorCode}` : errorCode;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);

    // Alert on high error rates
    if (current > 10) {
      console.warn(`🚨 High error rate detected: ${key} (${current + 1} errors)`);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts.entries());
  }
}

/**
 * Global error handler instance
 */
export const secureErrorHandler = SecureErrorHandler.getInstance();

/**
 * Utility functions for common error scenarios
 */

export function handleDatabaseError(error: Error, context?: ErrorContext): Response {
  if (error.message.includes('connect')) {
    return secureErrorHandler.handleError(error, 'SUPABASE_CONNECTION_ERROR', context, 503);
  }
  if (error.message.includes('timeout')) {
    return secureErrorHandler.handleError(error, 'DATABASE_TIMEOUT', context, 408);
  }
  return secureErrorHandler.handleError(error, 'INTERNAL_SERVER_ERROR', context, 500);
}

export function handleValidationError(message: string, context?: ErrorContext): Response {
  if (message.includes('email')) {
    return secureErrorHandler.handleError(message, 'INVALID_EMAIL', context, 400);
  }
  if (message.includes('required')) {
    return secureErrorHandler.handleError(message, 'MISSING_REQUIRED_FIELD', context, 400);
  }
  return secureErrorHandler.handleError(message, 'INVALID_INPUT', context, 400);
}

export function handleAuthError(error: Error, context?: ErrorContext): Response {
  if (error.message.includes('API key')) {
    return secureErrorHandler.handleError(error, 'INVALID_API_KEY', context, 500);
  }
  if (error.message.includes('unauthorized')) {
    return secureErrorHandler.handleError(error, 'UNAUTHORIZED_ACCESS', context, 401);
  }
  return secureErrorHandler.handleError(error, 'AUTHENTICATION_FAILED', context, 401);
}

export function handleExternalServiceError(service: string, error: Error, context?: ErrorContext): Response {
  const serviceErrorMap: Record<string, ErrorCode> = {
    'resend': 'EMAIL_SERVICE_ERROR',
    'wordpress': 'WORDPRESS_API_ERROR',
    'google': 'GOOGLE_OAUTH_ERROR'
  };

  const errorCode = serviceErrorMap[service.toLowerCase()] || 'INTERNAL_SERVER_ERROR';
  return secureErrorHandler.handleError(error, errorCode, context, 503);
}
