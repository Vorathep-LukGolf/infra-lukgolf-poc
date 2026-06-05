// ============================================================================
// app.js — Main Application Controller
// Manages navigation, clock, ticker tape, price simulation, and module init
// ============================================================================

window.App = {
    currentSection: 'dashboard',
    priceUpdateInterval: null,

    // ────────────────────────────────────────────────────────────────────────
    // Bootstrap
    // ────────────────────────────────────────────────────────────────────────
    init() {
        console.log('[App] Initializing Stock Dashboard…');

        // Core UI
        this.initNavigation();
        this.initClock();
        this.initTickerTape();

        // Sub-modules (order matters — Market before Watchlist so data is ready)
        if (window.Market)    window.Market.init();
        if (window.Watchlist) window.Watchlist.init();
        if (window.News)      window.News.init();
        if (window.Portfolio)  window.Portfolio.init();

        // Live-ish price updates
        this.startPriceSimulation();

        // Default view
        this.showSection('dashboard');

        console.log('[App] Dashboard ready ✓');
    },

    // ────────────────────────────────────────────────────────────────────────
    // Navigation
    // ────────────────────────────────────────────────────────────────────────
    initNavigation() {
        // Sidebar nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) this.showSection(section);
            });
        });

        // Sidebar collapse / expand toggle
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar   = document.getElementById('sidebar');
        const main      = document.getElementById('main-content');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                if (main) main.classList.toggle('collapsed');
            });
        }
    },

    showSection(sectionId) {
        // Hide every section
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });

        // Show target
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Update active nav state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
        });

        this.currentSection = sectionId;
    },

    // ────────────────────────────────────────────────────────────────────────
    // Live Clock
    // ────────────────────────────────────────────────────────────────────────
    initClock() {
        const clockEl = document.getElementById('clock');
        if (!clockEl) return;

        const tick = () => {
            const now = new Date();
            const hh  = String(now.getHours()).padStart(2, '0');
            const mm  = String(now.getMinutes()).padStart(2, '0');
            const ss  = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${hh}:${mm}:${ss}`;
        };

        tick();                    // immediate first render
        setInterval(tick, 1000);   // then every second
    },

    // ────────────────────────────────────────────────────────────────────────
    // Ticker Tape (horizontal scrolling index bar)
    // ────────────────────────────────────────────────────────────────────────
    initTickerTape() {
        const container = document.getElementById('ticker-content');
        if (!container || !window.StockData) return;

        const indices = window.StockData.indices || [];

        // Build a single "set" of ticker items
        const buildItems = () => {
            return indices.map(idx => {
                const change  = idx.change  || 0;
                const pct     = idx.changePercent || 0;
                const sign    = change >= 0 ? '+' : '';
                const cls     = change >= 0 ? 'gain' : 'loss';

                return `<div class="ticker-item">
                    <span class="ticker-symbol">${idx.symbol}</span>
                    <span class="ticker-price font-mono">${this.formatNumber(idx.price)}</span>
                    <span class="ticker-change ${cls}">${sign}${this.formatNumber(change)} (${sign}${this.formatNumber(pct)}%)</span>
                </div>`;
            }).join('');
        };

        // Duplicate content so the CSS translateX animation loops seamlessly
        const itemsHTML = buildItems();
        container.innerHTML = itemsHTML + itemsHTML;
    },

    // ────────────────────────────────────────────────────────────────────────
    // Price Simulation
    // ────────────────────────────────────────────────────────────────────────
    startPriceSimulation() {
        if (!window.StockData || typeof window.StockData.simulatePriceUpdate !== 'function') {
            console.warn('[App] StockData.simulatePriceUpdate not available — skipping simulation');
            return;
        }

        // Gather all available stock symbols
        const allSymbols = [
            ...(window.StockData.thaiStocks || []).map(s => s.symbol),
            ...(window.StockData.usStocks   || []).map(s => s.symbol),
        ];

        if (allSymbols.length === 0) return;

        this.priceUpdateInterval = setInterval(() => {
            // Pick 3–5 random stocks
            const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
            const picks = [];
            for (let i = 0; i < count; i++) {
                picks.push(allSymbols[Math.floor(Math.random() * allSymbols.length)]);
            }

            picks.forEach(symbol => {
                window.StockData.simulatePriceUpdate(symbol);

                // Notify Watchlist
                if (window.Watchlist && typeof window.Watchlist.updateRow === 'function') {
                    window.Watchlist.updateRow(symbol);
                }
            });

            // Bulk portfolio update (once per tick, not per symbol)
            if (window.Portfolio && typeof window.Portfolio.updatePrices === 'function') {
                window.Portfolio.updatePrices();
            }

            // Refresh index cards
            if (window.Market && typeof window.Market.updateIndices === 'function') {
                window.Market.updateIndices();
            }
        }, 3000);
    },

    // ────────────────────────────────────────────────────────────────────────
    // Formatting Helpers
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Format a number with commas and fixed decimals
     * @param {number} num
     * @param {number} decimals
     * @returns {string}
     */
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '—';
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    },

    /**
     * Format large volumes to human-readable strings (45.2M, 1.2B, etc.)
     * @param {number} vol
     * @returns {string}
     */
    formatVolume(vol) {
        if (vol === null || vol === undefined || isNaN(vol)) return '—';
        const abs = Math.abs(vol);
        if (abs >= 1e12) return (vol / 1e12).toFixed(2) + 'T';
        if (abs >= 1e9)  return (vol / 1e9).toFixed(2)  + 'B';
        if (abs >= 1e6)  return (vol / 1e6).toFixed(1)   + 'M';
        if (abs >= 1e3)  return (vol / 1e3).toFixed(1)   + 'K';
        return vol.toString();
    },

    /**
     * Format as currency string
     * @param {number} amount
     * @param {string} currency  prefix character
     * @returns {string}
     */
    formatCurrency(amount, currency = '฿') {
        if (amount === null || amount === undefined || isNaN(amount)) return '—';
        return `${currency}${this.formatNumber(amount)}`;
    },
};

// ============================================================================
// Bootstrap on DOM ready
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});
