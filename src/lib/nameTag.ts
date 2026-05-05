export const TAG_BADGE_CLASS =
    "text-sm font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-neutral-600 dark:text-neutral-200 flex-shrink-0";

export function parseNameTags(name: string): { tags: string[]; rest: string } {
    const tags: string[] = [];
    let rest = name;
    const tagRegex = /^\[([^\]]+)\]\s*/;
    let match;
    while ((match = tagRegex.exec(rest)) !== null) {
        tags.push(match[1]);
        rest = rest.slice(match[0].length);
    }
    return { tags, rest };
}
