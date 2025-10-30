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

  return (
    <div className="flex w-80 flex-col bg-slate-950 text-slate-100 shadow-xl shadow-black/30">
      <header className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-inner shadow-black/40 ring-1 ring-slate-700/60">
            {iconSrc ? (
              <img src={iconSrc} alt="Extension icon" className="h-7 w-7" />
            ) : (
              <span className="text-lg font-semibold">FG</span>
            )}
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-semibold tracking-tight text-white">Financial Growth Metrics</h1>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-200/80">
              Hover for CAGR & median
            </p>
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-5 px-6 py-5">
        <p className="text-sm text-slate-300">
          Hover across any financial table row to capture the latest median and compound growth rates in real time.
        </p>
        <section className="bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Latest selection
        </p>
        {hoverDetails ? (
          <dl className="mt-3 space-y-2 text-sm text-slate-200">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Metric</dt>
              <dd className="text-right font-medium text-slate-100">
                {hoverDetails.metricName || 'Metric'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Initial</dt>
              <dd className="text-right font-medium text-slate-100">
                {formatValue(hoverDetails.initialValue)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Final</dt>
              <dd className="text-right font-medium text-slate-100">
                {formatValue(hoverDetails.finalValue)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Compound rate</dt>
              <dd className="text-right font-medium text-emerald-300">
                {formatRate(hoverDetails.compoundRate)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Median</dt>
              <dd className="text-right font-medium text-slate-100">
                {formatValue(hoverDetails.medianValue)}
              </dd>
            </div>
            <p className="pt-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Updated {new Date(hoverDetails.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Hover a table row to populate the latest metrics.
          </p>
        )}
        </section>
        {injection.status === 'error' && (
          <p className="text-xs text-rose-300/90">
            Could not connect ({injection.error ?? 'unknown error'}). Try refreshing the target tab and reopening this popup.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
