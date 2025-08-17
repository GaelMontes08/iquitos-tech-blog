class SearchComponent {
  constructor(container) {
    this.container = container;
    this.searchInput = container.querySelector('[data-search-input]');
    this.searchButton = container.querySelector('[data-search-button]');
    this.clearButton = container.querySelector('[data-clear-search]');
    this.loadingSpinner = container.querySelector('[data-search-loading]');
    this.filtersContainer = container.querySelector('[data-search-filters]');
    this.filtersToggleButton = container.querySelector('[data-filters-toggle]');
    this.resultsContainer = container.querySelector('[data-search-results]');
    this.suggestionsContainer = container.querySelector('[data-search-suggestions]');
    
    this.categoryFilter = container.querySelector('[data-filter-category]');
    this.dateFromFilter = container.querySelector('[data-filter-date-from]');
    this.dateToFilter = container.querySelector('[data-filter-date-to]');
    this.sortFilter = container.querySelector('[data-filter-sort]');
    this.clearFiltersButton = container.querySelector('[data-clear-filters]');

    this.searchTimeout = null;
    this.currentQuery = '';
    this.isSearching = false;
    this.cache = new Map();
    this.filtersVisible = false;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadCategories();
    this.setupKeyboardNavigation();
    this.setupFiltersToggle();
  }

  setupFiltersToggle() {
    if (this.filtersToggleButton) {
      this.filtersToggleButton.addEventListener('click', () => {
        this.toggleFilters();
      });
    }
  }

  toggleFilters() {
    this.filtersVisible = !this.filtersVisible;
    
    if (this.filtersContainer) {
      if (this.filtersVisible) {
        this.filtersContainer.style.display = 'block';
        this.filtersContainer.style.maxHeight = 'none';
        this.filtersContainer.style.opacity = '1';
        this.filtersContainer.style.transform = 'translateY(0)';
        this.filtersToggleButton.classList.add('active');
        this.filtersToggleButton.textContent = 'Ocultar Filtros';
      } else {
        this.filtersContainer.style.display = 'none';
        this.filtersContainer.style.maxHeight = '0';
        this.filtersContainer.style.opacity = '0';
        this.filtersContainer.style.transform = 'translateY(-10px)';
        this.filtersToggleButton.classList.remove('active');
        this.filtersToggleButton.textContent = 'Mostrar Filtros';
      }
    }
  }

  bindEvents() {
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch();
      } else if (e.key === 'Escape') {
        this.clearResults();
      }
    });

    this.searchInput.addEventListener('focus', () => {
      if (this.currentQuery) {
        this.showResults();
      }
    });

    this.searchButton.addEventListener('click', () => {
      this.performSearch();
    });

    this.clearButton.addEventListener('click', () => {
      this.clearSearch();
    });

    this.clearFiltersButton?.addEventListener('click', () => {
      this.clearFilters();
    });

    if (this.categoryFilter) {
      this.categoryFilter.addEventListener('change', () => {
        if (this.currentQuery) {
          this.performSearch();
        }
      });
    }

    if (this.dateFromFilter) {
      this.dateFromFilter.addEventListener('change', () => {
        if (this.currentQuery) {
          this.performSearch();
        }
      });
    }

    if (this.dateToFilter) {
      this.dateToFilter.addEventListener('change', () => {
        if (this.currentQuery) {
          this.performSearch();
        }
      });
    }

    if (this.sortFilter) {
      this.sortFilter.addEventListener('change', () => {
        if (this.currentQuery) {
          this.performSearch();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  handleSearchInput(value) {
    this.currentQuery = value.trim();
    
    this.updateClearButtonVisibility();
    
    if (this.currentQuery.length === 0) {
      this.clearResults();
      return;
    }

    if (this.currentQuery.length < 2) {
      this.hideResults();
      return;
    }

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  async performSearch() {
    if (!this.currentQuery || this.currentQuery.length < 2) {
      return;
    }

    const cacheKey = this.getCacheKey();
    if (this.cache.has(cacheKey)) {
      this.displayResults(this.cache.get(cacheKey));
      return;
    }

    this.setLoadingState(true);

    try {
      const filters = this.getFilters();
      const searchParams = new URLSearchParams({
        q: this.currentQuery,
        ...filters
      });

      const response = await fetch(`/api/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.cache.set(cacheKey, data);
        
        if (this.cache.size > 50) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }

        this.displayResults(data);
      } else {
        this.showError(data.error || 'Error en la búsqueda');
      }

    } catch (error) {
      console.error('Search error:', error);
      this.showError('Error al realizar la búsqueda. Inténtalo de nuevo.');
    } finally {
      this.setLoadingState(false);
    }
  }

  displayResults(data) {
    if (!data.results || data.results.length === 0) {
      this.showNoResults();
      return;
    }

    const html = this.generateResultsHTML(data);
    this.resultsContainer.innerHTML = html;
    this.showResults();

    if (data.suggestions && data.suggestions.length > 0) {
      this.displaySuggestions(data.suggestions);
    } else {
      this.hideSuggestions();
    }

    this.bindResultEvents();
  }

  generateResultsHTML(data) {
    const { results, total, took } = data;
    
    let html = `
      <div class="search-results-header">
        <div class="search-results-info">
          <span class="results-count">${total} resultado${total !== 1 ? 's' : ''}</span>
          <span class="search-time">(${took.toFixed(0)}ms)</span>
        </div>
      </div>
      <div class="search-results-list">
    `;

    results.forEach(result => {
      html += this.generateResultItemHTML(result);
    });

    html += '</div>';
    return html;
  }

  generateResultItemHTML(result) {
    const typeIcon = result.type === 'category' ? '📁' : '📄';
    const typeLabel = result.type === 'category' ? 'Categoría' : 'Artículo';
    const date = result.date ? new Date(result.date).toLocaleDateString('es-ES') : '';
    
    return `
      <div class="search-result-item" data-result-url="${result.url}">
        <div class="result-header">
          <span class="result-type">${typeIcon} ${typeLabel}</span>
          ${date ? `<span class="result-date">${date}</span>` : ''}
        </div>
        <h3 class="result-title">${this.highlightQuery(result.title)}</h3>
        <p class="result-excerpt">${this.highlightQuery(result.excerpt)}</p>
        ${result.categories && result.categories.length > 0 ? 
          `<div class="result-categories">
            ${result.categories.map(cat => `<span class="result-category">${cat}</span>`).join('')}
          </div>` : ''
        }
      </div>
    `;
  }

  highlightQuery(text) {
    if (!this.currentQuery || !text) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(this.currentQuery)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  displaySuggestions(suggestions) {
    const html = `
      <div class="suggestions-header">
        <h4>Búsquedas relacionadas:</h4>
      </div>
      <div class="suggestions-list">
        ${suggestions.map(suggestion => 
          `<button class="suggestion-item" data-suggestion="${suggestion}">${suggestion}</button>`
        ).join('')}
      </div>
    `;
    
    this.suggestionsContainer.innerHTML = html;
    this.showSuggestions();
    this.bindSuggestionEvents();
  }

  bindResultEvents() {
    const resultItems = this.resultsContainer.querySelectorAll('[data-result-url]');
    resultItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const url = item.dataset.resultUrl;
        window.location.href = url;
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const url = item.dataset.resultUrl;
          window.location.href = url;
        }
      });
    });
  }

  bindSuggestionEvents() {
    const suggestionItems = this.suggestionsContainer.querySelectorAll('[data-suggestion]');
    suggestionItems.forEach(item => {
      item.addEventListener('click', () => {
        const suggestion = item.dataset.suggestion;
        this.searchInput.value = suggestion;
        this.currentQuery = suggestion;
        this.performSearch();
      });
    });
  }

  showNoResults() {
    this.resultsContainer.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>No se encontraron resultados</h3>
        <p>No se encontraron artículos o categorías para "${this.currentQuery}"</p>
        <div class="no-results-suggestions">
          <p>Intenta:</p>
          <ul>
            <li>Verificar la ortografía</li>
            <li>Usar términos más generales</li>
            <li>Usar sinónimos o palabras relacionadas</li>
          </ul>
        </div>
      </div>
    `;
    this.showResults();
    this.hideSuggestions();
  }

  showError(message) {
    this.resultsContainer.innerHTML = `
      <div class="search-error">
        <div class="error-icon">⚠️</div>
        <h3>Error en la búsqueda</h3>
        <p>${message}</p>
        <button class="retry-button" onclick="this.closest('[data-search-container]').searchComponent.performSearch()">
          Intentar de nuevo
        </button>
      </div>
    `;
    this.showResults();
  }

  // Filter management
  getFilters() {
    const filters = {};
    
    if (this.categoryFilter?.value) {
      filters.category = this.categoryFilter.value;
    }
    
    if (this.dateFromFilter?.value) {
      filters.date_from = this.dateFromFilter.value;
    }
    
    if (this.dateToFilter?.value) {
      filters.date_to = this.dateToFilter.value;
    }
    
    if (this.sortFilter?.value && this.sortFilter.value !== 'relevance') {
      filters.sort = this.sortFilter.value;
    }
    
    return filters;
  }

  clearFilters() {
    if (this.categoryFilter) this.categoryFilter.value = '';
    if (this.dateFromFilter) this.dateFromFilter.value = '';
    if (this.dateToFilter) this.dateToFilter.value = '';
    if (this.sortFilter) this.sortFilter.value = 'relevance';
    
    if (this.currentQuery) {
      this.performSearch();
    }
  }

  async loadCategories() {
    if (!this.categoryFilter) return;
    
    try {
      const response = await fetch('/api/wordpress/categories');
      if (response.ok) {
        const categories = await response.json();
        
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          this.categoryFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  setLoadingState(loading) {
    this.isSearching = loading;
    
    if (loading) {
      this.loadingSpinner.classList.remove('hidden');
      this.searchButton.disabled = true;
    } else {
      this.loadingSpinner.classList.add('hidden');
      this.searchButton.disabled = false;
    }
  }

  updateClearButtonVisibility() {
    if (this.currentQuery.length > 0) {
      this.clearButton.classList.remove('hidden');
    } else {
      this.clearButton.classList.add('hidden');
    }
  }

  showResults() {
    this.resultsContainer.classList.remove('hidden');
  }

  hideResults() {
    this.resultsContainer.classList.add('hidden');
  }

  showSuggestions() {
    this.suggestionsContainer.classList.remove('hidden');
  }

  hideSuggestions() {
    this.suggestionsContainer.classList.add('hidden');
  }

  clearResults() {
    this.resultsContainer.innerHTML = '';
    this.hideResults();
    this.hideSuggestions();
  }

  clearSearch() {
    this.searchInput.value = '';
    this.currentQuery = '';
    this.clearResults();
    this.updateClearButtonVisibility();
    this.searchInput.focus();
  }

  getCacheKey() {
    const filters = this.getFilters();
    return `${this.currentQuery}:${JSON.stringify(filters)}`;
  }

  setupKeyboardNavigation() {
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.focusFirstResult();
      }
    });
  }

  focusFirstResult() {
    const firstResult = this.resultsContainer.querySelector('[data-result-url]');
    if (firstResult) {
      firstResult.focus();
      firstResult.tabIndex = 0;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchContainers = document.querySelectorAll('[data-search-container]');
  searchContainers.forEach(container => {
    container.searchComponent = new SearchComponent(container);
  });
});

const style = document.createElement('style');
style.textContent = `
  /* Filters container transition styles */
  [data-search-filters] {
    transition: all 0.3s ease-in-out;
    overflow: hidden;
  }

  .search-results-header {
    padding: 1rem;
    border-bottom: 1px solid #374151;
  }

  .search-results-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .results-count {
    font-weight: 500;
    color: #e5e7eb;
  }

  .search-results-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .search-result-item {
    padding: 1rem;
    border-bottom: 1px solid #374151;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .search-result-item:hover {
    background: #374151;
  }

  .search-result-item:focus {
    background: #4b5563;
    outline: 2px solid #2847d7;
    outline-offset: -2px;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .result-type {
    font-size: 0.75rem;
    font-weight: 500;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .result-date {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .result-title {
    font-size: 1rem;
    font-weight: 600;
    color: #f9fafb;
    margin: 0 0 0.5rem 0;
  }

  .result-excerpt {
    font-size: 0.875rem;
    color: #d1d5db;
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .result-categories {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .result-category {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: rgba(40, 71, 215, 0.2);
    color: #93c5fd;
    border-radius: 0.25rem;
    border: 1px solid rgba(40, 71, 215, 0.3);
  }

  .no-results,
  .search-error {
    padding: 2rem;
    text-align: center;
    background: #1f2937;
    color: #e5e7eb;
  }

  .no-results-icon,
  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-results h3,
  .search-error h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f9fafb;
    margin: 0 0 0.5rem 0;
  }

  .no-results p,
  .search-error p {
    color: #d1d5db;
    margin: 0 0 1rem 0;
  }

  .no-results-suggestions {
    text-align: left;
    max-width: 300px;
    margin: 0 auto;
  }

  .no-results-suggestions ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: #d1d5db;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    background: #2847d7;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .retry-button:hover {
    background: #1e40af;
  }

  .suggestions-header h4 {
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    margin: 0 0 0.5rem 0;
  }

  .suggestions-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .suggestion-item {
    padding: 0.25rem 0.75rem;
    border: 1px solid #2847d7;
    border-radius: 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #e5e7eb;
  }

  .suggestion-item:hover {
    background: #101828;
  }

  mark {
    color: #fbbf24;
    padding: 0 0.125rem;
    border-radius: 0.125rem;
  }

  /* Scrollbar styling for search results */
  .search-results-list::-webkit-scrollbar {
    width: 8px;
  }

  .search-results-list::-webkit-scrollbar-track {
    background: #374151;
    border-radius: 4px;
  }

  .search-results-list::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 4px;
  }

  .search-results-list::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

document.head.appendChild(style);
