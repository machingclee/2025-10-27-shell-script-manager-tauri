import { parseNameTags, TAG_BADGE_CLASS } from "./nameTag";

/**
 * Renders a name that may contain leading [tag] prefixes as styled badges.
 * Any text after the tags is displayed as-is. If the name is purely tags with
 * no trailing text, nothing is rendered after the badges.
 *
 * @param restClassName  Optional className applied to a wrapping <span> around
 *                       the non-tag remainder. Useful for ellipsis truncation in
 *                       constrained containers (e.g. folder rows).
 */
export default function NameTagDisplay({
    name,
    restClassName,
}: {
    name: string;
    restClassName?: string;
}) {
    const { tags, rest } = parseNameTags(name);
    return (
        <>
            {tags.map((tag, i) => (
                <span key={i} className={TAG_BADGE_CLASS}>
                    {tag}
                </span>
            ))}
            {rest && (restClassName ? <span className={restClassName}>{rest}</span> : rest)}
        </>
    );
}
