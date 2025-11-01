import { useBackendHealth } from '../hooks/useBackendHealth';

export function BackendLoadingScreen({ children }: { children: React.ReactNode }) {
  const { isBackendReady, isChecking, checkAttempts, maxAttempts } = useBackendHealth();

  if (!isBackendReady && isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="text-center space-y-4">
          {/* Animated spinner */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-neutral-300 dark:border-neutral-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          {/* Loading text */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Starting Backend Server...
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {checkAttempts} / {maxAttempts} attempts
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              This may take a few moments on first launch
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isBackendReady && !isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="text-center space-y-4 p-8 max-w-md">
          {/* Error icon */}
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          
          {/* Error message */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Backend Failed to Start
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              The backend server couldn't start. Please ensure:
            </p>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 text-left space-y-1">
              <li>• Java 17+ is installed</li>
              <li>• Port 7070 is not in use</li>
              <li>• Check the console for errors</li>
            </ul>
          </div>
          
          {/* Retry button */}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Backend is ready, render children
  return <>{children}</>;
}

