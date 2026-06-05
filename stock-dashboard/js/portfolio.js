/**
 * portfolio.js - Portfolio Tracker Module
 * 
 * Full portfolio management with position tracking, P/L calculations,
 * allocation donut chart, add/remove via modal, and localStorage persistence.
 * 
 * Exposed as: window.Portfolio
 * Dependencies: window.StockData, window.StockChart, window.App (formatCurrency)
 * 
 * DOM targets:
 *   #portfolio-summary   - Summary cards container
 *     #total-value        - Total portfolio value
 *     #total-pl           - Total profit/loss amount
 *     #total-pl-pct       - Total P/L percentage
 *     #daily-pl           - Today's P/L
 *   #portfolio-chart      - Canvas for donut chart
 *   #portfolio-body       - <tbody> for positions table
 *   #add-position         - Button to open add-position modal
 *   #add-position-modal   - Modal container
 *   .modal-overlay        - Backdrop overlay
 *   #position-form        - Form inside modal
 *   #position-symbol      - Symbol <select>
 *   #position-shares      - Shares <input>
 *   #position-price       - Avg cost <input>
 *   #cancel-position      - Cancel button
 */

window.Portfolio = {

    /** @type {{ symbol: string, shares: number, avgCost: number }[]} */
    positions: [],

    /** @type {Chart|null} Chart.js donut instance */
    donutChart: null,

    /** Distinct colors for donut chart slices */
    COLORS: [
        '#58a6ff', '#3fb950', '#f85149', '#d29922', '#bc8cff',
        '#f778ba', '#79c0ff', '#56d364', '#ff7b72', '#e3b341'
    ],


    // ═══════════════════════════════════════════════════════════════
    //  INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    init() {
        // Attempt to restore positions from localStorage
        const saved = localStorage.getItem('portfolio');

        if (saved) {
            try {
                this.positions = JSON.parse(saved);
            } catch (e) {
                console.warn('[Portfolio] Corrupt localStorage data, using defaults.');
                this.positions = this._getDefaultPositions();
            }
        } else {
            // First visit → seed with demo positions
            this.positions = this._getDefaultPositions();
        }

        this.renderPortfolio();
        this.initModal();
        this.populateSymbolSelect();
    },

    /** Default demo portfolio for first-time visitors */
    _getDefaultPositions() {
        return [
            { symbol: 'AOT',  shares: 1000, avgCost: 60.00  },
            { symbol: 'PTT',  shares: 2000, avgCost: 32.50  },
            { symbol: 'AAPL', shares: 50,   avgCost: 185.00 },
            { symbol: 'NVDA', shares: 100,  avgCost: 120.00 },
            { symbol: 'MSFT', shares: 30,   avgCost: 420.00 }
        ];
    },


    // ═══════════════════════════════════════════════════════════════
    //  RENDERING - MASTER
    // ═══════════════════════════════════════════════════════════════

    renderPortfolio() {
        this.renderSummary();
        this.renderTable();
        this.renderChart();
    },


    // ═══════════════════════════════════════════════════════════════
    //  RENDERING - SUMMARY CARDS
    // ═══════════════════════════════════════════════════════════════

    renderSummary() {
        let totalValue = 0;
        let totalCost  = 0;
        let dailyPL    = 0;

        this.positions.forEach(pos => {
            const stock = this._findStock(pos.symbol);
            if (!stock) return;

            const currentPrice = stock.price;
            const posValue     = pos.shares * currentPrice;
            const posCost      = pos.shares * pos.avgCost;

            totalValue += posValue;
            totalCost  += posCost;
            dailyPL    += pos.shares * stock.change;
        });

        const totalPL    = totalValue - totalCost;
        const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

        // Format helper (falls back to basic formatting if App isn't loaded yet)
        const fmt = (val) => {
            if (window.App && window.App.formatCurrency) {
                return window.App.formatCurrency(val);
            }
            return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // ── Update DOM ──
        const elTotalValue  = document.getElementById('total-value');
        const elTotalPL     = document.getElementById('total-pl');
        const elTotalPLPct  = document.getElementById('total-pl-pct');
        const elDailyPL     = document.getElementById('daily-pl');

        if (elTotalValue)  elTotalValue.textContent  = `฿${fmt(totalValue)}`;

        if (elTotalPL) {
            const sign = totalPL >= 0 ? '+' : '';
            elTotalPL.textContent = `${sign}${fmt(totalPL)}`;
            elTotalPL.className   = totalPL >= 0 ? 'summary-value text-green' : 'summary-value text-red';
        }

        if (elTotalPLPct) {
            const sign = totalPLPct >= 0 ? '+' : '';
            elTotalPLPct.textContent = `${sign}${totalPLPct.toFixed(2)}%`;
            elTotalPLPct.className   = totalPLPct >= 0 ? 'summary-value text-green' : 'summary-value text-red';
        }

        if (elDailyPL) {
            const sign = dailyPL >= 0 ? '+' : '';
            elDailyPL.textContent = `${sign}${fmt(dailyPL)}`;
            elDailyPL.className   = dailyPL >= 0 ? 'summary-value text-green' : 'summary-value text-red';
        }
    },


    // ═══════════════════════════════════════════════════════════════
    //  RENDERING - POSITIONS TABLE
    // ═══════════════════════════════════════════════════════════════

    renderTable() {
        const tbody = document.getElementById('portfolio-body');
        if (!tbody) return;

        if (this.positions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:32px; color:#8b949e;">
                        No positions yet. Click "Add Position" to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.positions.map((pos, index) => {
            const stock = this._findStock(pos.symbol);
            if (!stock) {
                return `
                    <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
                        <td class="font-mono">${pos.symbol}</td>
                        <td colspan="6" style="color:#8b949e;">Stock data not found</td>
                        <td>
                            <button class="btn-delete" onclick="Portfolio.removePosition('${pos.symbol}')" title="Remove position">
                                ✕
                            </button>
                        </td>
                    </tr>
                `;
            }

            const currentPrice = stock.price;
            const value        = pos.shares * currentPrice;
            const cost         = pos.shares * pos.avgCost;
            const pl           = value - cost;
            const plPct        = pos.avgCost > 0 ? ((currentPrice - pos.avgCost) / pos.avgCost) * 100 : 0;
            const plClass      = pl >= 0 ? 'text-green' : 'text-red';
            const plSign       = pl >= 0 ? '+' : '';

            return `
                <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
                    <td>
                        <div class="symbol-cell">
                            <span class="symbol-name">${pos.symbol}</span>
                            <span class="symbol-market">${stock.market || ''}</span>
                        </div>
                    </td>
                    <td class="font-mono text-right">${pos.shares.toLocaleString()}</td>
                    <td class="font-mono text-right">${pos.avgCost.toFixed(2)}</td>
                    <td class="font-mono text-right">${currentPrice.toFixed(2)}</td>
                    <td class="font-mono text-right">${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td class="font-mono text-right ${plClass}">${plSign}${pl.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td class="font-mono text-right ${plClass}">${plSign}${plPct.toFixed(2)}%</td>
                    <td class="text-center">
                        <button class="btn-delete" onclick="Portfolio.removePosition('${pos.symbol}')" title="Remove position">
                            ✕
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },


    // ═══════════════════════════════════════════════════════════════
    //  RENDERING - DONUT CHART
    // ═══════════════════════════════════════════════════════════════

    renderChart() {
        const canvas = document.getElementById('portfolio-chart');
        if (!canvas) return;

        // Destroy previous chart instance to avoid canvas reuse errors
        if (this.donutChart) {
            this.donutChart.destroy();
            this.donutChart = null;
        }

        // Calculate allocation percentages by current value
        let totalValue = 0;
        const allocations = [];

        this.positions.forEach(pos => {
            const stock = this._findStock(pos.symbol);
            if (!stock) return;

            const value = pos.shares * stock.price;
            totalValue += value;
            allocations.push({ symbol: pos.symbol, value: value });
        });

        if (totalValue === 0 || allocations.length === 0) return;

        // Convert to percentages
        const labels = allocations.map(a => a.symbol);
        const data   = allocations.map(a => (a.value / totalValue) * 100);
        const colors = allocations.map((_, i) => this.COLORS[i % this.COLORS.length]);

        // Create the donut chart via StockChart utility
        this.donutChart = window.StockChart.createDonutChart(
            'portfolio-chart',
            labels,
            data,
            colors
        );
    },


    // ═══════════════════════════════════════════════════════════════
    //  MODAL - ADD POSITION
    // ═══════════════════════════════════════════════════════════════

    initModal() {
        const addBtn       = document.getElementById('add-position');
        const modal        = document.getElementById('add-position-modal');
        const overlay      = modal ? modal.querySelector('.modal-overlay') : null;
        const cancelBtn    = document.getElementById('cancel-position');
        const form         = document.getElementById('position-form');

        if (!modal) return;

        // Open modal
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
                // Reset form fields
                if (form) form.reset();
                // Focus the first input
                const symbolSelect = document.getElementById('position-symbol');
                if (symbolSelect) symbolSelect.focus();
            });
        }

        // Close modal – cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        // Close modal – overlay click
        if (overlay) {
            overlay.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        // Close modal – Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });

        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const symbol  = document.getElementById('position-symbol').value;
                const shares  = parseFloat(document.getElementById('position-shares').value);
                const avgCost = parseFloat(document.getElementById('position-price').value);

                // Validate inputs
                if (!symbol) {
                    this._showFormError('Please select a symbol.');
                    return;
                }
                if (isNaN(shares) || shares <= 0) {
                    this._showFormError('Please enter a valid number of shares.');
                    return;
                }
                if (isNaN(avgCost) || avgCost <= 0) {
                    this._showFormError('Please enter a valid average cost.');
                    return;
                }

                this.addPosition(symbol, shares, avgCost);
            });
        }
    },

    /** Simple inline form error (uses native alert as fallback) */
    _showFormError(message) {
        // Try to find or create an error element in the form
        const form = document.getElementById('position-form');
        let errorEl = form ? form.querySelector('.form-error') : null;

        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
        } else {
            alert(message);
        }
    },


    // ═══════════════════════════════════════════════════════════════
    //  SYMBOL SELECT - POPULATE
    // ═══════════════════════════════════════════════════════════════

    populateSymbolSelect() {
        const select = document.getElementById('position-symbol');
        if (!select || !StockData || !StockData.stocks) return;

        // Group stocks by market
        const grouped = {};
        StockData.stocks.forEach(stock => {
            const market = stock.market || 'Other';
            if (!grouped[market]) grouped[market] = [];
            grouped[market].push(stock);
        });

        // Build <optgroup> elements for each market
        let html = '<option value="">Select symbol...</option>';

        Object.keys(grouped).sort().forEach(market => {
            html += `<optgroup label="${market}">`;
            grouped[market]
                .sort((a, b) => a.symbol.localeCompare(b.symbol))
                .forEach(stock => {
                    html += `<option value="${stock.symbol}">${stock.symbol} - ${stock.name}</option>`;
                });
            html += `</optgroup>`;
        });

        select.innerHTML = html;
    },


    // ═══════════════════════════════════════════════════════════════
    //  POSITION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add a new position or update existing one (weighted average cost).
     * 
     * @param {string} symbol  - Stock symbol
     * @param {number} shares  - Number of shares
     * @param {number} avgCost - Average cost per share
     */
    addPosition(symbol, shares, avgCost) {
        const existing = this.positions.find(p => p.symbol === symbol);

        if (existing) {
            // Weighted average cost calculation
            const totalShares = existing.shares + shares;
            const totalCost   = (existing.shares * existing.avgCost) + (shares * avgCost);
            existing.shares   = totalShares;
            existing.avgCost  = totalCost / totalShares;
        } else {
            this.positions.push({ symbol, shares, avgCost });
        }

        this.savePortfolio();
        this.renderPortfolio();

        // Close the modal
        const modal = document.getElementById('add-position-modal');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * Remove a position by symbol.
     * 
     * @param {string} symbol - Stock symbol to remove
     */
    removePosition(symbol) {
        const index = this.positions.findIndex(p => p.symbol === symbol);
        if (index === -1) return;

        this.positions.splice(index, 1);
        this.savePortfolio();
        this.renderPortfolio();
    },


    // ═══════════════════════════════════════════════════════════════
    //  LIVE UPDATE HOOK
    // ═══════════════════════════════════════════════════════════════

    /**
     * Called by App when simulated prices change.
     * Re-renders summary and table only (chart is too expensive to
     * rebuild on every tick).
     */
    updatePrices() {
        this.renderSummary();
        this.renderTable();
    },


    // ═══════════════════════════════════════════════════════════════
    //  PERSISTENCE
    // ═══════════════════════════════════════════════════════════════

    /** Save current positions array to localStorage */
    savePortfolio() {
        try {
            localStorage.setItem('portfolio', JSON.stringify(this.positions));
        } catch (e) {
            console.warn('[Portfolio] Failed to save to localStorage:', e);
        }
    },


    // ═══════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Look up a stock in StockData.stocks by symbol.
     * 
     * @param {string} symbol
     * @returns {object|undefined} Stock data object or undefined
     */
    _findStock(symbol) {
        if (!StockData || !StockData.stocks) return undefined;
        return StockData.stocks.find(s => s.symbol === symbol);
    }
};
