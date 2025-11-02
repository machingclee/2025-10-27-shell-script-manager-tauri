import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useBackendHealth() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const maxAttempts = 60; // Show for 60 seconds before giving hint

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await invoke<boolean>('check_backend_health');
        if (healthy) {
          setIsBackendReady(true);
          setIsChecking(false);
          console.log('Backend is ready after', checkAttempts, 'attempts');
        } else {
          // Not ready yet, will keep retrying indefinitely
          setCheckAttempts(prev => prev + 1);
        }
      } catch (error) {
        // Network error or backend not ready, keep retrying
        setCheckAttempts(prev => prev + 1);
      }
    };

    if (isChecking && !isBackendReady) {
      // Check immediately on mount
      checkHealth();

      // Then check every second indefinitely
      const interval = setInterval(checkHealth, 1000);
      return () => clearInterval(interval);
    }
  }, [isChecking, isBackendReady, checkAttempts]);

  return {
    isBackendReady,
    isChecking,
    checkAttempts,
    maxAttempts
  };
}

