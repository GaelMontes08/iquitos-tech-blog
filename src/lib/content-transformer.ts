/**
 * Content transformation utilities for WordPress content
 * Handles cleaning and styling of WordPress HTML content with security sanitization
 */

/**
 * HTML sanitization configuration for allowed tags and attributes
 */
const ALLOWED_TAGS = [
  'p', 'div', 'span', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'cite',
  'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption'
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'title', 'target', 'rel', 'class'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
  'div': ['class'],
  'span': ['class'],
  'p': ['class'],
  'h1': ['class'], 'h2': ['class'], 'h3': ['class'], 'h4': ['class'], 'h5': ['class'], 'h6': ['class'],
  'ul': ['class'], 'ol': ['class'], 'li': ['class'],
  'blockquote': ['class'],
  'pre': ['class'], 'code': ['class'],
  'table': ['class'], 'thead': ['class'], 'tbody': ['class'], 'tr': ['class'], 'th': ['class'], 'td': ['class'],
  'figure': ['class'], 'figcaption': ['class']
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string with only allowed tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Step 1: Remove potentially dangerous content
  let sanitized = html
    // Remove script tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove iframe, object, embed tags
    .replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '')
    // Remove self-closing dangerous tags
    .replace(/<(iframe|object|embed|form|input|button)[^>]*\/?\s*>/gi, '')
    // Remove javascript: protocol links
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    // Remove on* event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove data: protocol for images (except safe data:image)
    .replace(/src\s*=\s*["']data:(?!image\/[a-z]+;base64,)[^"']*["']/gi, 'src=""');

  // Step 2: Filter allowed tags
  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();
    
    // Check if tag is allowed
    if (!ALLOWED_TAGS.includes(tag)) {
      return ''; // Remove disallowed tags
    }
    
    // For closing tags, allow them if tag is allowed
    if (match.startsWith('</')) {
      return match;
    }
    
    // For opening tags, filter attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || [];
    if (allowedAttrs.length === 0) {
      return `<${tag}>`;
    }
    
    // Extract and filter attributes
    const attrRegex = /\s+([a-zA-Z-]+)\s*=\s*["']([^"']*)["']/g;
    let cleanMatch = `<${tag}`;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(match)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2];
      
      if (allowedAttrs.includes(attrName)) {
        // Additional security checks for specific attributes
        if (attrName === 'href') {
          // Only allow safe protocols
          if (attrValue.match(/^(https?:\/\/|\/|#)/i)) {
            cleanMatch += ` ${attrName}="${attrValue}"`;
          }
        } else if (attrName === 'src') {
          // Only allow safe image sources
          if (attrValue.match(/^(https?:\/\/|\/|data:image\/[a-z]+;base64,)/i)) {
            cleanMatch += ` ${attrName}="${attrValue}"`;
          }
        } else if (attrName === 'class') {
          // Sanitize class names (remove potentially harmful classes)
          const safeClasses = attrValue.replace(/[^a-zA-Z0-9\s\-_:/\[\]]/g, '');
          if (safeClasses) {
            cleanMatch += ` ${attrName}="${safeClasses}"`;
          }
        } else {
          // For other allowed attributes, basic sanitization
          const safeValue = attrValue.replace(/[<>"']/g, '');
          cleanMatch += ` ${attrName}="${safeValue}"`;
        }
      }
    }
    
    cleanMatch += '>';
    return cleanMatch;
  });

  return sanitized;
}

/**
 * Sanitizes user input data for forms and user-generated content
 * @param input - Raw input string from user
 * @param options - Sanitization options
 * @returns Sanitized string safe for database storage and display
 */
