(() => {
  function isNumeric(value: string): boolean {
    return value.trim() !== '' && !Number.isNaN(Number(value)) && Number.isFinite(Number(value));
  }

  function createPointerIndicator(): HTMLDivElement {
    const existingIndicators = document.querySelectorAll<HTMLDivElement>('.cagr-pointer-indicator');
    if (existingIndicators.length > 0) {
      existingIndicators.forEach((node, index) => {
        if (index > 0) {
          node.remove();
        }
      });
      const indicator = existingIndicators[0];
      indicator.innerHTML = `<span class="cagr-pointer-icon" aria-hidden="true"></span>`;
      return indicator;
    }

    const indicator = document.createElement('div');
    indicator.className = 'cagr-pointer-indicator';
    indicator.innerHTML = `<span class="cagr-pointer-icon" aria-hidden="true"></span>`;
    document.body.appendChild(indicator);
    return indicator;
  }

  const style = document.createElement('style');
  style.textContent = `
    tr.clickable-row {
      cursor: default;
    }
    .cagr-highlight-cell {
      background-color: rgba(255, 235, 59, 0.35) !important;
    }
    .cagr-pointer-indicator {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.65);
      border: 2px solid rgba(22, 163, 74, 0.8);
      box-shadow: 0 0 4px rgba(15, 118, 110, 0.48);
      pointer-events: none;
      z-index: 10001;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .cagr-pointer-indicator.is-visible {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

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

  const skipFirstDataColumnCache = new WeakMap<HTMLTableElement, boolean>();

  function normalizeHeaderText(text: string | null | undefined): string {
    return (text ?? '').toLowerCase();
  }

  function shouldSkipFirstDataColumn(table: HTMLTableElement | null): boolean {
    if (!table) return false;
    if (skipFirstDataColumnCache.has(table)) {
      return Boolean(skipFirstDataColumnCache.get(table));
    }

    const rows = table.tHead
      ? Array.from(table.tHead.querySelectorAll('tr'))
      : Array.from(table.querySelectorAll('tr'));

    const columnTexts: string[][] = [];

    rows.forEach((row) => {
      const cells = Array.from(row.children);
      const hasHeader = cells.some((cell) => cell.tagName === 'TH');
      if (!hasHeader) {
        return;
      }

      let columnPosition = 0;

      cells.forEach((cell) => {
        const colSpan = parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1;

        if (cell.tagName === 'TH') {
          const text = (cell.textContent ?? '').trim();
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

    const firstDataColumnText = (columnTexts[1] ?? []).join(' ');
    const normalizedFirstColumnText = normalizeHeaderText(firstDataColumnText);

    let shouldSkip = SKIP_COLUMN_KEYWORDS.some((keyword) =>
      normalizedFirstColumnText.includes(keyword),
    );

    if (!shouldSkip) {
      const allHeaderText = normalizeHeaderText(
        Array.from(table.querySelectorAll('th'))
          .map((th) => th.textContent ?? '')
          .join(' '),
      );
      shouldSkip = SKIP_COLUMN_KEYWORDS.some((keyword) => allHeaderText.includes(keyword));
    }

    skipFirstDataColumnCache.set(table, shouldSkip);
    return shouldSkip;
  }

  function calculateMedian(values: number[]): number | null {
    if (values.length === 0) return null;
    const sortedValues = [...values].sort((a, b) => a - b);
    const half = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2) {
      return sortedValues[half];
    }

    return (sortedValues[half - 1] + sortedValues[half]) / 2;
  }

  function calculateCAGR(values: number[]): number | null {
    if (values.length < 2) return null;
    const n = values.length - 1;
    const startValue = values[0];
    const endValue = values[values.length - 1];

    if (startValue <= 0 || endValue <= 0) return null;

    return Math.pow(endValue / startValue, 1 / n) - 1;
  }

  let activeHighlightCells: HTMLElement[] = [];
  let isExtensionActive = true;

  const pointerIndicator = createPointerIndicator();
  pointerIndicator.classList.add('is-visible');

  type HoverPayload = {
    type: 'ROW_HOVER_DATA';
    payload: {
      metricName: string;
      initialValue: number | null;
      finalValue: number | null;
      compoundRate: number | null;
      medianValue: number | null;
      seriesValues: number[];
    };
  };

  function isRuntimeAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  }

  function emitHoverData(payload: HoverPayload['payload']): void {
    if (!isExtensionActive || !isRuntimeAvailable()) {
      return;
    }

    try {
      const message: HoverPayload = { type: 'ROW_HOVER_DATA', payload };
      chrome.runtime.sendMessage(message, () => {
        // Silently ignore missing receivers / closed ports
        void chrome.runtime?.lastError;
      });
    } catch (error) {
      // Extension context might be invalidated; ignore to avoid console noise
      return;
    }

    if (chrome.storage?.local) {
      try {
        chrome.storage.local.set({ lastHoverData: payload });
      } catch (_error) {
        // Ignore storage errors caused by context invalidation
      }
    }
  }

  function clearActiveHighlight(): void {
    const highlightedCells = document.querySelectorAll<HTMLElement>('.cagr-highlight-cell');
    highlightedCells.forEach((cell) => cell.classList.remove('cagr-highlight-cell'));
    activeHighlightCells = [];
  }

  function applyHighlight(cells: HTMLElement[]): void {
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

  function resetHoverArtifacts(): void {
    clearActiveHighlight();
  }

  function positionPointer(event: MouseEvent | PointerEvent): void {
    if (!isExtensionActive) {
      pointerIndicator.classList.remove('is-visible');
      return;
    }

    pointerIndicator.classList.add('is-visible');
    const indicatorOffsetX = 10;
    const indicatorOffsetY = 14;
    pointerIndicator.style.left = `${event.pageX + indicatorOffsetX}px`;
    pointerIndicator.style.top = `${event.pageY + indicatorOffsetY}px`;
  }

  function disableExtension(): void {
    if (!isExtensionActive) return;
    isExtensionActive = false;
    pointerIndicator.classList.remove('is-visible');
    resetHoverArtifacts();
    document.removeEventListener('mousemove', positionPointer as EventListener);
  }

  document.addEventListener('mousemove', positionPointer as EventListener, { passive: true });
  document.addEventListener(
    'contextmenu',
    () => {
      disableExtension();
    },
    { once: true },
  );

  const rows = document.querySelectorAll<HTMLTableRowElement>('tr');

  rows.forEach((row) => {
    const cells = row.querySelectorAll<HTMLTableCellElement>('td');
    const numericalValues: number[] = [];
    const rowHighlightCells: HTMLElement[] = [];
    const table = row.closest('table');
    const skipFirstDataColumn = shouldSkipFirstDataColumn(table);
    const startIndex = skipFirstDataColumn ? 2 : 1;
    const descriptorCell = row.querySelector<HTMLElement>('th, td');
    const metricName = descriptorCell?.textContent?.trim() ?? 'Metric';

    if (cells.length < startIndex + 1) return;

    for (let i = startIndex; i < cells.length; i += 1) {
      const cell = cells[i];
      const text = cell.textContent?.trim() ?? '';
      const numericText = text.replace(/[^0-9.-]+/g, '');

      if (isNumeric(numericText)) {
        numericalValues.push(Number(numericText));
        rowHighlightCells.push(cell);
      }
    }

    if (numericalValues.length > 1) {
      numericalValues.reverse();
      row.classList.add('clickable-row');

      const median = calculateMedian(numericalValues);
      const cagr = calculateCAGR(numericalValues);

      row.addEventListener('mouseenter', (event) => {
        if (!isExtensionActive) return;

        resetHoverArtifacts();
        applyHighlight(rowHighlightCells);
        positionPointer(event);

        emitHoverData({
          metricName,
          initialValue: numericalValues[0] ?? null,
          finalValue: numericalValues[numericalValues.length - 1] ?? null,
          compoundRate: cagr,
          medianValue: median,
          seriesValues: [...numericalValues],
        });
      });

      row.addEventListener('mousemove', (event) => {
        if (!isExtensionActive) return;
        positionPointer(event);
      });

      row.addEventListener('mouseleave', () => {
        resetHoverArtifacts();
      });
    }
  });
})();
