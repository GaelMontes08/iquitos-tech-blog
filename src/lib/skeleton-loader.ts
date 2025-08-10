/**
 * Dynamic skeleton loader utility for progressive content loading
 */

export interface SkeletonConfig {
  selector: string;
  skeletonComponent: string;
  loadingDelay?: number;
  fadeInDuration?: number;
}

export class SkeletonLoader {
  private config: SkeletonConfig;
  
  constructor(config: SkeletonConfig) {
    this.config = {
      loadingDelay: 300,
      fadeInDuration: 300,
      ...config
    };
  }
  
  /**
   * Initialize skeleton loading for a page
   */
  init(): void {
    const skeleton = document.getElementById('content-skeleton');
    const actualContent = document.getElementById('actual-content');
    
    if (!skeleton || !actualContent) return;
    
    // Start with skeleton visible
    skeleton.style.display = 'block';
    actualContent.style.display = 'none';
    
    // Load content progressively
    this.loadContent(skeleton, actualContent);
  }
  
  /**
   * Load content and replace skeleton
   */
  private loadContent(skeleton: HTMLElement, actualContent: HTMLElement): void {
    // Simulate content loading (replace with actual API calls)
    setTimeout(() => {
      this.showContent(skeleton, actualContent);
    }, this.config.loadingDelay);
  }
  
  /**
   * Show actual content with fade-in animation
   */
  private showContent(skeleton: HTMLElement, actualContent: HTMLElement): void {
    skeleton.style.display = 'none';
    actualContent.style.display = 'block';
    actualContent.style.animation = `fadeIn ${this.config.fadeInDuration}ms ease-in-out`;
  }
  
  /**
   * Create transition skeleton for ViewTransitions
   */
  static createTransitionSkeleton(): HTMLElement {
    const skeletonLoader = document.createElement('div');
    skeletonLoader.id = 'transition-skeleton';
    skeletonLoader.innerHTML = `
      <div class="animate-pulse space-y-4 p-6">
        <div class="h-6 bg-gray-700 rounded w-3/4"></div>
        <div class="h-4 bg-gray-700 rounded w-1/2"></div>
        <div class="h-32 bg-gray-700 rounded"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${Array.from({ length: 6 }).map(() => `
            <div class="space-y-3">
              <div class="h-24 bg-gray-700 rounded"></div>
              <div class="h-4 bg-gray-700 rounded w-4/5"></div>
              <div class="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    skeletonLoader.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 1200px;
      background: rgba(31, 41, 55, 0.95);
      border-radius: 12px;
      z-index: 9999;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(75, 85, 99, 0.3);
    `;
    
    return skeletonLoader;
  }
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const loader = new SkeletonLoader({
      selector: '#content-skeleton',
      skeletonComponent: 'HomepageSkeleton'
    });
    loader.init();
  });
}
