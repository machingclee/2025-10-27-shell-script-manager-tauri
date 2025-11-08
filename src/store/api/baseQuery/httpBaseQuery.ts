import { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { RootState } from "../../store";

// Helper to get backend URL from Redux state
function getBackendUrl(getState: () => unknown): string {
    const state = getState() as RootState;
    const port = state.config.backendPort;
    return `http://localhost:${port}`;
}

export interface HttpQueryArgs {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: any;
    params?: Record<string, string>;
}

export interface HttpQueryError {
    status: number;
    data: string | object;
}

export const httpBaseQuery = (): BaseQueryFn<HttpQueryArgs, unknown, HttpQueryError> => {
    return async ({ url, method = "GET", body, params }, api) => {
        try {
            // Get dynamic backend URL from Redux state
            const backendUrl = getBackendUrl(api.getState);

            // Build URL with query params if provided
            const fullUrl = new URL(`${backendUrl}${url}`);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    fullUrl.searchParams.append(key, value);
                });
            }

            // Make fetch request
            const response = await fetch(fullUrl.toString(), {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            // Handle response
            if (!response.ok) {
                const errorData = await response.text();
                return {
                    error: {
                        status: response.status,
                        data: errorData || response.statusText,
                    },
                };
            }

            // Parse JSON response for non-DELETE requests
            if (method !== "DELETE") {
                const data = (await response.json()) as { result: any; success: boolean };
                return { data: data.result };
            }

            // For DELETE, return empty data
            return { data: undefined };
        } catch (error) {
            // Handle network errors
            return {
                error: {
                    status: 0,
                    data: error instanceof Error ? error.message : String(error),
                },
            };
        }
    };
};
