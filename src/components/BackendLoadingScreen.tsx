import { useEffect, useRef } from 'react';
import { useBackendHealth } from '../hooks/useBackendHealth';

export function BackendLoadingScreen({ children }: { children: React.ReactNode }) {
  const {
    isBackendReady,
    isChecking,
    checkAttempts,
    maxAttempts,
    backendPort,
    processStatus,
    lastError,
    logs,
  } = useBackendHealth();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [logs]);

  if (!isBackendReady && isChecking) {
    const isSlowStart = checkAttempts > maxAttempts;
    const localhostTarget = backendPort != null ? `localhost:${backendPort}` : 'localhost';

    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="text-center space-y-4 max-w-3xl w-full px-4">
          {/* Animated spinner */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-neutral-300 dark:border-neutral-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* Loading text */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {isSlowStart ? 'Still Starting Backend...' : 'Starting Backend Server...'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {isSlowStart
                ? `This is taking longer than usual. Connecting to ${localhostTarget}...`
                : `Connecting to ${localhostTarget}...`}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              process: {processStatus}
            </p>
            {lastError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                {lastError}
              </p>
            )}

            <div className="mt-4 text-left rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-950 text-neutral-100 overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-neutral-400 border-b border-neutral-800">
                Backend logs
              </div>
              <pre className="max-h-64 overflow-auto p-3 text-[11px] leading-4 font-mono whitespace-pre-wrap break-all">
                {logs.length > 0 ? logs.join('\n') : 'Waiting for backend logs...'}
                <div ref={logEndRef} />
              </pre>
            </div>

            {isSlowStart && (
              <div className="mt-4 text-xs text-neutral-400 dark:text-neutral-600 space-y-1">
                <p>If this persists, check that:</p>
                <ul className="text-left space-y-1 mt-2">
                  <li>• Java 17+ is installed</li>
                  <li>• {localhostTarget} is not in use</li>
                  <li>• Check the logs above for errors</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Backend is ready, render children
  return <>{children}</>;
}
