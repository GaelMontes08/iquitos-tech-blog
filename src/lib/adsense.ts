
export interface AdPlacement {
  id: string;
  name: string;
  slot?: string;
  format: 'auto' | 'rectangle' | 'vertical' | 'horizontal' | 'leaderboard' | 'banner';
  responsive: boolean;
  location: 'header' | 'sidebar' | 'content' | 'footer' | 'between-posts';
  priority: number;
  enabled: boolean;
}


export const AD_PLACEMENTS: Record<string, AdPlacement> = {
  HEADER_BANNER: {
    id: 'header-banner',
    name: 'Header Banner',
    format: 'leaderboard',
    responsive: true,
    location: 'header',
    priority: 1,
    enabled: true
  },
  
  SIDEBAR_RECTANGLE: {
    id: 'sidebar-rect',
    name: 'Sidebar Rectangle',
    format: 'rectangle',
    responsive: true,
    location: 'sidebar',
    priority: 2,
    enabled: true
  },
  
  CONTENT_INLINE: {
    id: 'content-inline',
    name: 'In-Content Ad',
    format: 'auto',
    responsive: true,
    location: 'content',
    priority: 3,
    enabled: true
  },
  
  BETWEEN_POSTS: {
    id: 'between-posts',
    name: 'Between Posts',
    format: 'rectangle',
    responsive: true,
    location: 'between-posts',
    priority: 4,
    enabled: true
  },
  
  FOOTER_BANNER: {
    id: 'footer-banner',
    name: 'Footer Banner',
    format: 'banner',
    responsive: true,
    location: 'footer',
    priority: 5,
    enabled: false
  }
};

export class AdSenseManager {
  private static instance: AdSenseManager;
  private publisherId: string | undefined;
  private isEnabled: boolean;
  private testMode: boolean;

  private constructor() {
    this.publisherId = this.getPublisherId();
    this.testMode = this.isTestMode();
    this.isEnabled = this.checkAdSenseEnabled();
  }

  static getInstance(): AdSenseManager {
    if (!AdSenseManager.instance) {
      AdSenseManager.instance = new AdSenseManager();
    }
    return AdSenseManager.instance;
  }

  private getPublisherId(): string | undefined {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.ADSENSE_PUBLISHER_ID;
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env.ADSENSE_PUBLISHER_ID;
    }
    return undefined;
  }

  private isTestMode(): boolean {
    const mode = (typeof import.meta !== 'undefined' && import.meta.env?.MODE) || 
                 (typeof process !== 'undefined' && process.env?.NODE_ENV);
    return mode !== 'production';
  }

  private checkAdSenseEnabled(): boolean {
    return Boolean(this.publisherId && !this.testMode);
  }

  getConfig() {
    return {
      publisherId: this.publisherId,
      isEnabled: this.isEnabled,
      testMode: this.testMode,
      placements: Object.values(AD_PLACEMENTS).filter(p => p.enabled)
    };
  }

  getPlacement(placementId: string): AdPlacement | undefined {
    return AD_PLACEMENTS[placementId];
  }

  getPlacementsByLocation(location: string): AdPlacement[] {
    return Object.values(AD_PLACEMENTS)
      .filter(p => p.enabled && p.location === location)
      .sort((a, b) => a.priority - b.priority);
  }

  validateSetup(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.publisherId) {
      errors.push('ADSENSE_PUBLISHER_ID environment variable not configured');
    } else if (!this.publisherId.match(/^pub-[0-9]{16}$/)) {
      errors.push('Invalid AdSense Publisher ID format (should be pub-XXXXXXXXXXXXXXXX)');
    }

    if (this.testMode) {
      warnings.push('AdSense is in test mode - real ads will not be displayed');
    }

    const enabledPlacements = Object.values(AD_PLACEMENTS).filter(p => p.enabled);
    if (enabledPlacements.length === 0) {
      warnings.push('No ad placements are enabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  generateAdsTxt(): string {
    let content = '# ads.txt file for iquitos-tech.com\n';
    content += '# This file authorizes advertising systems to sell ad inventory\n\n';

    if (this.publisherId) {
      content += '# Google AdSense\n';
      content += `google.com, ${this.publisherId}, DIRECT, f08c47fec0942fa0\n\n`;
    } else {
      content += '# Google AdSense - Publisher ID not configured\n';
      content += '# google.com, pub-XXXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n\n';
    }

    content += '# Additional authorized ad networks\n';
    content += '# facebook.com, XXXXXXXXXXXXXXXX, RESELLER, c3e20eee3f780d68\n';
    content += '# amazon-adsystem.com, XXXX, RESELLER, f5ab79cb980f11d1\n';
    content += '# pubmatic.com, XXXXX, RESELLER, 5d62403b186f2ace\n\n';

    content += `# Last updated: ${new Date().toISOString().split('T')[0]}\n`;

    return content;
  }
}

export const adSenseManager = AdSenseManager.getInstance();

export function isAdSenseEnabled(): boolean {
  return adSenseManager.getConfig().isEnabled;
}

export function getAdSensePublisherId(): string | undefined {
  return adSenseManager.getConfig().publisherId;
}

export function getAdPlacement(placementId: string): AdPlacement | undefined {
  return adSenseManager.getPlacement(placementId);
}

export function getAdsForLocation(location: string): AdPlacement[] {
  return adSenseManager.getPlacementsByLocation(location);
}
