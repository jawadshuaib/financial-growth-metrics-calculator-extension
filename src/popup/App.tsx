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
    <div className="flex w-80 flex-col gap-6 rounded-xl bg-slate-900/80 px-6 py-6 shadow-xl shadow-black/30">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          Hover to analyze
        </h1>
        <p className="text-sm text-slate-300">
          Move your cursor across any financial table row to see its median and compound growth rate instantly.
        </p>
      </header>
      <section className="space-y-1 text-xs text-slate-400">
        <p className="font-medium uppercase tracking-[0.18em] text-slate-500">Status</p>
        {injection.status === 'idle' && <p>Ready.</p>}
        {injection.status === 'injecting' && <p>Preparing tools…</p>}
        {injection.status === 'success' && <p>All set—hover any row.</p>}
        {injection.status === 'error' && (
          <p className="text-rose-300">Could not connect ({injection.error ?? 'unknown error'}).</p>
        )}
      </section>
      <section className="rounded-lg border border-slate-800/60 bg-slate-900/70 p-4">
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
            <p className="pt-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Updated {new Date(hoverDetails.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Hover a table row to populate the latest metrics.
          </p>
        )}
      </section>
    </div>
  );
}

export default App;
