// content.js

(function () {
	// Function to check if a string is a numerical value
	function isNumeric(value) {
		return !isNaN(parseFloat(value)) && isFinite(value);
	}

		// Function to create a tooltip
		function createTooltip(text) {
			const tooltip = document.createElement('div');
			tooltip.className = 'median-cagr-tooltip';
			tooltip.textContent = text;
			document.body.appendChild(tooltip);
			return tooltip;
		}

		function createPointerIndicator() {
			const existingIndicators = document.querySelectorAll('.cagr-pointer-indicator');
			if (existingIndicators.length) {
				existingIndicators.forEach((node, index) => {
					if (index > 0) {
						node.remove();
					}
				});
				const indicator = existingIndicators[0];
				indicator.innerHTML = `
					<span class="cagr-pointer-icon" aria-hidden="true">🧮</span>
				`;
				return indicator;
			}

			const indicator = document.createElement('div');
			indicator.className = 'cagr-pointer-indicator';
			indicator.innerHTML = `
				<span class="cagr-pointer-icon" aria-hidden="true">🧮</span>
			`;
			document.body.appendChild(indicator);
			return indicator;
		}

		// Style for the tooltip
		const style = document.createElement('style');
	style.textContent = `
    .median-cagr-tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 13px;
      pointer-events: none;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    }
    tr.clickable-row {
      cursor: default;
    }
    .cagr-highlight-cell {
      background-color: rgba(255, 235, 59, 0.45) !important;
    }
    .cagr-pointer-indicator {
      position: absolute;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.72);
      color: #fefefe;
      font-size: 11px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      pointer-events: none;
      z-index: 10001;
      transform: translate(0, 0);
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .cagr-pointer-indicator.is-visible {
      opacity: 1;
    }
    .cagr-pointer-icon {
      font-size: 12px;
      line-height: 1;
    }
  `;
	document.head.appendChild(style);

	// Keywords that indicate the first data column should be skipped
	const SKIP_COLUMN_KEYWORDS = [
		'ttm',
		'ltm',
		'ntm',
		'current',
		'latest',
		'trailing twelve',
		'last twelve',
		'forward',
		'next twelve',
		'mrq',
	];

	const skipFirstDataColumnCache = new WeakMap();

	function normalizeHeaderText(text) {
		return (text || '').toLowerCase();
	}

	function shouldSkipFirstDataColumn(table) {
		if (!table) return false;
		if (skipFirstDataColumnCache.has(table)) {
			return skipFirstDataColumnCache.get(table);
		}

		const rows = table.tHead
			? Array.from(table.tHead.querySelectorAll('tr'))
			: Array.from(table.querySelectorAll('tr'));

		const columnTexts = [];

		rows.forEach((row) => {
			const cells = Array.from(row.children);
			const hasHeader = cells.some((cell) => cell.tagName === 'TH');

			if (!hasHeader) {
				return;
			}

			let columnPosition = 0;

			cells.forEach((cell) => {
				const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10) || 1;

				if (cell.tagName === 'TH') {
					const text = (cell.textContent || '').trim();
					for (let spanIndex = 0; spanIndex < colSpan; spanIndex += 1) {
						const targetIndex = columnPosition + spanIndex;
						if (!columnTexts[targetIndex]) {
							columnTexts[targetIndex] = [];
						}
						if (text) {
							columnTexts[targetIndex].push(text);
						}
					}
				}

				columnPosition += colSpan;
			});
		});

		const firstDataColumnText = (columnTexts[1] || []).join(' ');
		const normalizedFirstColumnText = normalizeHeaderText(firstDataColumnText);

		let shouldSkip = SKIP_COLUMN_KEYWORDS.some((keyword) =>
			normalizedFirstColumnText.includes(keyword)
		);

		if (!shouldSkip) {
			const allHeaderText = normalizeHeaderText(
				Array.from(table.querySelectorAll('th'))
					.map((th) => th.textContent || '')
					.join(' ')
			);
			shouldSkip = SKIP_COLUMN_KEYWORDS.some((keyword) =>
				allHeaderText.includes(keyword)
			);
		}

		skipFirstDataColumnCache.set(table, shouldSkip);
		return shouldSkip;
	}

	// Function to calculate the median
	function calculateMedian(values) {
		if (values.length === 0) return null;

		// Sort the values
		const sortedValues = [...values].sort((a, b) => a - b);

		const half = Math.floor(sortedValues.length / 2);

		if (sortedValues.length % 2) {
			return sortedValues[half];
		}

		return (sortedValues[half - 1] + sortedValues[half]) / 2.0;
	}

	// Function to calculate CAGR
	function calculateCAGR(values) {
		if (values.length < 2) return null;

		const n = values.length - 1;
		const startValue = values[0];
		const endValue = values[values.length - 1];

		if (startValue <= 0 || endValue <= 0) return null;

		return Math.pow(endValue / startValue, 1 / n) - 1;
	}

	let activeTooltip = null;
	let activeTooltipRow = null;
	let activeHighlightCells = [];
	const pointerIndicator = createPointerIndicator();
	pointerIndicator.classList.add('is-visible');

	function clearActiveHighlight() {
		const highlightedCells = document.querySelectorAll('.cagr-highlight-cell');
		if (highlightedCells.length) {
			highlightedCells.forEach((cell) => cell.classList.remove('cagr-highlight-cell'));
		}
		activeHighlightCells = [];
	}

	function applyHighlight(cells) {
		if (!cells.length) {
			activeHighlightCells = [];
			return;
		}

		const uniqueCells = Array.from(new Set(cells));
		activeHighlightCells = uniqueCells;
		activeHighlightCells.forEach((cell) => {
			cell.classList.add('cagr-highlight-cell');
		});
	}

	function hideActiveTooltip() {
		clearActiveHighlight();

		const tooltips = document.querySelectorAll('.median-cagr-tooltip');
		tooltips.forEach((tooltip) => tooltip.remove());

		activeTooltip = null;
		activeTooltipRow = null;
	}

	function positionTooltip(tooltip, event) {
		if (!tooltip) return;

		const horizontalOffset = 12;
		const verticalOffset = 12;
		const cursorX = event.clientX + window.scrollX;
		const cursorY = event.clientY + window.scrollY;

		let left = cursorX + horizontalOffset;
		let top = cursorY - tooltip.offsetHeight - verticalOffset;

		const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
		const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
		const maxLeft = window.scrollX + viewportWidth - tooltip.offsetWidth - horizontalOffset;
		const minLeft = window.scrollX + horizontalOffset;
		const clampedMaxLeft = Math.max(minLeft, maxLeft);

		if (left > clampedMaxLeft) {
			left = clampedMaxLeft;
		}

		const minTop = window.scrollY + verticalOffset;
		const maxTop = window.scrollY + viewportHeight - tooltip.offsetHeight - verticalOffset;
		const clampedMaxTop = Math.max(minTop, maxTop);

		if (top < minTop) {
			top = cursorY + verticalOffset;
		}

		if (top > clampedMaxTop) {
			top = clampedMaxTop;
		}

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	function positionPointerIndicator(event) {
		if (!pointerIndicator || !event) return;

		const indicatorOffsetX = 10;
		const indicatorOffsetY = 14;
		pointerIndicator.style.left = `${event.pageX + indicatorOffsetX}px`;
		pointerIndicator.style.top = `${event.pageY + indicatorOffsetY}px`;
	}

	document.addEventListener('mousemove', positionPointerIndicator, { passive: true });

	// Find all <tr> elements
	const rows = document.querySelectorAll('tr');

	rows.forEach((row) => {
		const cells = row.querySelectorAll('td');
		const numericalValues = [];
		const rowHighlightCells = [];
		const table = row.closest('table');
		const skipFirstDataColumn = shouldSkipFirstDataColumn(table);
		const startIndex = skipFirstDataColumn ? 2 : 1;

		// Skip processing if there are not enough cells
		if (cells.length < startIndex + 1) return;

		// Exclude the first <td> (descriptor) and optionally the first data column
		for (let i = startIndex; i < cells.length; i++) {
			const cell = cells[i];

			// Get the text content of the cell
			const text = cell.textContent.trim();
			// Remove commas and other non-numeric characters except for the decimal point and minus sign
			const numericText = text.replace(/[^0-9.-]+/g, '');

			if (isNumeric(numericText)) {
				numericalValues.push(parseFloat(numericText));
				rowHighlightCells.push(cell);
			}
		}

		if (numericalValues.length > 1) {
			// Reverse the numericalValues array to have oldest to latest order
			numericalValues.reverse();

			// Add a class to indicate the row is enhanced
			row.classList.add('clickable-row');

			const median = calculateMedian(numericalValues);
			const cagr = calculateCAGR(numericalValues);

			const medianText = median !== null ? `Median: ${median.toFixed(2)}` : 'Median: N/A';
			const cagrText = cagr !== null ? `CAGR: ${(cagr * 100).toFixed(2)}%` : 'CAGR: N/A';
			const tooltipText = `${medianText}\n${cagrText}`;

				row.addEventListener('mouseenter', (event) => {
					hideActiveTooltip();

					const tooltip = createTooltip(tooltipText);
					activeTooltip = tooltip;
					activeTooltipRow = row;
					positionTooltip(tooltip, event);
					applyHighlight(rowHighlightCells);

					pointerIndicator.classList.add('is-visible');
					positionPointerIndicator(event);
				});

			row.addEventListener('mousemove', (event) => {
				if (activeTooltip && activeTooltipRow === row) {
					positionTooltip(activeTooltip, event);
				}
				positionPointerIndicator(event);
			});

			row.addEventListener('mouseleave', hideActiveTooltip);
		}
	});
})();