export function sanitizeUserInput(input: string, options: {
  maxLength?: number;
  allowHtml?: boolean;
  allowNewlines?: boolean;
} = {}): string {
  if (!input || typeof input !== 'string') return '';

  const { maxLength = 5000, allowHtml = false, allowNewlines = true } = options;

  let sanitized = input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except allowed ones
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize unicode
    .normalize('NFC')
    // Trim whitespace
    .trim();

  // Remove HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  } else {
    // Normalize line endings and limit consecutive newlines
    sanitized = sanitized
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  // Remove potentially dangerous patterns
  sanitized = sanitized
    // Remove SQL injection patterns
    .replace(/(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi, '')
    // Remove script injection patterns
    .replace(/(javascript|vbscript|onload|onerror|onclick):/gi, '')
    // Remove XSS patterns
    .replace(/(<|&lt;)script/gi, '')
    .replace(/(<|&lt;)iframe/gi, '')
    .replace(/(<|&lt;)object/gi, '')
    .replace(/(<|&lt;)embed/gi, '');

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes email addresses
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  const sanitized = email
    .trim()
    .toLowerCase()
    .normalize('NFC')
    // Remove dangerous characters
    .replace(/[<>()[\]\\,;:\s@"]/g, '');

  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitizes names and text inputs
 * @param name - Name or text to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized name
 */
export function sanitizeName(name: string, maxLength: number = 100): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .normalize('NFC')
    // Allow letters, numbers, spaces, hyphens, apostrophes, dots
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-'\.]/g, '')
    // Limit consecutive spaces
    .replace(/\s{2,}/g, ' ')
    // Truncate
    .substring(0, maxLength)
    .trim();
}

/**
 * Sanitizes URLs and links
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  const sanitized = url.trim().normalize('NFC');

  // Only allow safe protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  
  try {
    const urlObj = new URL(sanitized);
    if (allowedProtocols.includes(urlObj.protocol)) {
      return sanitized;
    }
  } catch {
    // Invalid URL, check if it's a relative path
    if (sanitized.startsWith('/') || sanitized.startsWith('#')) {
      return sanitized;
    }
  }

  return '';
}

/**
 * Removes WordPress-specific classes and attributes from HTML
 * @param html - Raw HTML string from WordPress
 * @returns Cleaned HTML string without WordPress classes
 */
export function removeWordPressClasses(html: string): string {
  if (!html) return '';

  return html
    // Remove WordPress-specific classes
    .replace(/class="[^"]*wp-block[^"]*"/gi, '')
    .replace(/class="[^"]*wp-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*post-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*entry-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*alignleft[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*alignright[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*aligncenter[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*size-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*attachment-[^"]*[^"]*"/gi, '')
    
    // Remove WordPress IDs
    .replace(/id="[^"]*"/gi, '')
    
    // Remove empty class attributes
    .replace(/class=""\s*/gi, '')
    .replace(/class="\s*"\s*/gi, '');
}

/**
 * Applies Tailwind CSS classes to HTML elements for consistent styling
 * @param html - HTML string to style
 * @returns HTML string with Tailwind classes applied
 */
export function applyTailwindStyles(html: string): string {
  if (!html) return '';

  return html
    // Clean up figure tags (WordPress image blocks)
    .replace(/<figure[^>]*>/gi, '<div>')
    .replace(/<\/figure>/gi, '</div>')
    
    // Style images
    .replace(/<img([^>]*?)>/gi, '<img$1 class="rounded-2xl my-8 w-full object-cover">')
    
    // Style paragraphs with larger font
    .replace(/<p([^>]*)>/gi, '<p class="mb-6 text-gray-300 leading-relaxed text-lg">')
    
    // Style headings with larger fonts and proper hierarchy
    .replace(/<h1([^>]*)>/gi, '<h1 class="text-4xl font-bold text-white mt-10 mb-6">')
    .replace(/<h2([^>]*)>/gi, '<h2 class="text-3xl font-bold text-white mt-10 mb-6 border-b-2 border-blue-500 pb-3">')
    .replace(/<h3([^>]*)>/gi, '<h3 class="text-2xl font-semibold text-blue-300 mt-8 mb-4">')
    .replace(/<h4([^>]*)>/gi, '<h4 class="text-xl font-semibold text-blue-200 mt-6 mb-4">')
    .replace(/<h5([^>]*)>/gi, '<h5 class="text-lg font-semibold text-blue-100 mt-6 mb-3">')
    .replace(/<h6([^>]*)>/gi, '<h6 class="text-base font-semibold text-blue-50 mt-4 mb-3">')
    
    // Style lists with larger font
    .replace(/<ul([^>]*)>/gi, '<ul class="list-disc list-inside mb-6 space-y-3 text-gray-300 text-lg">')
    .replace(/<ol([^>]*)>/gi, '<ol class="list-decimal list-inside mb-6 space-y-3 text-gray-300 text-lg">')
    .replace(/<li([^>]*)>/gi, '<li class="mb-2 leading-relaxed">')
    
    // Style links
    .replace(/<a([^>]*?)>/gi, '<a$1 class="text-blue-400 hover:text-blue-300 underline transition-colors">')
    
    // Style blockquotes with larger font
    .replace(/<blockquote([^>]*)>/gi, '<blockquote class="border-l-4 border-blue-500 pl-6 my-8 italic text-gray-400 bg-gray-800/30 p-6 rounded-r-lg text-lg leading-relaxed">')
    
    // Style code blocks
    .replace(/<pre([^>]*)>/gi, '<pre class="bg-gray-900 border border-gray-700 rounded-lg p-6 my-8 overflow-x-auto text-base">')
    .replace(/<code([^>]*)>/gi, '<code class="bg-gray-800 text-gray-200 px-3 py-1 rounded text-base">')
    
    // Style tables with larger font
    .replace(/<table([^>]*)>/gi, '<table class="w-full border-collapse border border-gray-700 my-8 rounded-lg overflow-hidden text-base">')
    .replace(/<th([^>]*)>/gi, '<th class="bg-gray-800 border border-gray-700 px-6 py-4 text-left font-semibold text-white text-base">')
    .replace(/<td([^>]*)>/gi, '<td class="border border-gray-700 px-6 py-4 text-gray-300 text-base">');
}

/**
 * Normalizes whitespace and trims the HTML string
 * @param html - HTML string to normalize
 * @returns Normalized HTML string
 */
export function normalizeWhitespace(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main function to clean and transform WordPress HTML content
 * Combines all transformation steps for cleaner, styled content with security
 * @param html - Raw WordPress HTML content
 * @returns Cleaned, styled, and sanitized HTML content
 */
export function cleanWordPressHtml(html: string): string {
  if (!html) return '';

  // Apply transformations in sequence
  let transformedHtml = html;
  
  // Step 0: Security sanitization (CRITICAL - Must be first)
  transformedHtml = sanitizeHtml(transformedHtml);
  
  // Step 1: Remove WordPress-specific classes and attributes
  transformedHtml = removeWordPressClasses(transformedHtml);
  
  // Step 2: Apply Tailwind styling
  transformedHtml = applyTailwindStyles(transformedHtml);
  
  // Step 3: Normalize whitespace
  transformedHtml = normalizeWhitespace(transformedHtml);

  return transformedHtml;
}
