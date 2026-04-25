/**
 * Remark plugin: transforms [item#ID] syntax in text nodes into custom
 * `itemReference` mdast nodes that remark-rehype converts to <itemref id="ID">
 * HTML elements.  ReactMarkdown's `components` prop maps `itemref` → ItemReference.
 */
const ITEM_REF_RE = /\[item#(\d+)\]/g;

function splitTextByItemRef(text: string): any[] {
    const parts: any[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    ITEM_REF_RE.lastIndex = 0;

    while ((match = ITEM_REF_RE.exec(text)) !== null) {
        if (match.index > last) {
            parts.push({ type: "text", value: text.slice(last, match.index) });
        }
        parts.push({
            type: "itemReference",
            data: {
                hName: "itemref",
                hProperties: { id: match[1] },
            },
            children: [],
        });
        last = match.index + match[0].length;
    }

    if (last < text.length) {
        parts.push({ type: "text", value: text.slice(last) });
    }

    return parts.length > 0 ? parts : [{ type: "text", value: text }];
}

function walkNode(node: any): void {
    if (!node.children) return;

    const newChildren: any[] = [];
    let changed = false;

    for (const child of node.children) {
        if (child.type === "text") {
            const parts = splitTextByItemRef(child.value);
            if (parts.length > 1 || (parts.length === 1 && parts[0].type !== "text")) {
                newChildren.push(...parts);
                changed = true;
            } else {
                newChildren.push(child);
            }
        } else {
            walkNode(child);
            newChildren.push(child);
        }
    }

    if (changed) {
        node.children = newChildren;
    }
}

export function remarkItemReference() {
    return (tree: any) => {
        walkNode(tree);
    };
}
