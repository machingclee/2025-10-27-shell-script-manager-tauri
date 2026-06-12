import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeMathjax from "rehype-mathjax";
import rehypeStringify from "rehype-stringify";
import { scriptApi } from "@/store/api/scriptApi";
import markdownHTMLTemplate from "@/app-component/ScriptsColumn/markdownHTMLTemplate";
import type { AppDispatch } from "@/store/store";

const FILE_TEXT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;flex-shrink:0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
const TERMINAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;flex-shrink:0"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`;

// ─── TOC utilities ────────────────────────────────────────────────────────────

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function extractNodeText(node: any): string {
    if (node.type === "text") return node.value ?? "";
    if (node.children) return node.children.map(extractNodeText).join("");
    return "";
}

/** Walk a HAST subtree and render it as inline HTML, preserving formatting elements. */
const INLINE_TAGS = new Set([
    "code", "strong", "em", "b", "i", "a", "del", "ins", "mark",
    "sub", "sup", "kbd", "samp", "small", "span", "abbr", "cite",
]);

function headingToInlineHtml(node: any): string {
    if (node.type === "text") return escapeHtml(node.value ?? "");
    if (node.type === "element" && INLINE_TAGS.has(node.tagName)) {
        const attrs = node.properties
            ? Object.entries(node.properties)
                  .filter(([, v]) => v != null && v !== false)
                  .map(([k, v]) => ` ${k}="${escapeHtml(String(v))}"`)
                  .join("")
            : "";
        const kids = node.children ? node.children.map(headingToInlineHtml).join("") : "";
        return `<${node.tagName}${attrs}>${kids}</${node.tagName}>`;
    }
    // For non-inline elements, just extract their text recursively
    if (node.children) return node.children.map(headingToInlineHtml).join("");
    return "";
}

/** rehype plugin: assign id attributes to h1-h6 elements based on their text content. */
function rehypeHeadingIds() {
    return (tree: any) => {
        const counts: Record<string, number> = {};
        function walk(node: any) {
            if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
                const text = extractNodeText(node);
                const slug = slugify(text);
                const count = counts[slug] ?? 0;
                counts[slug] = count + 1;
                node.properties = node.properties ?? {};
                if (!node.properties.id) {
                    node.properties.id = count === 0 ? slug : `${slug}-${count}`;
                }
            }
            if (node.children) node.children.forEach(walk);
        }
        walk(tree);
    };
}

/** rehype plugin: replace [TOC] paragraphs with a generated table-of-contents. */
function rehypeToc() {
    return (tree: any) => {
        // First pass: collect headings (with IDs already assigned by rehypeHeadingIds)
        const headings: { level: number; text: string; id: string }[] = [];
        function collectHeadings(node: any) {
            if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
                const text = headingToInlineHtml(node);
                const id = node.properties?.id || "";
                const level = parseInt(node.tagName[1], 10);
                headings.push({ level, text, id });
            }
            if (node.children) node.children.forEach(collectHeadings);
        }
        collectHeadings(tree);

        // Second pass: replace [TOC] paragraphs
        if (headings.length > 0) {
            const minLevel = Math.min(...headings.map((h) => h.level));
            const tocItems = headings
                .map((h) => {
                    const indent = (h.level - minLevel) * 16;
                    // h.text is already HTML-escaped for text nodes and preserves inline tags via headingToInlineHtml
                    return `<li style="padding-left:${indent}px!important;margin-left:0!important;line-height:1.8!important;list-style:none!important"><a href="#${escapeHtml(h.id)}" target="_self" style="color:rgb(37,99,235);text-decoration:none;font-size:0.9em">${h.text}</a></li>`;
                })
                .join("");
            const tocHtml =
                `<div style="border:1px solid rgba(0,0,0,0.12);border-radius:6px;padding:12px 16px;margin-bottom:1em;overflow:hidden;background-color:rgba(0,0,0,0.03)">` +
                `<div style="font-weight:600;margin-bottom:8px;opacity:0.6;font-size:0.85em;text-transform:uppercase;letter-spacing:0.05em">Contents</div>` +
                `<ul style="margin:0;padding:0;list-style:none">${tocItems}</ul></div>`;

            function replaceToc(node: any) {
                if (node.type === "element" && node.tagName === "p" && node.children) {
                    const text = node.children.map(extractNodeText).join("").trim();
                    if (text === "[TOC]") {
                        // Mutate into a raw HTML node so it emits the TOC markup verbatim
                        node.type = "raw";
                        node.value = tocHtml;
                        delete (node as any).children;
                        delete (node as any).tagName;
                        delete (node as any).properties;
                    }
                }
                if (node.children) node.children.forEach(replaceToc);
            }
            replaceToc(tree);
        }
    };
}

