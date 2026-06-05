/**
 * chart.js - Chart Utility Module
 * 
 * Provides helper functions for rendering sparklines (canvas 2D)
 * and donut charts (Chart.js) throughout the dashboard.
 * 
 * Exposed as: window.StockChart
 * Dependencies: Chart.js (loaded via CDN in HTML)
 */

window.StockChart = {

    // ─── Sparkline ────────────────────────────────────────────────
    // Draws a mini sparkline on a <canvas> element using raw Canvas 2D API.
    // Used in watchlist cards, market overview, and portfolio rows.
    //
    // @param {HTMLCanvasElement} canvas  - The target canvas element
    // @param {number[]}         data    - Array of numeric values to plot
    // @param {string}           color   - Stroke color (CSS color string)
    // @param {string}           fillColor - Fill color beneath the line
    drawSparkline(canvas, data, color = '#3fb950', fillColor = 'rgba(63,185,80,0.1)') {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear any previous drawing
        ctx.clearRect(0, 0, width, height);

        // Need at least 2 points to draw a line
        if (!data || data.length < 2) return;

        // Calculate value range for normalization
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1; // Avoid division by zero
        const step = width / (data.length - 1);

        // ── Filled area beneath the line ──
        ctx.beginPath();
        ctx.moveTo(0, height - ((data[0] - min) / range) * height * 0.8 - height * 0.1);

        data.forEach((val, i) => {
            const x = i * step;
            const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
            ctx.lineTo(x, y);
        });

        // Close the fill path along the bottom edge
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // ── Stroke line on top ──
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = i * step;
            const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    },


    // ─── Donut Chart (Chart.js) ───────────────────────────────────
    // Creates a doughnut chart for the portfolio allocation view.
    // Requires Chart.js to be loaded globally.
    //
    // @param {string}   canvasId - ID of the <canvas> element
    // @param {string[]} labels   - Slice labels (e.g. stock symbols)
    // @param {number[]} data     - Slice values (e.g. percentages)
    // @param {string[]} colors   - Background colors for each slice
    // @returns {Chart}           - The Chart.js instance (for later .destroy())
    createDonutChart(canvasId, labels, data, colors) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#161b22',   // Match card background for clean gaps
                    borderWidth: 3,
                    hoverBorderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',                // Thin donut ring
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#c9d1d9',
                            font: {
                                family: 'Inter',
                                size: 13
                            },
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1c2128',
                        titleColor: '#c9d1d9',
                        bodyColor: '#8b949e',
                        borderColor: '#30363d',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: (tooltipCtx) => ` ${tooltipCtx.label}: ${tooltipCtx.parsed.toFixed(2)}%`
                        }
                    }
                }
            }
        });
    }
};
