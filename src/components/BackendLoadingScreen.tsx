import { useBackendHealth } from '../hooks/useBackendHealth';

export function BackendLoadingScreen({ children }: { children: React.ReactNode }) {
  const { isBackendReady, isChecking, checkAttempts, maxAttempts } = useBackendHealth();

  if (!isBackendReady && isChecking) {
    const isSlowStart = checkAttempts > maxAttempts;

    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="text-center space-y-4 max-w-md px-4">
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
                ? 'This is taking longer than usual. Please wait...'
                : 'This may take a few moments on first launch'}
            </p>

            {isSlowStart && (
              <div className="mt-4 text-xs text-neutral-400 dark:text-neutral-600 space-y-1">
                <p>If this persists, check that:</p>
                <ul className="text-left space-y-1 mt-2">
                  <li>• Java 17+ is installed</li>
                  <li>• Port is not in use</li>
                  <li>• Check console for errors</li>
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

