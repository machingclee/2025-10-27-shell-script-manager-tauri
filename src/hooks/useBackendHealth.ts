import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useBackendHealth() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const maxAttempts = 30; // 30 attempts = 30 seconds max

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await invoke<boolean>('check_backend_health');
        if (healthy) {
          setIsBackendReady(true);
          setIsChecking(false);
        } else if (checkAttempts < maxAttempts) {
          // Not ready yet, will retry
          setCheckAttempts(prev => prev + 1);
        } else {
          // Max attempts reached
          setIsChecking(false);
          console.error('Backend failed to start after 30 seconds');
        }
      } catch (error) {
        console.error('Error checking backend health:', error);
        if (checkAttempts < maxAttempts) {
          setCheckAttempts(prev => prev + 1);
        } else {
          setIsChecking(false);
        }
      }
    };

    if (isChecking && !isBackendReady) {
      // Check immediately on mount
      checkHealth();
      
      // Then check every second
      const interval = setInterval(checkHealth, 1000);
      return () => clearInterval(interval);
    }
  }, [isChecking, isBackendReady, checkAttempts, maxAttempts]);

  return {
    isBackendReady,
    isChecking,
    checkAttempts,
    maxAttempts
  };
}

