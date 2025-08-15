# Google AdSense Integration Guide

This document explains how to set up and use Google AdSense on the Iquitos Tech website.

## Setup Instructions

### 1. Environment Configuration

Add your AdSense Publisher ID to your environment variables:

```bash
# .env file
ADSENSE_PUBLISHER_ID=pub-1234567890123456
```

**How to find your Publisher ID:**
1. Go to your [Google AdSense dashboard](https://www.google.com/adsense/)
2. Navigate to Account → Account information
3. Your Publisher ID will be displayed as `pub-XXXXXXXXXXXXXXXX`

### 2. Verify Configuration

The system will automatically validate your AdSense setup:

- ✅ Publisher ID format validation (`pub-` + 16 digits)
- ✅ Environment security checks
- ✅ Test mode detection

### 3. ads.txt File

The `ads.txt` file is automatically generated and served at `/ads.txt`. It includes:

- Your AdSense Publisher ID (when configured)
- Standard Google certification ID (`f08c47fec0942fa0`)
- Placeholder entries for additional ad networks
- Last updated timestamp

## Usage

### Basic Ad Component

```astro
---
import AdSense from '../components/AdSense.astro';
---

<!-- Simple auto-format ad -->
<AdSense />

<!-- Specific ad slot with format -->
<AdSense 
  adSlot="1234567890"
  adFormat="rectangle"
  responsive={true}
  className="my-ad"
/>
```

### Ad Placement Management

```astro
---
import { getAdsForLocation } from '../lib/adsense.js';

// Get ads for specific page locations
const headerAds = getAdsForLocation('header');
const sidebarAds = getAdsForLocation('sidebar');
---

<!-- Header ads -->
{headerAds.map(ad => (
  <AdSense
    adSlot={ad.slot}
    adFormat={ad.format}
    responsive={ad.responsive}
  />
))}
```

### Available Ad Formats

- `auto` - Responsive auto-sizing (recommended)
- `rectangle` - 300x250 medium rectangle
- `vertical` - Vertical banner (160x600)
- `horizontal` - Horizontal banner (728x90)
- `leaderboard` - Large leaderboard (728x90)
- `banner` - Standard banner (468x60)

### Predefined Placements

The system includes predefined ad placements:

1. **Header Banner** (`HEADER_BANNER`)
   - Format: Leaderboard
   - Location: Page header
   - Priority: 1

2. **Sidebar Rectangle** (`SIDEBAR_RECTANGLE`)
   - Format: Rectangle
   - Location: Sidebar
   - Priority: 2

3. **Content Inline** (`CONTENT_INLINE`)
   - Format: Auto
   - Location: Within content
   - Priority: 3

4. **Between Posts** (`BETWEEN_POSTS`)
   - Format: Rectangle
   - Location: Between blog posts
   - Priority: 4

5. **Footer Banner** (`FOOTER_BANNER`)
   - Format: Banner
   - Location: Page footer
   - Priority: 5 (disabled by default)

## Configuration Management

### AdSense Manager API

```typescript
import { adSenseManager } from '../lib/adsense.js';

// Get configuration
const config = adSenseManager.getConfig();
console.log(config.isEnabled); // boolean
console.log(config.publisherId); // string | undefined

// Validate setup
const validation = adSenseManager.validateSetup();
console.log(validation.isValid); // boolean
console.log(validation.errors); // string[]
console.log(validation.warnings); // string[]

// Generate ads.txt
const adsTxt = adSenseManager.generateAdsTxt();
```

### Environment Security

The AdSense Publisher ID is managed by the secure environment system:

- ✅ Format validation (`pub-` followed by 16 digits)
- ✅ Automatic validation during startup
- ✅ Secure logging (ID is not sensitive, so it's not masked)
- ✅ Production/development mode detection

## Privacy & Performance Features

### Privacy Considerations

- **Do Not Track**: Respects user DNT preferences
- **Reduced Data Mode**: Hides ads for users with data-saving preferences
- **Ad Blocker Detection**: Gracefully handles blocked ads
- **GDPR Compliance**: Compatible with cookie consent systems

### Performance Optimizations

- **Lazy Loading**: AdSense script loads only when needed
- **Responsive Design**: Automatic ad sizing for different devices
- **Print Friendly**: Ads hidden when printing pages
- **Reduced Motion**: Respects user accessibility preferences

### Security Features

- **Content Security Policy**: Compatible with strict CSP headers
- **Cross-Origin**: Proper CORS configuration for AdSense domains
- **Cache Control**: Appropriate caching headers for ads.txt
- **Error Handling**: Graceful fallbacks when ads fail to load

## Testing & Development

### Test Mode

When not in production or when Publisher ID is not configured:

```astro
<!-- Shows placeholder instead of real ads -->
<AdSense testMode={true} />
```

Displays: "📢 AdSense Test Mode" placeholder

### Development Environment

- Real ads are disabled in development mode
- Placeholder ads show configuration status
- Console warnings for missing configuration
- AdSense script not loaded to prevent unnecessary requests

## Troubleshooting

### Common Issues

1. **Ads not showing**
   - Check `ADSENSE_PUBLISHER_ID` environment variable
   - Verify Publisher ID format (`pub-1234567890123456`)
   - Ensure production mode is enabled
   - Check browser console for errors

2. **ads.txt not working**
   - Visit `/ads.txt` to verify content
   - Check that Publisher ID is included
   - Verify DNS propagation if recently deployed

3. **Policy violations**
   - Ensure ads are not placed too close to clickable elements
   - Verify ad placement doesn't violate AdSense policies
   - Check that content meets AdSense guidelines

### Debug Information

```typescript
// Check AdSense status
import { adSenseManager } from '../lib/adsense.js';

const status = adSenseManager.validateSetup();
console.table({
  'AdSense Enabled': status.isValid,
  'Errors': status.errors.join(', ') || 'None',
  'Warnings': status.warnings.join(', ') || 'None'
});
```

## Best Practices

### Ad Placement

1. **Above the fold**: Place at least one ad in visible area
2. **Content integration**: Use in-content ads sparingly
3. **Mobile optimization**: Ensure ads work well on mobile devices
4. **User experience**: Don't overwhelm users with too many ads

### Performance

1. **Lazy loading**: Use component lazy loading for below-fold ads
2. **Caching**: Leverage CDN caching for better performance
3. **Monitoring**: Track ad performance and user engagement
4. **Testing**: Regular testing across different devices and browsers

### Compliance

1. **Privacy policy**: Update privacy policy to mention advertising
2. **Cookie consent**: Integrate with cookie consent system
3. **GDPR/CCPA**: Ensure compliance with data protection regulations
4. **AdSense policies**: Regular review of AdSense program policies

## Advanced Configuration

### Custom Ad Networks

To add additional ad networks to ads.txt:

```typescript
// In src/lib/adsense.ts, modify generateAdsTxt method
generateAdsTxt(): string {
  let content = this.getBasicAdsTxt();
  
  // Add custom networks
  content += '# Additional Networks\n';
  content += 'facebook.com, 123456789, RESELLER, c3e20eee3f780d68\n';
  content += 'amazon-adsystem.com, 1234, RESELLER, f5ab79cb980f11d1\n';
  
  return content;
}
```

### Custom Placements

To add new ad placements:

```typescript
// In src/lib/adsense.ts, add to AD_PLACEMENTS
CUSTOM_PLACEMENT: {
  id: 'custom-ad',
  name: 'Custom Ad Location',
  format: 'rectangle',
  responsive: true,
  location: 'custom',
  priority: 6,
  enabled: true
}
```

This comprehensive AdSense integration provides secure, performant, and privacy-conscious advertising for the Iquitos Tech website! 🚀📢
