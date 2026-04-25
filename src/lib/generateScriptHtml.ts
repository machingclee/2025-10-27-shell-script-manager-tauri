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
            return `<img src="file://${imagesDir}/${filename}" alt="${altText}"${widthAttr} style="max-width:100%" />`;
        }
    );

    type ScriptMeta = { name: string; isMarkdown: boolean };
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
        if (meta.isMarkdown) {
            const deepLink = `tauri-shellscript-manager://open?scriptId=${id}`;
            return `<a href="${deepLink}" style="${chipStyle};cursor:pointer">${icon}${meta.name}</a>`;
        }
        return `<span style="${chipStyle}">${icon}${meta.name}</span>`;
    });

    return markdownHTMLTemplate({ scriptName: script.name, bodyHtml });
}
