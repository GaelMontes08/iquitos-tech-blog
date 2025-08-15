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

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed|form|input|button)[^>]*\/?\s*>/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/src\s*=\s*["']data:(?!image\/[a-z]+;base64,)[^"']*["']/gi, 'src=""');

  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();
    
    if (!ALLOWED_TAGS.includes(tag)) {
      return ''; 
    }
    
    if (match.startsWith('</')) {
      return match;
    }
    
    const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || [];
    if (allowedAttrs.length === 0) {
      return `<${tag}>`;
    }
    
    const attrRegex = /\s+([a-zA-Z-]+)\s*=\s*["']([^"']*)["']/g;
    let cleanMatch = `<${tag}`;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(match)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2];
      
      if (allowedAttrs.includes(attrName)) {
        if (attrName === 'href') {
          if (attrValue.match(/^(https?:\/\/|\/|#)/i)) {
            cleanMatch += ` ${attrName}="${attrValue}"`;
          }
        } else if (attrName === 'src') {
          if (attrValue.match(/^(https?:\/\/|\/|data:image\/[a-z]+;base64,)/i)) {
            cleanMatch += ` ${attrName}="${attrValue}"`;
          }
        } else if (attrName === 'class') {
          const safeClasses = attrValue.replace(/[^a-zA-Z0-9\s\-_:/\[\]]/g, '');
          if (safeClasses) {
            cleanMatch += ` ${attrName}="${safeClasses}"`;
          }
        } else {
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

export function sanitizeUserInput(input: string, options: {
  maxLength?: number;
  allowHtml?: boolean;
  allowNewlines?: boolean;
} = {}): string {
  if (!input || typeof input !== 'string') return '';

  const { maxLength = 5000, allowHtml = false, allowNewlines = true } = options;

  let sanitized = input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .normalize('NFC')
    .trim();

  if (!allowHtml) {
    sanitized = sanitized
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  } else {
    sanitized = sanitized
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  sanitized = sanitized
    .replace(/(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi, '')
    .replace(/(javascript|vbscript|onload|onerror|onclick):/gi, '')
    .replace(/(<|&lt;)script/gi, '')
    .replace(/(<|&lt;)iframe/gi, '')
    .replace(/(<|&lt;)object/gi, '')
    .replace(/(<|&lt;)embed/gi, '');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  const sanitized = email
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[<>()[\]\\,;:\s@"]/g, '');

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

export function sanitizeName(name: string, maxLength: number = 100): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .normalize('NFC')
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-'\.]/g, '')
    .replace(/\s{2,}/g, ' ')
    .substring(0, maxLength)
    .trim();
}

export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  const sanitized = url.trim().normalize('NFC');

  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  
  try {
    const urlObj = new URL(sanitized);
    if (allowedProtocols.includes(urlObj.protocol)) {
      return sanitized;
    }
  } catch {
    if (sanitized.startsWith('/') || sanitized.startsWith('#')) {
      return sanitized;
    }
  }

  return '';
}

export function removeWordPressClasses(html: string): string {
  if (!html) return '';

  return html
    .replace(/class="[^"]*wp-block[^"]*"/gi, '')
    .replace(/class="[^"]*wp-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*post-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*entry-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*alignleft[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*alignright[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*aligncenter[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*size-[^"]*[^"]*"/gi, '')
    .replace(/class="[^"]*attachment-[^"]*[^"]*"/gi, '')
    
    .replace(/id="[^"]*"/gi, '')
    
    .replace(/class=""\s*/gi, '')
    .replace(/class="\s*"\s*/gi, '');
}

export function applyTailwindStyles(html: string): string {
  if (!html) return '';

  return html
    .replace(/<figure[^>]*>/gi, '<div>')
    .replace(/<\/figure>/gi, '</div>')
    
    .replace(/<img([^>]*?)>/gi, '<img$1 class="rounded-2xl my-8 w-full object-cover">')
    
    .replace(/<p([^>]*)>/gi, '<p class="mb-6 text-gray-300 leading-relaxed text-lg">')
    
    .replace(/<h1([^>]*)>/gi, '<h1 class="text-4xl font-bold text-white mt-10 mb-6">')
    .replace(/<h2([^>]*)>/gi, '<h2 class="text-3xl font-bold text-white mt-10 mb-6 border-b-2 border-blue-500 pb-3">')
    .replace(/<h3([^>]*)>/gi, '<h3 class="text-2xl font-semibold text-blue-300 mt-8 mb-4">')
    .replace(/<h4([^>]*)>/gi, '<h4 class="text-xl font-semibold text-blue-200 mt-6 mb-4">')
    .replace(/<h5([^>]*)>/gi, '<h5 class="text-lg font-semibold text-blue-100 mt-6 mb-3">')
    .replace(/<h6([^>]*)>/gi, '<h6 class="text-base font-semibold text-blue-50 mt-4 mb-3">')
    
    .replace(/<ul([^>]*)>/gi, '<ul class="list-disc list-inside mb-6 space-y-3 text-gray-300 text-lg">')
    .replace(/<ol([^>]*)>/gi, '<ol class="list-decimal list-inside mb-6 space-y-3 text-gray-300 text-lg">')
    .replace(/<li([^>]*)>/gi, '<li class="mb-2 leading-relaxed">')
    
    .replace(/<a([^>]*?)>/gi, '<a$1 class="text-blue-400 hover:text-blue-300 underline transition-colors">')
    
    .replace(/<blockquote([^>]*)>/gi, '<blockquote class="border-l-4 border-blue-500 pl-6 my-8 italic text-gray-400 bg-gray-800/30 p-6 rounded-r-lg text-lg leading-relaxed">')
    
    .replace(/<pre([^>]*)>/gi, '<pre class="bg-gray-900 border border-gray-700 rounded-lg p-6 my-8 overflow-x-auto text-base">')
    .replace(/<code([^>]*)>/gi, '<code class="bg-gray-800 text-gray-200 px-3 py-1 rounded text-base">')
    
    .replace(/<table([^>]*)>/gi, '<table class="w-full border-collapse border border-gray-700 my-8 rounded-lg overflow-hidden text-base">')
    .replace(/<th([^>]*)>/gi, '<th class="bg-gray-800 border border-gray-700 px-6 py-4 text-left font-semibold text-white text-base">')
    .replace(/<td([^>]*)>/gi, '<td class="border border-gray-700 px-6 py-4 text-gray-300 text-base">');
}

export function normalizeWhitespace(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanWordPressHtml(html: string): string {
  if (!html) return '';

  let transformedHtml = html;
  
  transformedHtml = sanitizeHtml(transformedHtml);
  
  transformedHtml = removeWordPressClasses(transformedHtml);
  
  transformedHtml = applyTailwindStyles(transformedHtml);
  
  transformedHtml = normalizeWhitespace(transformedHtml);

  return transformedHtml;
}
