/**
 * news.js - News Feed Module
 * 
 * Renders a filterable news grid with gradient-header cards,
 * staggered fade-in animations, and category filtering.
 * 
 * Exposed as: window.News
 * Dependencies: window.StockData (mock data)
 * 
 * DOM targets:
 *   #news-grid                           - Main grid container
 *   .filter-btn[data-category]           - Category filter buttons (inside #section-news)
 */

window.News = {

    /** Currently active filter category ('all' | 'stocks' | 'crypto' | 'economy') */
    currentCategory: 'all',


    // ─── Initialization ───────────────────────────────────────────
    init() {
        this.renderNews();
        this.initFilters();
    },


    // ─── Render News Cards ────────────────────────────────────────
    // Builds the news grid from StockData.news, optionally filtered
    // by category. Each card has a gradient header, icon, badge,
    // title, summary, and metadata row.
    //
    // @param {string} category - Filter key ('all' shows everything)
    renderNews(category = 'all') {
        const container = document.getElementById('news-grid');
        if (!container) return;

        // Filter news items by category
        const news = category === 'all'
            ? StockData.news
            : StockData.news.filter(n => n.category === category);

        // Handle empty state
        if (!news || news.length === 0) {
            container.innerHTML = `
                <div class="news-empty">
                    <span class="news-empty-icon">📭</span>
                    <p>No news articles found for this category.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = news.map((item, index) => `
            <article class="news-card" style="animation-delay: ${index * 0.1}s">
                <div class="news-image" style="background: linear-gradient(135deg, ${this.getCategoryGradient(item.category)})">
                    <span class="news-category-badge">${item.category}</span>
                    <span class="news-icon">${this.getCategoryIcon(item.category)}</span>
                </div>
                <div class="news-body">
                    <h4 class="news-title">${item.title}</h4>
                    <p class="news-summary">${item.summary}</p>
                    <div class="news-meta">
                        <span class="news-source">${item.source}</span>
                        <span class="news-time">${item.time}</span>
                    </div>
                </div>
            </article>
        `).join('');
    },


    // ─── Category Icons ───────────────────────────────────────────
    // Returns an emoji icon matching the news category.
    //
    // @param {string} category
    // @returns {string} Emoji character
    getCategoryIcon(category) {
        const icons = {
            stocks:  '📈',
            crypto:  '₿',
            economy: '🏛️',
            tech:    '💻',
            energy:  '⚡',
            forex:   '💱'
        };
        return icons[category] || '📰';
    },


    // ─── Category Gradients ──────────────────────────────────────
    // Returns CSS gradient color stops for the card header area.
    // Each category has a distinct color scheme for visual scanning.
    //
    // @param {string} category
    // @returns {string} CSS gradient stops (used inside linear-gradient())
    getCategoryGradient(category) {
        const gradients = {
            stocks:  '#1a3a5c, #264d73',       // Deep blue tones
            crypto:  '#3d1f56, #6b3fa0',       // Purple → violet
            economy: '#1a3d2e, #2d6b4f',       // Forest green tones
            tech:    '#1f2d5c, #3a4f8f',       // Steel blue
            energy:  '#5c3a1a, '#8f6b3a',      // Amber / warm
            forex:   '#2d1f3d, '#4f3a6b'       // Dark purple
        };
        return gradients[category] || '#1c2128, #2d333b';  // Neutral fallback
    },


    // ─── Filter Buttons ──────────────────────────────────────────
    // Attaches click handlers to .filter-btn[data-category] elements
    // inside #section-news. Toggles active class and re-renders the
    // news grid with the selected category.
    initFilters() {
        const newsSection = document.getElementById('section-news');
        if (!newsSection) return;

        const filterBtns = newsSection.querySelectorAll('.filter-btn[data-category]');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category');

                // Guard: don't re-render if same category
                if (category === this.currentCategory) return;

                // Update active state on buttons
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Store and render
                this.currentCategory = category;
                this.renderNews(category);
            });
        });
    }
};
