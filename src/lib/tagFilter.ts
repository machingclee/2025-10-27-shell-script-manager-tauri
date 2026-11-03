function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A space matches any text in between, so "event storm" matches "Event Storming". */
export function matchesTagFilter(name: string, query: string): boolean {
    const parts = query.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return true;
    return new RegExp(parts.map(escapeRegExp).join(".*"), "i").test(name);
}
