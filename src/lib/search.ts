import { fetchWithTimeout } from './supabase.js';
import { checkFastRateLimit, getClientId } from './fast-rate-limit.js';
import { secureErrorHandler } from './secure-error-handler.js';

export interface SearchResult {
  id: number;
  title: string;
  excerpt: string;
  slug: string;
  type: 'post' | 'category';
  url: string;
  date: string;
  featured_image?: string;
  categories?: string[];
  relevance_score: number;
}

export interface SearchFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'relevance' | 'date' | 'title';
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  filters: SearchFilters;
  suggestions?: string[];
  took: number;
}

export class SearchService {
  private static instance: SearchService;
  private searchCache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private popularQueries = new Map<string, number>();
  private wordpressApiUrl: string;

  private constructor() {
    const domain = import.meta.env.WP_DOMAIN || process.env.WP_DOMAIN || 'cms-iquitostech.com';
    this.wordpressApiUrl = `https://${domain}/wp-json`;
  }

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async search(
    query: string, 
    filters: SearchFilters = {},
    request?: Request,
    clientAddress?: string
  ): Promise<SearchResponse> {
    const startTime = performance.now();

    try {
      if (request && clientAddress) {
        const clientId = getClientId(request, clientAddress);
        const rateLimit = checkFastRateLimit(clientId, 20, 60 * 1000);
        
        if (!rateLimit.allowed) {
          throw new Error('Search rate limit exceeded');
        }
      }

      const sanitizedQuery = this.sanitizeQuery(query);
      if (!sanitizedQuery || sanitizedQuery.length < 2) {
        return this.createEmptyResponse(query, filters, performance.now() - startTime);
      }

      const cacheKey = this.generateCacheKey(sanitizedQuery, filters);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      this.trackQuery(sanitizedQuery);

      const [postResults, categoryResults] = await Promise.all([
        this.searchPosts(sanitizedQuery, filters),
        this.searchCategories(sanitizedQuery)
      ]);

      const allResults = [...postResults, ...categoryResults];
      const rankedResults = this.rankResults(allResults, sanitizedQuery);
      
      const filteredResults = this.applyFilters(rankedResults, filters);
      const paginatedResults = this.paginateResults(filteredResults, filters);

      const response: SearchResponse = {
        results: paginatedResults,
        total: filteredResults.length,
        query: sanitizedQuery,
        filters,
        suggestions: this.generateSuggestions(sanitizedQuery, allResults),
        took: performance.now() - startTime
      };

      this.cacheResponse(cacheKey, response);

      return response;

    } catch (error) {
      console.error('Search error:', error);
      return this.createEmptyResponse(query, filters, performance.now() - startTime);
    }
  }

  private async searchPosts(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    try {
      const searchParams = new URLSearchParams({
        search: query,
        per_page: '50',
        _embed: 'true',
        orderby: 'relevance'
      });

      if (filters.category) {
        searchParams.append('categories', filters.category);
      }

      if (filters.dateFrom) {
        searchParams.append('after', filters.dateFrom);
      }
      if (filters.dateTo) {
        searchParams.append('before', filters.dateTo);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetchWithTimeout(
        `${this.wordpressApiUrl}/wp/v2/posts?${searchParams}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status}`);
      }

      const posts = await response.json();

      return posts.map((post: any): SearchResult => ({
        id: post.id,
        title: this.stripHtml(post.title.rendered),
        excerpt: this.stripHtml(post.excerpt.rendered),
        slug: post.slug,
        type: 'post',
        url: `/posts/${post.slug}`,
        date: post.date,
        featured_image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        categories: post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.name) || [],
        relevance_score: this.calculateRelevance(query, post.title.rendered, post.excerpt.rendered)
      }));

    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  }

  private async searchCategories(query: string): Promise<SearchResult[]> {
    try {
      const searchParams: URLSearchParams = new URLSearchParams({
        search: query,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetchWithTimeout(
        `${this.wordpressApiUrl}/wp/v2/categories?${searchParams}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status}`);
      }

      const categories = await response.json();

      return categories.map((category: any): SearchResult => ({
        id: category.id,
        title: this.stripHtml(category.name),
        excerpt: this.stripHtml(category.description) || `Categoría con ${category.count} artículos`,
        slug: category.slug,
        type: 'category',
        url: `/categoria/${category.slug}`,
        date: '',
        relevance_score: this.calculateRelevance(query, category.name, category.description || '')
      }));

    } catch (error) {
      console.error('Error searching categories:', error);
      return [];
    }
  }

  private calculateRelevance(query: string, title: string, content: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    let score = 0;

    if (titleLower === queryLower) score += 100;
    
    if (titleLower.includes(queryLower)) score += 50;
    
    if (titleLower.startsWith(queryLower)) score += 30;
    
    if (contentLower.includes(queryLower)) score += 20;

    const queryWords = queryLower.split(/\s+/);
    const titleWords = titleLower.split(/\s+/);
    
    queryWords.forEach(word => {
      if (titleWords.includes(word)) score += 10;
      if (contentLower.includes(word)) score += 5;
    });

    return score;
  }

  private rankResults(results: SearchResult[], query: string): SearchResult[] {
    return results.sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }

      if (a.type !== b.type) {
        return a.type === 'category' ? -1 : 1;
      }

      if (a.type === 'post' && b.type === 'post') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      return 0;
    });
  }

  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    let filtered = [...results];

    if (filters.sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } else if (filters.sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }

  private paginateResults(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    const limit = filters.limit || 20;
    return results.slice(0, limit);
  }

  private generateSuggestions(query: string, results: SearchResult[]): string[] {
    const suggestions: Set<string> = new Set();

    results.slice(0, 5).forEach(result => {
      const words = result.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !word.includes(query.toLowerCase())) {
          suggestions.add(word);
        }
      });
    });

    const popularRelated = this.getPopularRelatedQueries(query);
    popularRelated.forEach(q => suggestions.add(q));

    return Array.from(suggestions).slice(0, 5);
  }

  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, '')
      .replace(/[^\w\sáéíóúñü-]/gi, '')
      .substring(0, 100);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  private generateCacheKey(query: string, filters: SearchFilters): string {
    return `search:${query}:${JSON.stringify(filters)}`;
  }

  private getFromCache(cacheKey: string): SearchResponse | null {
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }
    return null;
  }

  private cacheResponse(cacheKey: string, response: SearchResponse): void {
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }

    this.searchCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
  }

  private trackQuery(query: string): void {
    const current = this.popularQueries.get(query) || 0;
    this.popularQueries.set(query, current + 1);
  }

  private getPopularRelatedQueries(query: string): string[] {
    return Array.from(this.popularQueries.entries())
      .filter(([q]) => q.includes(query.toLowerCase()) && q !== query.toLowerCase())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([q]) => q);
  }

  private createEmptyResponse(query: string, filters: SearchFilters, took: number): SearchResponse {
    return {
      results: [],
      total: 0,
      query,
      filters,
      suggestions: [],
      took
    };
  }

  getSearchAnalytics() {
    return {
      popularQueries: Array.from(this.popularQueries.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      cacheSize: this.searchCache.size,
      totalQueries: Array.from(this.popularQueries.values()).reduce((a, b) => a + b, 0)
    };
  }
}

export const searchService = SearchService.getInstance();
