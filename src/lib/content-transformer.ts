/**
 * Content transformation utilities for WordPress content
 * Handles cleaning and styling of WordPress HTML content
 */

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
 * Combines all transformation steps for cleaner, styled content
 * @param html - Raw WordPress HTML content
 * @returns Cleaned and styled HTML content
 */
export function cleanWordPressHtml(html: string): string {
  if (!html) return '';

  // Apply transformations in sequence
  let transformedHtml = html;
  
  // Step 1: Remove WordPress-specific classes and attributes
  transformedHtml = removeWordPressClasses(transformedHtml);
  
  // Step 2: Apply Tailwind styling
  transformedHtml = applyTailwindStyles(transformedHtml);
  
  // Step 3: Normalize whitespace
  transformedHtml = normalizeWhitespace(transformedHtml);

  return transformedHtml;
}
