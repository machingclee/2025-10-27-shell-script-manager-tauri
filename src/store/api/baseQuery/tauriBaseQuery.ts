import { BaseQueryFn } from '@reduxjs/toolkit/query';
import { invoke } from '@tauri-apps/api/core';


export interface TauriQueryArgs {
  command: string;
  args?: Record<string, any>;
}

export interface TauriQueryError {
  status: number;
  data: string | object;
}

export const tauriBaseQuery = (): BaseQueryFn<
  TauriQueryArgs,
  unknown,
  TauriQueryError
> => {
  return async ({ command, args = {} }) => {
    try {
      const result = await invoke(command, args);
      return { data: result };
    } catch (error) {
      // Handle Tauri invoke errors
      return {
        error: {
          status: 500,
          data: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };
};

