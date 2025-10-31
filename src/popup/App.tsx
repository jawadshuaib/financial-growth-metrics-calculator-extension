import { useEffect, useMemo, useState } from 'react';

type InjectionStatus = 'idle' | 'injecting' | 'success' | 'error';

type InjectionMessage = {
  status: InjectionStatus;
  error?: string;
};

type HoverMessagePayload = {
  metricName: string;
  initialValue: number | null;
  finalValue: number | null;
  compoundRate: number | null;
  medianValue: number | null;
  seriesValues: number[];
};

type HoverDetails = HoverMessagePayload & {
  receivedAt: number;
};

function useContentScriptInjection(): InjectionMessage {
  const [state, setState] = useState<InjectionMessage>({ status: 'idle' });

  useEffect(() => {
    let isMounted = true;

    async function injectContentScript() {
      if (!('chrome' in window)) {
        if (isMounted) {
          setState({ status: 'error', error: 'Chrome APIs unavailable' });
        }
        return;
      }

      try {
        if (isMounted) {
          setState({ status: 'injecting' });
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          throw new Error('Active tab not found');
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });

        if (isMounted) {
          setState({ status: 'success' });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to inject content script:', message);
        if (isMounted) {
          setState({ status: 'error', error: message });
        }
      }
    }

    injectContentScript();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

function App() {
  const injection = useContentScriptInjection();
  const [hoverDetails, setHoverDetails] = useState<HoverDetails | null>(null);
  const iconSrc = useMemo(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('icon.png');
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!('chrome' in window) || !chrome.storage?.local) {
      return undefined;
    }

    chrome.storage.local.get('lastHoverData', (result) => {
      const payload = result?.lastHoverData as HoverMessagePayload | undefined;
      if (payload) {
        setHoverDetails({
          metricName: typeof payload.metricName === 'string' ? payload.metricName : 'Metric',
          initialValue: typeof payload.initialValue === 'number' ? payload.initialValue : null,
          finalValue: typeof payload.finalValue === 'number' ? payload.finalValue : null,
          compoundRate: typeof payload.compoundRate === 'number' ? payload.compoundRate : null,
          medianValue: typeof payload.medianValue === 'number' ? payload.medianValue : null,
          seriesValues: Array.isArray(payload.seriesValues)
            ? payload.seriesValues.filter((value): value is number =>
                typeof value === 'number' && Number.isFinite(value),
              )
            : [],
          receivedAt: Date.now(),
        });
      }
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes.lastHoverData) return;
      const newValue = changes.lastHoverData.newValue as HoverMessagePayload | undefined;
      if (newValue) {
        setHoverDetails({
          metricName: typeof newValue.metricName === 'string' ? newValue.metricName : 'Metric',
          initialValue: typeof newValue.initialValue === 'number' ? newValue.initialValue : null,
          finalValue: typeof newValue.finalValue === 'number' ? newValue.finalValue : null,
          compoundRate: typeof newValue.compoundRate === 'number' ? newValue.compoundRate : null,
          medianValue: typeof newValue.medianValue === 'number' ? newValue.medianValue : null,
          seriesValues: Array.isArray(newValue.seriesValues)
            ? newValue.seriesValues.filter((value): value is number =>
                typeof value === 'number' && Number.isFinite(value),
              )
            : [],
          receivedAt: Date.now(),
        });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!('chrome' in window) || !chrome.runtime?.onMessage) {
      return undefined;
    }

    const handler = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void,
    ) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        (message as { type?: unknown }).type === 'ROW_HOVER_DATA'
      ) {
        const payload = (message as { payload?: unknown }).payload as HoverMessagePayload;
        if (payload && typeof payload === 'object') {
          setHoverDetails({
            metricName: typeof payload.metricName === 'string' ? payload.metricName : 'Metric',
            initialValue:
              typeof payload.initialValue === 'number' ? payload.initialValue : null,
            finalValue:
              typeof payload.finalValue === 'number' ? payload.finalValue : null,
            compoundRate:
              typeof payload.compoundRate === 'number' ? payload.compoundRate : null,
            medianValue:
              typeof payload.medianValue === 'number' ? payload.medianValue : null,
            seriesValues: Array.isArray(payload.seriesValues)
              ? payload.seriesValues.filter((value): value is number =>
                  typeof value === 'number' && Number.isFinite(value),
                )
              : [],
            receivedAt: Date.now(),
          });
        }
      }
    };

    chrome.runtime.onMessage.addListener(handler);

    return () => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, []);

  const formatter = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), []);

  const formatValue = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) {
      return '—';
    }
    return formatter.format(value);
  };

  const formatRate = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) {
      return '—';
    }
    return `${formatter.format(value * 100)}%`;
  };

  const barChartData = useMemo(() => {
    if (!hoverDetails) return [] as Array<{ key: string; label: string; value: number }>;

    if (!Array.isArray(hoverDetails.seriesValues) || hoverDetails.seriesValues.length === 0) {
      return [] as Array<{ key: string; label: string; value: number }>;
    }

    return hoverDetails.seriesValues
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
      .map((value, index) => ({
        key: `series-${index}`,
        label: `${index + 1}`,
        value,
      }));
  }, [hoverDetails]);

  const barChartMax = useMemo(
    () => barChartData.reduce((max, item) => Math.max(max, Math.abs(item.value)), 0),
    [barChartData],
  );

  return (
    <div className="flex w-80 flex-col rounded-3xl bg-white text-slate-900 shadow-2xl shadow-slate-300/50">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shadow-inner shadow-slate-300/40 ring-1 ring-slate-200">
            {iconSrc ? (
              <img src={iconSrc} alt="Extension icon" className="h-7 w-7" />
            ) : (
              <span className="text-lg font-semibold text-emerald-600">FG</span>
            )}
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Financial Growth Metrics</h1>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600/90">
              Hover for CAGR & median
            </p>
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-5 px-6 py-5">
        <p className="text-sm text-slate-600">
          Hover across any financial table row to capture the latest median and compound growth rates in real time.
        </p>
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Latest selection
          </p>
          {hoverDetails ? (
            <div className="mt-3 space-y-4 text-sm text-slate-700">
              <dl className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Metric</dt>
                  <dd className="text-right font-semibold text-slate-900">
                    {hoverDetails.metricName || 'Metric'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Initial</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {formatValue(hoverDetails.initialValue)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Final</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {formatValue(hoverDetails.finalValue)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Compound rate</dt>
                  <dd className="text-right font-semibold text-emerald-600">
                    {formatRate(hoverDetails.compoundRate)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Median</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {formatValue(hoverDetails.medianValue)}
                  </dd>
                </div>
                <p className="pt-1 text-[10px] uppercase tracking-[0.24em] text-slate-400">
                  Updated {new Date(hoverDetails.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </dl>
              {barChartData.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Value trend
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 py-3">
                    <div className="relative h-36 overflow-x-auto px-3">
                      <div className="absolute bottom-6 left-3 right-3 h-px bg-slate-300" />
                      <div className="flex h-full min-w-full items-end gap-3">
                        {barChartData.map((item) => {
                          const effectiveMax = barChartMax === 0 ? 1 : barChartMax;
                          const heightRatio = Math.abs(item.value) / effectiveMax;
                          const barHeight = Math.min(100, Math.max(8, heightRatio * 100));
                          const isPositive = item.value >= 0;
                          return (
                            <div
                              key={item.key}
                              className="flex min-w-[36px] flex-1 flex-col items-center gap-2"
                              style={{ height: '100%' }}
                            >
                              <div className="flex w-full flex-1 items-end">
                                <div
                                  className={`w-full rounded-t-lg ${
                                    isPositive ? 'bg-emerald-500' : 'bg-rose-400'
                                  }`}
                                  style={{ height: `${barHeight}%` }}
                                />
                              </div>
                              <div className="flex flex-col items-center">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                  {item.label}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Hover a table row to populate the latest metrics.
            </p>
          )}
        </section>
        {injection.status === 'error' && (
          <p className="text-xs text-rose-500">
            Could not connect ({injection.error ?? 'unknown error'}). Try refreshing the target tab and reopening this popup.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
