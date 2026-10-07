import { baseApi } from "./baseApi";

export interface EventLogDTO {
    id: number;
    createdAt: number | null;
    createdAtHk: string | null;
    requestId: string;
    eventType: string;
    payload: string;
    eventOrder: number;
    requestUserEmail: string;
    success: boolean;
    failureReason: string;
}

export interface EventsWithTotal {
    events: EventLogDTO[];
    total: number;
}

export interface GetEventsArgs {
    page: number;
    limit: number;
    requestId?: string;
    success?: boolean;
    requestUserEmail?: string;
    eventType?: string;
    sortOrder?: "asc" | "desc";
}

export const eventApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /events?page=&limit=&requestId=&success=&requestUserEmail=&eventType=&sortOrder=
        getEvents: builder.query<EventsWithTotal, GetEventsArgs>({
            query: ({ page, limit, requestId, success, requestUserEmail, eventType, sortOrder }) => {
                const params = new URLSearchParams({
                    page: String(page),
                    limit: String(limit),
                });
                if (requestId) params.set("requestId", requestId);
                if (success !== undefined) params.set("success", String(success));
                if (requestUserEmail) params.set("requestUserEmail", requestUserEmail);
                if (eventType) params.set("eventType", eventType);
                if (sortOrder) params.set("sortOrder", sortOrder);
                return { url: `/events?${params.toString()}`, method: "GET" };
            },
            providesTags: ["EventLog"],
        }),
    }),
});
