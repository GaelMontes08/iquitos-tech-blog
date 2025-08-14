/**
 * Performance Monitoring Utilities
 * Track API response times and identify bottlenecks
 */

interface PerformanceMetric {
  endpoint: string;
  duration: number;
  timestamp: number;
  status: number;
}

// Simple in-memory performance tracking
const performanceStore = new Map<string, PerformanceMetric[]>();

/**
 * Performance timer for API endpoints
 */
export class PerformanceTimer {
  private startTime: number;
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.startTime = performance.now();
  }

  /**
   * End timer and log performance metric
   */
  end(status: number = 200): number {
    const duration = performance.now() - this.startTime;
    
    // Log slow responses
    if (duration > 1000) {
      console.warn(`🐌 Slow response: ${this.endpoint} took ${duration.toFixed(2)}ms`);
    }

    // Store metric
    const metric: PerformanceMetric = {
      endpoint: this.endpoint,
      duration,
      timestamp: Date.now(),
      status
    };

    if (!performanceStore.has(this.endpoint)) {
      performanceStore.set(this.endpoint, []);
    }

    const metrics = performanceStore.get(this.endpoint)!;
    metrics.push(metric);

    // Keep only last 100 metrics per endpoint
    if (metrics.length > 100) {
      metrics.shift();
    }

    return duration;
  }

  /**
   * Get performance metrics for an endpoint
   */
  static getMetrics(endpoint: string): PerformanceMetric[] {
    return performanceStore.get(endpoint) || [];
  }

  /**
   * Get average response time for an endpoint
   */
  static getAverageResponseTime(endpoint: string): number {
    const metrics = performanceStore.get(endpoint) || [];
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get all performance data
   */
  static getAllMetrics(): Record<string, { average: number; count: number; recent: PerformanceMetric[] }> {
    const result: Record<string, { average: number; count: number; recent: PerformanceMetric[] }> = {};

    for (const [endpoint, metrics] of performanceStore.entries()) {
      const average = this.getAverageResponseTime(endpoint);
      const recent = metrics.slice(-10); // Last 10 requests
      
      result[endpoint] = {
        average: Math.round(average * 100) / 100,
        count: metrics.length,
        recent
      };
    }

    return result;
  }
}

/**
 * Performance monitoring middleware wrapper
 */
export function withPerformanceMonitoring<T extends any[], R>(
  endpoint: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const timer = new PerformanceTimer(endpoint);
    
    try {
      const result = await fn(...args);
      timer.end(200);
      return result;
    } catch (error) {
      timer.end(500);
      throw error;
    }
  };
}