/** rehype plugin: wrap bare <img> elements in <a> links so images are clickable. */
function rehypeImageLinks() {
    return (tree: any) => {
        function walk(node: any, parent: any, idx: number) {
            if (
                node.type === "element" &&
                node.tagName === "img" &&
                parent &&
                parent.tagName !== "a"
            ) {
                parent.children[idx] = {
                    type: "element",
                    tagName: "a",
                    properties: {
                        href: node.properties?.src || "",
                        target: "_blank",
                        rel: "noopener noreferrer",
                    },
                    children: [node],
                };
                return; // already replaced this node, no need to walk its children
            }
            if (node.children) {
                node.children.forEach((child: any, i: number) => walk(child, node, i));
            }
        }
        if (tree.children) {
            tree.children.forEach((child: any, i: number) => walk(child, tree, i));
        }
    };
}

export async function generateScriptHtml(
    scriptId: number,
    dispatch: AppDispatch,
    imagesDir: string = ""
): Promise<string> {
    const result = await dispatch(scriptApi.endpoints.getScriptById.initiate(scriptId));
    if (!result.data) throw new Error(`Script ${scriptId} not found`);
    const script = result.data;

    const resolvedMarkdown = (script.command || "").replace(
        /!\[([^\]]*)\]\(images\/([^)]+)\)/g,
        (_match, altText, rest) => {
            const filename = rest.replace(/\?width=\d+$/, "");
            const widthMatch = rest.match(/\?width=(\d+)/);
            const widthAttr = widthMatch ? ` width="${widthMatch[1]}"` : "";
            const src = `file://${imagesDir}/${filename}`;
            return `<a href="${src}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="${altText}"${widthAttr} style="max-width:100%" /></a>`;
        }
    );

    type ScriptMeta = { name: string; isMarkdown: boolean; command: string };
    const itemRefMatches = [...resolvedMarkdown.matchAll(/\[item#(\d+)\]/g)];
    const scriptMetaMap = new Map<number, ScriptMeta>();
    if (itemRefMatches.length > 0) {
        const uniqueIds = [...new Set(itemRefMatches.map((m) => parseInt(m[1], 10)))];
        await Promise.all(
            uniqueIds.map(async (id) => {
                try {
                    const r = await dispatch(scriptApi.endpoints.getScriptById.initiate(id));
                    if (r.data) {
                        scriptMetaMap.set(id, {
                            name: r.data.name,
                            isMarkdown: r.data.isMarkdown,
                            command: r.data.command || "",
                        });
                    }
                } catch {
                    // leave as-is
                }
            })
        );
    }

    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeHeadingIds)
        .use(rehypeToc)
        .use(rehypeImageLinks)
        .use(rehypeHighlight)
        .use(rehypeMathjax)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(resolvedMarkdown);

    const bodyHtml = String(file).replace(/\[item#(\d+)\]/g, (_m, idStr) => {
        const id = parseInt(idStr, 10);
        const meta = scriptMetaMap.get(id);
        if (!meta) {
            return `<span style="display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:4px;font-size:14px;font-weight:500;background:rgba(127,29,29,0.1);border:1px solid rgba(185,28,28,0.2)">[item#${id}]</span>`;
        }
        const icon = meta.isMarkdown ? FILE_TEXT_SVG : TERMINAL_SVG;
        const chipStyle =
            "display:inline-flex;align-items:center;gap:6px;padding:1px 8px;border-radius:4px;font-size:14px;font-weight:500;background:rgba(64,64,64,0.1);border:1px solid rgba(115,115,115,0.2);text-decoration:none";
        const deepLink = meta.isMarkdown
            ? `tauri-shellscript-manager://open?scriptId=${id}`
            : `tauri-shellscript-manager://script?scriptId=${id}`;
        const titleAttr =
            !meta.isMarkdown && meta.command
                ? ` title="${meta.command.replace(/"/g, "&quot;").replace(/\n/g, "&#10;")}"`
                : "";
        return `<a href="${deepLink}" style="${chipStyle};cursor:pointer"${titleAttr}>${icon}${meta.name}</a>`;
    });

    return markdownHTMLTemplate({ scriptName: script.name, bodyHtml });
}
