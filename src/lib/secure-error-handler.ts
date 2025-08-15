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

const ERROR_MAPPINGS = {
  'SUPABASE_CONNECTION_ERROR': 'Servicio temporalmente no disponible. Inténtalo más tarde.',
  'DATABASE_TIMEOUT': 'El servicio está experimentando alta demanda. Inténtalo en unos minutos.',
  'INVALID_QUERY': 'Error en la solicitud. Verifica los datos enviados.',
  
  'INVALID_API_KEY': 'Error de configuración del servidor.',
  'AUTHENTICATION_FAILED': 'Credenciales inválidas.',
  'TOKEN_EXPIRED': 'Sesión expirada. Inicia sesión nuevamente.',
  'UNAUTHORIZED_ACCESS': 'Acceso no autorizado.',
  
  'INVALID_EMAIL': 'El formato del email no es válido.',
  'INVALID_INPUT': 'Los datos proporcionados no son válidos.',
  'MISSING_REQUIRED_FIELD': 'Faltan campos obligatorios.',
  'INVALID_RECAPTCHA': 'Verificación de seguridad fallida. Inténtalo nuevamente.',
  
  'RATE_LIMIT_EXCEEDED': 'Demasiadas solicitudes. Inténtalo más tarde.',
  'IP_BLOCKED': 'Acceso temporalmente restringido.',

  'EMAIL_SERVICE_ERROR': 'Error al enviar email. Inténtalo más tarde.',
  'WORDPRESS_API_ERROR': 'Error al cargar contenido. Inténtalo más tarde.',
  'GOOGLE_OAUTH_ERROR': 'Error de autenticación con Google.',
  
  'INTERNAL_SERVER_ERROR': 'Error interno del servidor. Inténtalo más tarde.',
  'SERVICE_UNAVAILABLE': 'Servicio temporalmente no disponible.',
  'TIMEOUT_ERROR': 'La solicitud tardó demasiado. Inténtalo más tarde.',
  'NETWORK_ERROR': 'Error de conexión. Verifica tu internet.',
  'VALIDATION_ERROR': 'Error de validación de datos.',
  'CONFIGURATION_ERROR': 'Error de configuración del servidor.'
} as const;

type ErrorCode = keyof typeof ERROR_MAPPINGS;

const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9]{20,}\b/g,
  /sk_[a-zA-Z0-9]+/g,
  /pk_[a-zA-Z0-9]+/g,
  /re_[a-zA-Z0-9]+/g,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
  /password['":\s]*[^'";\s,}]+/gi,
  /secret['":\s]*[^'";\s,}]+/gi,
  /token['":\s]*[^'";\s,}]+/gi,
  
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  
  /postgresql:\/\/[^@]+@[^\/]+\/\w+/g,
  /mongodb:\/\/[^@]+@[^\/]+\/\w+/g,
  
  /\/home\/[^\/\s]+/g,
  /C:\\Users\\[^\\\/\s]+/g,
];

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

  createSecureError(
    error: Error | string,
    errorCode: ErrorCode = 'INTERNAL_SERVER_ERROR',
    context?: ErrorContext,
    status: number = 500
  ): { response: Response; logData: any } {
    const requestId = context?.requestId || this.generateRequestId();
    const timestamp = new Date().toISOString();

    const publicResponse: SecureErrorResponse = {
      success: false,
      error: ERROR_MAPPINGS[errorCode],
      code: errorCode,
      timestamp,
      requestId
    };

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

    this.trackError(errorCode, context?.endpoint);

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

  handleError(
    error: Error | string,
    errorCode: ErrorCode = 'INTERNAL_SERVER_ERROR',
    context?: ErrorContext,
    status: number = 500
  ): Response {
    const { response, logData } = this.createSecureError(error, errorCode, context, status);

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

  private sanitizeError(error: Error | string): string {
    const message = error instanceof Error ? error.message : error;
    let sanitized = message;

    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    sanitized = sanitized.replace(/duplicate key value violates unique constraint ".*"/gi, 'Duplicate entry detected');
    sanitized = sanitized.replace(/relation ".*" does not exist/gi, 'Database table not found');
    sanitized = sanitized.replace(/column ".*" of relation ".*" does not exist/gi, 'Database column error');

    return sanitized;
  }

  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;

    let sanitized = stack;

    sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[USER]');
    sanitized = sanitized.replace(/C:\\Users\\[^\\\/\s]+/g, 'C:\\Users\\[USER]');
    
    sanitized = sanitized.replace(/\/node_modules\/[^\/\s]+/g, '/node_modules/[MODULE]');

    return sanitized;
  }

  private sanitizeContext(context: ErrorContext): Partial<ErrorContext> {
    return {
      endpoint: context.endpoint,
      ip: this.maskIP(context.ip),
      userAgent: this.maskUserAgent(context.userAgent),
      requestId: context.requestId
    };
  }

  private maskIP(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
      }
    }
    
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
    }

    return 'xxx.xxx.xxx.xxx';
  }

  private maskUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    return browserMatch ? browserMatch[0] : 'Unknown Browser';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trackError(errorCode: string, endpoint?: string): void {
    const key = endpoint ? `${endpoint}:${errorCode}` : errorCode;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);

    if (current > 10) {
      console.warn(`🚨 High error rate detected: ${key} (${current + 1} errors)`);
    }
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts.entries());
  }
}

export const secureErrorHandler = SecureErrorHandler.getInstance();


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
