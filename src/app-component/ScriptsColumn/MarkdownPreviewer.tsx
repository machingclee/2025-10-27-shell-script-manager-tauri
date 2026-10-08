import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeMathjax from "rehype-mathjax";
import rehypeRaw from "rehype-raw";
import { Box } from "@mui/material";
import { convertFileSrc } from "@tauri-apps/api/core";
import { isExternalHref, openExternalLink } from "@/lib/openExternalLink";
import { Sun, Moon, Presentation, ChevronRight, ChevronLeft, ListTree } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPreviewDarkMode } from "@/store/slices/appSlice";
import { remarkItemReference } from "@/lib/remarkItemReference";
import ItemReference from "./ItemReference";
import OverlayScrollbar from "@/components/ui/overlay-scrollbar";
import * as monaco from "monaco-editor";
import type { editor as MonacoEditorNS } from "monaco-editor";

// ─── Constants ───────────────────────────────────────────────────────────────
const LIGHT_WHITE_BG = "rgba(255, 255, 255, 0.2)";
const BASE_FONT_SIZE = 18;
const LIST_GUTTER_WIDTH = "2em";
const LIST_ITEM_LINE_HEIGHT = "1.4";
const TOC_SIDEBAR_MIN_WIDTH = 140;
const TOC_SIDEBAR_MAX_WIDTH = 480;
const TOC_SIDEBAR_DEFAULT_WIDTH = 320;
const TOC_ACTIVE_LEAD = 100;

// ─── Rehype plugins ───────────────────────────────────────────────────────────

function rehypeAddSourceLines() {
    return (tree: any) => {
        function walk(node: any) {
            if (node.type === "element" && node.position?.start?.line != null) {
                node.properties = node.properties ?? {};
                node.properties["data-source-line"] = String(node.position.start.line);
            }
            if (node.children) {
                for (const child of node.children) walk(child);
            }
        }
        walk(tree);
    };
}

function makeRehypeSearchHighlight(query: string) {
    const q = query.trim().toLowerCase();
    return function rehypeSearchHighlight() {
        return function transformer(tree: any) {
            if (!q) return;
            function visitNode(node: any): any[] | null {
                if (node.type === "text") {
                    const lower: string = node.value.toLowerCase();
                    if (!lower.includes(q)) return null;
                    const parts: any[] = [];
                    let pos = 0;
                    while (true) {
                        const found = lower.indexOf(q, pos);
                        if (found === -1) {
                            if (pos < node.value.length)
                                parts.push({ type: "text", value: node.value.slice(pos) });
                            break;
                        }
                        if (found > pos)
                            parts.push({ type: "text", value: node.value.slice(pos, found) });
                        parts.push({
                            type: "element",
                            tagName: "mark",
                            properties: { className: ["search-mark"] },
                            children: [
                                { type: "text", value: node.value.slice(found, found + q.length) },
                            ],
                        });
                        pos = found + q.length;
                    }
                    return parts;
                }
                if (node.children) {
                    const newChildren: any[] = [];
                    let changed = false;
                    for (const child of node.children) {
                        const result = visitNode(child);
                        if (result !== null) {
                            newChildren.push(...result);
                            changed = true;
                        } else {
                            newChildren.push(child);
                        }
                    }
                    if (changed) node.children = newChildren;
                }
                return null;
            }
            visitNode(tree);
        };
    };
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

function SearchBar({
    query,
    onQueryChange,
    matchCount,
    matchIdx,
    inputRef,
    onAdvance,
    onClose,
    bottomOffset = 16,
}: {
    query: string;
    onQueryChange: (v: string) => void;
    matchCount: number;
    matchIdx: number;
    inputRef: React.RefObject<HTMLInputElement>;
    onAdvance: () => void;
    onClose: () => void;
    bottomOffset?: number;
}) {
    return (
        <div
            className="absolute right-4 z-50 flex items-center gap-2 bg-neutral-800/95 border border-neutral-500 rounded px-3 py-1.5 shadow-lg"
            style={{ bottom: bottomOffset }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        onAdvance();
                    }
                    if (e.key === "Escape") {
                        e.preventDefault();
                        onClose();
                    }
                }}
                placeholder="Search…"
                className="bg-transparent text-white text-sm outline-none w-44 placeholder-neutral-500"
            />
            <span className="text-neutral-400 text-xs min-w-[3rem] text-right select-none">
                {query.trim() ? (matchCount > 0 ? `${matchIdx + 1}/${matchCount}` : "0/0") : ""}
            </span>
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    onClose();
                }}
                className="text-neutral-400 hover:text-white leading-none"
                aria-label="Close search"
            >
                ✕
            </button>
        </div>
    );
}

// ─── ResizableImage ───────────────────────────────────────────────────────────

function ResizableImage({
    src,
    alt,
    initialWidth,
    onWidthChange,
}: {
    src: string;
    alt: string;
    initialWidth?: number;
    onWidthChange?: (width: number) => void;
}) {
    const [width, setWidth] = useState<number | undefined>(initialWidth);
    const [hovered, setHovered] = useState(false);
    const startRef = useRef<{ x: number; w: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const onHandleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const currentW = width ?? containerRef.current?.getBoundingClientRect().width ?? 300;
        startRef.current = { x: e.clientX, w: currentW };

        const calcDelta = (ev: MouseEvent) =>
            ev.clientX - startRef.current!.x - (ev.clientY - e.clientY);

        const onMove = (ev: MouseEvent) => {
            if (!startRef.current) return;
            setWidth(Math.max(50, Math.round(startRef.current.w + calcDelta(ev))));
        };
        const onUp = (ev: MouseEvent) => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (!startRef.current) return;
            const finalW = Math.max(50, Math.round(startRef.current.w + calcDelta(ev)));
            startRef.current = null;
            onWidthChange?.(finalW);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                display: "inline-block",
                width: width ? `${width}px` : "100%",
                maxWidth: "100%",
                borderRadius: "4px",
                outline: hovered ? "3px solid #3e6df1" : "3px solid transparent",
                transition: "outline-color 0.15s",
                cursor: hovered ? "nesw-resize" : undefined,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={onHandleMouseDown}
            title={hovered ? "Drag to resize" : undefined}
        >
            <img
                src={src}
                alt={alt}
                style={{ display: "block", width: "100%", borderRadius: "4px" }}
                draggable={false}
            />
        </div>
    );
}

// ─── TOC utilities ────────────────────────────────────────────────────────────

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function extractNodeText(node: any): string {
    if (node.type === "text") return node.value ?? "";
    if (node.children) return node.children.map(extractNodeText).join("");
    return "";
}

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

function extractHeadingsFromMd(content: string): { level: number; text: string; id: string }[] {
    const headings: { level: number; text: string; id: string }[] = [];
    const counts: Record<string, number> = {};
    for (const line of content.split("\n")) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            const slug = slugify(text);
            const count = counts[slug] ?? 0;
            counts[slug] = count + 1;
            headings.push({ level, text, id: count === 0 ? slug : `${slug}-${count}` });
        }
    }
    return headings;
}

function TocList({
    headings,
    previewBoxRef,
    darkMode,
    wrap = false,
    activeId = null,
}: {
    headings: { level: number; text: string; id: string }[];
    previewBoxRef: React.RefObject<HTMLDivElement | null>;
    darkMode: boolean;
    /** Wrap long headings instead of letting them widen the list. */
    wrap?: boolean;
    /** Heading whose top edge has reached the top of the viewport. */
    activeId?: string | null;
}) {
    const minLevel = Math.min(...headings.map((h) => h.level));

    // Components for rendering only inline markdown formatting inside a TOC link.
    // p / a are unwrapped (TOC items are already links, so nested <a> is invalid).
    const tocInlineComponents = useMemo(
        () => ({
            p: ({ children }: any) => <>{children}</>,
            a: ({ children }: any) => <>{children}</>,
        }),
        [],
    );

    const tocListRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!activeId || !tocListRef.current) return;
        const item = tocListRef.current.querySelector<HTMLElement>(
            `[data-toc-id="${CSS.escape(activeId)}"]`,
        );
        item?.scrollIntoView({ block: "nearest" });
    }, [activeId]);

    return (
        <ul ref={tocListRef} style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {headings.map((h, i) => {
                const active = h.id === activeId;
                return (
                <li
                    key={i}
                    data-toc-id={h.id}
                    style={{
                        paddingLeft: `${(h.level - minLevel) * 16}px`,
                        lineHeight: "1.8",
                        borderRadius: 4,
                        ...(wrap ? { overflowWrap: "anywhere" } : {}),
                        ...(active
                            ? {
                                  backgroundColor: darkMode
                                      ? "rgba(96,165,250,0.16)"
                                      : "rgba(37,99,235,0.10)",
                              }
                            : {}),
                    }}
                >
                    <a
                        href={`#${h.id}`}
                        style={{
                            color: darkMode ? "rgb(96, 165, 250)" : "rgb(37, 99, 235)",
                            textDecoration: "none",
                            fontSize: "0.9em",
                            fontWeight: active ? 600 : undefined,
                        }}
                        onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.textDecoration = "underline")
                        }
                        onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.textDecoration = "none")
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            const container = previewBoxRef.current;
                            if (!container) return;
                            const el = container.querySelector(`#${CSS.escape(h.id)}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                    >
                        <ReactMarkdown components={tocInlineComponents}>{h.text}</ReactMarkdown>
                    </a>
                </li>
                );
            })}
        </ul>
    );
}

function TableOfContents({
    headings,
    previewBoxRef,
    darkMode,
}: {
    headings: { level: number; text: string; id: string }[];
    previewBoxRef: React.RefObject<HTMLDivElement | null>;
    darkMode: boolean;
}) {
    if (headings.length === 0) return null;

    return (
        <div
            data-inline-toc=""
            style={{
                border: darkMode
                    ? "1px solid rgba(255,255,255,0.15)"
                    : "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: "1em",
                overflow: "hidden",
                backgroundColor: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            }}
        >
            <div
                style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    opacity: 0.6,
                    fontSize: "0.85em",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                }}
            >
                Contents
            </div>
            <TocList headings={headings} previewBoxRef={previewBoxRef} darkMode={darkMode} />
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MarkdownPreviewerProps {
    editContent: string;
    fontSize: number;
    imagesDir: string | null;
    /** Ref to the scrollable preview container — populated by this component. */
    previewBoxRef: React.RefObject<HTMLDivElement | null>;
    /** Ref to the Monaco editor instance in the sibling MarkdownCodeEditor. */
    editorRef: React.MutableRefObject<MonacoEditorNS.IStandaloneCodeEditor | null>;
    /** Ref to the latest editContent value (kept in sync by the parent). */
    /** @deprecated Kept for API compatibility; no longer used internally. */
    latestContentRef?: React.MutableRefObject<string>;
    /** Called when the user resizes an image (updates latestContentRef + editContent). */
    onImageWidthChange: (cleanPath: string, newWidth: number) => void;
    /** Called when the user clicks a checkbox. */
    onCheckboxToggle: (index: number) => void;
    /** Whether to open the preview search bar. Controlled by the parent. */
    searchOpen: boolean;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    onSearchClose: () => void;
}

export default function MarkdownPreviewer({
    editContent,
    fontSize,
    imagesDir,
    previewBoxRef,
    editorRef,
    onImageWidthChange,
    onCheckboxToggle,
    searchOpen,
    searchInputRef,
    onSearchClose,
}: MarkdownPreviewerProps) {
    const dispatch = useAppDispatch();
    const previewDarkMode = useAppSelector((s) => s.app.tab.previewDarkMode);

    // ── Presentation mode ─────────────────────────────────────────────────────
    const [presentationMode, setPresentationMode] = useState(false);
    const [presentationIndex, setPresentationIndex] = useState(0);
    const presentationContainerRef = useRef<HTMLDivElement>(null);
    const presentationNodesRef = useRef<HTMLElement[][]>([]);
    const previewScrollSaveRef = useRef<number | null>(null);

    const endPresentation = useCallback(() => {
        previewScrollSaveRef.current = previewBoxRef.current?.scrollTop ?? null;
        setPresentationMode(false);
        setPresentationIndex(0);
    }, [previewBoxRef]);

    useEffect(() => {
        if (!presentationMode) {
            for (const group of presentationNodesRef.current) {
                for (const node of group) {
                    node.style.opacity = "";
                    node.style.transition = "";
                }
            }
            presentationNodesRef.current = [];
            return;
        }
        const container = presentationContainerRef.current;
        if (!container) return;
        const groups: HTMLElement[][] = [];
        let pGroup: HTMLElement[] = [];
        const collectList = (list: HTMLElement) => {
            for (const li of Array.from(list.children) as HTMLElement[]) {
                groups.push([li]);
                for (const child of Array.from(li.children) as HTMLElement[]) {
                    if (child.tagName === "UL" || child.tagName === "OL") collectList(child);
                }
            }
        };
        for (const child of Array.from(container.children) as HTMLElement[]) {
            const tag = child.tagName;
            if (tag === "UL" || tag === "OL") {
                if (pGroup.length > 0) {
                    groups.push(pGroup);
                    pGroup = [];
                }
                collectList(child);
            } else if (tag === "P") {
                pGroup.push(child);
            } else {
                if (pGroup.length > 0) {
                    groups.push(pGroup);
                    pGroup = [];
                }
                groups.push([child]);
            }
        }
        if (pGroup.length > 0) groups.push(pGroup);
        presentationNodesRef.current = groups;
        for (const group of groups) {
            for (const node of group) {
                node.style.transition = "opacity 0.4s ease";
                node.style.opacity = "0.2";
            }
        }
    }, [presentationMode]);

    useEffect(() => {
        if (!presentationMode) return;
        const groups = presentationNodesRef.current;
        groups.forEach((group, i) => {
            const opacity = i < presentationIndex ? "1" : "0.2";
            for (const node of group) node.style.opacity = opacity;
        });
        if (presentationIndex > 0) {
            const group = groups[presentationIndex - 1];
            if (group && group.length > 0)
                group[group.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [presentationIndex, presentationMode]);

    useEffect(() => {
        if (!presentationMode && previewScrollSaveRef.current !== null) {
            const saved = previewScrollSaveRef.current;
            previewScrollSaveRef.current = null;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (previewBoxRef.current) previewBoxRef.current.scrollTop = saved;
                });
            });
        }
    }, [presentationMode, previewBoxRef]);

    useEffect(() => {
        if (!presentationMode) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                setPresentationIndex((idx) => {
                    const next = idx + 1;
                    if (next >= presentationNodesRef.current.length) {
                        endPresentation();
                        return 0;
                    }
                    return next;
                });
            }
            if (e.key === "Backspace") {
                e.preventDefault();
                setPresentationIndex((idx) => Math.max(0, idx - 1));
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [presentationMode, endPresentation]);

    // ── Preview search ────────────────────────────────────────────────────────
    const [previewSearchQuery, setPreviewSearchQuery] = useState("");
    const [previewSearchIdx, setPreviewSearchIdx] = useState(0);
    const [previewSearchCount, setPreviewSearchCount] = useState(0);

    // Reset query when searchOpen is closed from the outside
    useEffect(() => {
        if (!searchOpen) {
            setPreviewSearchQuery("");
            setPreviewSearchIdx(0);
        }
    }, [searchOpen]);

    // Focus search input when opened
    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    }, [searchOpen, searchInputRef]);

    useLayoutEffect(() => {
        if (!searchOpen || !previewSearchQuery.trim()) {
            setPreviewSearchCount(0);
            return;
        }
        const container = previewBoxRef.current as HTMLElement | null;
        if (!container) return;
        const marks = Array.from(container.querySelectorAll<HTMLElement>("mark.search-mark"));
        setPreviewSearchCount(marks.length);
        if (marks.length === 0) return;
        const idx = previewSearchIdx % marks.length;
        marks.forEach((m, i) => {
            m.style.backgroundColor =
                i === idx ? "rgba(255, 160, 0, 0.7)" : "rgba(255, 210, 0, 0.35)";
            m.style.color = "inherit";
            m.style.borderRadius = "2px";
            m.style.padding = "1px 0";
        });
        marks[idx].scrollIntoView({ block: "center" });
    }, [previewSearchIdx, searchOpen, previewSearchQuery, editContent, previewBoxRef]);

    // ── Editor ↔ Preview cross-navigation ────────────────────────────────────

    const editorFlashDecorationsRef = useRef<string[]>([]);

    // ── TOC sidebar ───────────────────────────────────────────────────────────
    // Sits beside the preview once the inline [TOC] block scrolls out of view.
    const [tocSidebarAvailable, setTocSidebarAvailable] = useState(false);
    const [tocActiveId, setTocActiveId] = useState<string | null>(null);
    const [tocSidebarWidth, setTocSidebarWidth] = useState(TOC_SIDEBAR_DEFAULT_WIDTH);
    const tocSidebarWidthRef = useRef(TOC_SIDEBAR_DEFAULT_WIDTH);
    tocSidebarWidthRef.current = tocSidebarWidth;
    const tocDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

    const tocHeadings = useMemo(() => extractHeadingsFromMd(editContent), [editContent]);
    const tocAvailableRef = useRef(false);

    useEffect(() => {
        const container = previewBoxRef.current;
        if (!container) return;
        const update = () => {
            const toc = container.querySelector<HTMLElement>("[data-inline-toc]");
            const containerTop = container.getBoundingClientRect().top;
            // Distance of the inline TOC's bottom edge from the viewport top:
            // 0 means flush with it, negative means it has scrolled past.
            const scrolledOut = !!toc && toc.getBoundingClientRect().bottom - containerTop < 0;
            // Dispatching on every scroll re-renders the preview, which fires the
            // observer again, so only publish the value when it changes.
            if (scrolledOut !== tocAvailableRef.current) {
                tocAvailableRef.current = scrolledOut;
                setTocSidebarAvailable(scrolledOut);
            }
            if (!toc) return;

            // The current section is the last heading within the lead distance of
            // the viewport top, so the highlight moves before the heading arrives.
            let activeId: string | null = null;
            for (const heading of tocHeadings) {
                const el = container.querySelector<HTMLElement>(`#${CSS.escape(heading.id)}`);
                if (!el) continue;
                if (el.getBoundingClientRect().top - containerTop <= TOC_ACTIVE_LEAD)
                    activeId = heading.id;
                else break;
            }
            setTocActiveId(activeId);
        };
        update();
        // The contents block is rendered by ReactMarkdown after this effect, so
        // the first measurement finds nothing. Watch the container and measure
        // again once it appears, and on every later change to its position.
        const observer = new MutationObserver(update);
        observer.observe(container, { childList: true, subtree: true });
        container.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            observer.disconnect();
            container.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [previewBoxRef, editContent, tocHeadings]);

    const onTocResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        tocDragRef.current = { startX: e.clientX, startWidth: tocSidebarWidthRef.current };
        const onMove = (ev: MouseEvent) => {
            if (!tocDragRef.current) return;
            const next = tocDragRef.current.startWidth + (ev.clientX - tocDragRef.current.startX);
            setTocSidebarWidth(
                Math.min(TOC_SIDEBAR_MAX_WIDTH, Math.max(TOC_SIDEBAR_MIN_WIDTH, Math.round(next))),
            );
        };
        const onUp = () => {
            tocDragRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, []);

    const handlePreviewDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            let el = e.target as HTMLElement | null;
            while (el) {
                const lineAttr = el.getAttribute("data-source-line");
                if (lineAttr) {
                    const lineNum = Math.max(1, parseInt(lineAttr, 10));
                    const editor = editorRef.current;
                    if (editor) {
                        editor.revealLineInCenter(lineNum);
                        editor.setPosition({ lineNumber: lineNum, column: 1 });
                        editor.focus();
                        editorFlashDecorationsRef.current = editor.deltaDecorations(
                            editorFlashDecorationsRef.current,
                            [
                                {
                                    range: new monaco.Range(lineNum, 1, lineNum, 1),
                                    options: { isWholeLine: true, className: "editor-line-flash" },
                                },
                            ]
                        );
                        setTimeout(() => {
                            editorFlashDecorationsRef.current = editor.deltaDecorations(
                                editorFlashDecorationsRef.current,
                                []
                            );
                        }, 700);
                    }
                    break;
                }
                el = el.parentElement;
            }
        },
        [editorRef]
    );

    // ── Markdown components ───────────────────────────────────────────────────

    const markdownComponents = useMemo(
        () => ({
            a: ({
                href,
                children,
                node,
                ...rest
            }: {
                href?: string;
                children?: React.ReactNode;
                node?: any;
                [key: string]: any;
            }) => (
                <a
                    href={href}
                    {...rest}
                    onClick={(e) => {
                        if (!isExternalHref(href)) return;
                        e.preventDefault();
                        e.stopPropagation();
                        openExternalLink(href!).catch(console.error);
                    }}
                    style={{ cursor: "pointer" }}
                >
                    {children}
                </a>
            ),
            p: ({
                children,
                node,
                ...rest
            }: {
                children?: React.ReactNode;
                node?: any;
                [key: string]: any;
            }) => {
                const nodeChildren: any[] = node?.children ?? [];
                const isOnlyImage =
                    nodeChildren.length === 1 &&
                    nodeChildren[0].type === "element" &&
                    nodeChildren[0].tagName === "img";
                if (isOnlyImage) {
                    return (
                        <div style={{ margin: "0.75em 0" }} {...rest}>
                            {children}
                        </div>
                    );
                }
                const isToc =
                    nodeChildren.length === 1 &&
                    nodeChildren[0].type === "text" &&
                    nodeChildren[0].value?.trim() === "[TOC]";
                if (isToc) {
                    return (
                        <TableOfContents
                            headings={extractHeadingsFromMd(editContent)}
                            previewBoxRef={previewBoxRef}
                            darkMode={previewDarkMode}
                        />
                    );
                }
                return <p {...rest}>{children}</p>;
            },
            img: ({ src, alt }: { src?: string; alt?: string }) => {
                const widthMatch = src?.match(/\?width=(\d+)/);
                const initialWidth = widthMatch ? parseInt(widthMatch[1]) : undefined;
                const cleanPathNorm = src?.replace(/\?width=\d+$/, "") ?? "";
                let imgSrc = cleanPathNorm;
                if (cleanPathNorm.startsWith("images/") && imagesDir) {
                    imgSrc = convertFileSrc(
                        `${imagesDir}/${cleanPathNorm.replace(/^images\//, "")}`
                    );
                }
                return (
                    <ResizableImage
                        src={imgSrc}
                        alt={alt ?? ""}
                        initialWidth={initialWidth}
                        onWidthChange={(newWidth) => onImageWidthChange(cleanPathNorm, newWidth)}
                    />
                );
            },
            code: ({
                children,
                className,
                node,
                ...rest
            }: {
                children?: React.ReactNode;
                className?: string;
                node?: any;
                [key: string]: any;
            }) => {
                const isInline = !className;
                if (isInline) {
                    const text = typeof children === "string" ? children : String(children ?? "");
                    return (
                        <code
                            {...rest}
                            style={{ cursor: "pointer" }}
                            title="Click to copy"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(text).then(() => {
                                    toast({ variant: "success", title: "Copied!", duration: 1500 });
                                });
                            }}
                        >
                            {children}
                        </code>
                    );
                }
                return (
                    <code className={className} {...rest}>
                        {children}
                    </code>
                );
            },
            details: ({
                children,
                node,
                open,
                ...rest
            }: {
                children?: React.ReactNode;
                node?: any;
                open?: boolean | string;
                [key: string]: any;
            }) => (
                <details
                    {...({
                        ...rest,
                        // React 19 supports defaultOpen on <details>, but @types/react
                        // only types the controlled `open` prop.
                        defaultOpen: open != null && open !== false,
                    } as React.DetailsHTMLAttributes<HTMLDetailsElement>)}
                >
                    {children}
                </details>
            ),
            summary: ({
                children,
                node,
                ...rest
            }: {
                children?: React.ReactNode;
                node?: any;
                [key: string]: any;
            }) => <summary {...rest}>{children}</summary>,
            itemref: ({ id }: { id?: string }) => (
                <ItemReference id={id} darkMode={previewDarkMode} fontSize={fontSize} />
            ),
            input: ({ node, checked, disabled, ...props }: any) => {
                if (props.type === "checkbox") {
                    return (
                        <input
                            {...props}
                            style={{ cursor: "pointer" }}
                            type="checkbox"
                            checked={!!checked}
                            disabled={false}
                            onChange={(e) => {
                                e.stopPropagation();
                                const target = e.target as HTMLInputElement;
                                const container: Element | Document =
                                    previewBoxRef.current ?? document;
                                const allCheckboxes =
                                    container.querySelectorAll('input[type="checkbox"]');
                                let index = -1;
                                for (let i = 0; i < allCheckboxes.length; i++) {
                                    if (allCheckboxes[i] === target) {
                                        index = i;
                                        break;
                                    }
                                }
                                if (index !== -1) onCheckboxToggle(index);
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                        />
                    );
                }
                return <input {...props} />;
            },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            imagesDir,
            previewDarkMode,
            fontSize,
            editContent,
            onImageWidthChange,
            onCheckboxToggle,
            previewBoxRef,
        ]
    );

    // ── Plugin arrays ─────────────────────────────────────────────────────────

    const rehypeSearchHighlightPlugin = useMemo(
        () => makeRehypeSearchHighlight(previewSearchQuery),
        [previewSearchQuery]
    );
    const rehypePlugins = useMemo(
        () =>
            [
                rehypeRaw,
                rehypeHighlight,
                rehypeMathjax,
                rehypeAddSourceLines,
                rehypeHeadingIds,
                rehypeSearchHighlightPlugin,
            ] as any[],
        [rehypeSearchHighlightPlugin]
    );
    const remarkPlugins = useMemo(() => [remarkGfm, remarkMath, remarkItemReference] as any[], []);

    // ── Render ────────────────────────────────────────────────────────────────

    const showTocSidebar = tocSidebarAvailable && tocHeadings.length > 0;

    return (
        <div className="h-full flex">
            {showTocSidebar && (
                <div
                    style={{
                        width: tocSidebarWidth,
                        flexShrink: 0,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: previewDarkMode ? "rgb(32, 32, 32)" : "rgb(255, 255, 255)",
                        borderRight: previewDarkMode
                            ? "1px solid rgba(255,255,255,0.12)"
                            : "1px solid rgba(0,0,0,0.10)",
                        overflowX: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 8px",
                            flexShrink: 0,
                            borderBottom: previewDarkMode
                                ? "1px solid rgba(255,255,255,0.10)"
                                : "1px solid rgba(0,0,0,0.08)",
                            color: previewDarkMode ? "rgb(212,212,212)" : "rgb(50,50,50)",
                        }}
                    >
                        <span style={{ display: "flex", padding: "2px 4px", lineHeight: 1 }}>
                            <ListTree size={15} />
                        </span>
                        <span
                            style={{
                                fontWeight: 600,
                                opacity: 0.6,
                                fontSize: "0.75em",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            Contents
                        </span>
                    </div>
                    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                        <OverlayScrollbar
                            style={{ flex: 1, minWidth: 0 }}
                            thumbColor={
                                previewDarkMode ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.22)"
                            }
                        >
                            <div style={{ padding: "8px 12px 10px" }}>
                                <TocList
                                    headings={tocHeadings}
                                    previewBoxRef={previewBoxRef}
                                    darkMode={previewDarkMode}
                                    wrap
                                    activeId={tocActiveId}
                                />
                            </div>
                        </OverlayScrollbar>
                        <div
                            onMouseDown={onTocResizeMouseDown}
                            title="Drag to resize"
                            style={{ width: 6, flexShrink: 0, cursor: "col-resize" }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = previewDarkMode
                                    ? "rgba(255,255,255,0.18)"
                                    : "rgba(0,0,0,0.12)")
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        />
                    </div>
                </div>
            )}
            <div className="h-full relative" style={{ flex: 1, minWidth: 0 }}>
            {/* Dark/Light mode toggle */}
            <style>{`.preview-toolbar-btn:hover { background: rgba(150,150,150,0.60) !important; }`}</style>
            <button
                onClick={() => dispatch(setPreviewDarkMode(!previewDarkMode))}
                title={previewDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="preview-toolbar-btn"
                style={{
                    position: "absolute",
                    top: 8,
                    right: 18,
                    zIndex: 10,
                    background: previewDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    lineHeight: 1,
                    color: previewDarkMode ? "rgb(212,212,212)" : "rgb(50,50,50)",
                }}
            >
                {previewDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Presentation mode toggle */}
            <button
                onClick={() =>
                    presentationMode
                        ? endPresentation()
                        : (setPresentationMode(true), setPresentationIndex(0))
                }
                title={presentationMode ? "End presentation" : "Start presentation mode"}
                className="preview-toolbar-btn"
                style={{
                    position: "absolute",
                    top: 8,
                    right: 58,
                    zIndex: 10,
                    background: previewDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
                    border: presentationMode
                        ? "1px solid rgba(150,150,150,0.5)"
                        : "1px solid transparent",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    lineHeight: 1,
                    color: previewDarkMode ? "rgb(212,212,212)" : "rgb(50,50,50)",
                }}
            >
                <Presentation size={15} />
            </button>

            {/* Advance button (presentation mode only) */}
            {presentationMode && (
                <button
                    onClick={() => {
                        const next = presentationIndex + 1;
                        if (next >= presentationNodesRef.current.length) endPresentation();
                        else setPresentationIndex(next);
                    }}
                    title="Reveal next"
                    className="preview-toolbar-btn"
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 98,
                        zIndex: 10,
                        background: previewDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 8px",
                        cursor: "pointer",
                        lineHeight: 1,
                        color: previewDarkMode ? "rgb(212,212,212)" : "rgb(50,50,50)",
                    }}
                >
                    <ChevronRight size={15} />
                </button>
            )}

            {/* Back button (presentation mode only) */}
            {presentationMode && (
                <button
                    onClick={() => {
                        setPresentationIndex((idx) => Math.max(0, idx - 1));
                    }}
                    title="Hide last revealed"
                    className="preview-toolbar-btn"
                    disabled={presentationIndex === 0}
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 130,
                        zIndex: 10,
                        background: previewDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 8px",
                        cursor: presentationIndex === 0 ? "default" : "pointer",
                        lineHeight: 1,
                        opacity: presentationIndex === 0 ? 0.35 : 1,
                        color: previewDarkMode ? "rgb(212,212,212)" : "rgb(50,50,50)",
                    }}
                >
                    <ChevronLeft size={15} />
                </button>
            )}

            {/* Preview search bar */}
            {searchOpen && (
                <SearchBar
                    query={previewSearchQuery}
                    onQueryChange={setPreviewSearchQuery}
                    matchCount={previewSearchCount}
                    matchIdx={previewSearchIdx}
                    // @ts-ignore
                    inputRef={searchInputRef}
                    onAdvance={() =>
                        setPreviewSearchIdx((i) =>
                            previewSearchCount === 0 ? 0 : (i + 1) % previewSearchCount
                        )
                    }
                    onClose={onSearchClose}
                />
            )}

            <Box
                ref={previewBoxRef}
                className="markdown-preview"
                style={{ width: "100%" }}
                onDoubleClick={handlePreviewDoubleClick}
                sx={{
                    fontSize: `${fontSize}px`,
                    lineHeight: `${Math.round(fontSize * 1.6)}px`,
                    height: "100%",
                    userSelect: "text",
                    cursor: "text",
                    overflowY: "auto",
                    backgroundColor: previewDarkMode ? "rgb(25, 25, 25)" : "rgb(248, 249, 250)",
                    color: previewDarkMode ? "rgb(212, 212, 212)" : "rgb(30, 30, 30)",
                    padding: "48px 24px 48px 24px",
                    "& h1": {
                        fontSize: "2em",
                        fontWeight: "700",
                        marginTop: "0.67em",
                        marginBottom: "0.67em",
                        borderBottom: previewDarkMode
                            ? "2px solid rgba(255, 255, 255, 0.2)"
                            : "2px solid rgba(0, 0, 0, 0.15)",
                        paddingBottom: "0.3em",
                        color: previewDarkMode ? "rgb(255, 255, 255)" : "rgb(20, 30, 70)",
                    },
                    "& h2": {
                        fontSize: "1.75em",
                        fontWeight: "700",
                        marginTop: "0.75em",
                        marginBottom: "0.5em",
                        borderBottom: previewDarkMode
                            ? "1px solid rgba(255, 255, 255, 0.15)"
                            : "1px solid rgba(0, 0, 0, 0.1)",
                        paddingBottom: "0.3em",
                        color: previewDarkMode ? "rgb(255, 255, 255)" : "rgb(20, 30, 70)",
                    },
                    "& h3": {
                        fontSize: "1.5em",
                        fontWeight: "600",
                        marginTop: "0.75em",
                        marginBottom: "0.5em",
                        color: previewDarkMode ? "rgb(245, 245, 245)" : "rgb(30, 40, 80)",
                    },
                    "& h4": {
                        fontSize: "1.25em",
                        fontWeight: "600",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                        color: previewDarkMode ? "rgb(245, 245, 245)" : "rgb(40, 40, 40)",
                    },
                    "& h5": {
                        fontSize: "1.1em",
                        fontWeight: "600",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                        color: previewDarkMode ? "rgb(230, 230, 230)" : "rgb(60, 60, 60)",
                    },
                    "& h6": {
                        fontSize: "1em",
                        fontWeight: "600",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                        color: previewDarkMode ? "rgb(220, 220, 220)" : "rgb(80, 80, 80)",
                    },
                    "& h1:first-child, & h2:first-child, & h3:first-child, & h4:first-child, & h5:first-child, & h6:first-child":
                        { marginTop: "0" },
                    "& ul, & ol": {
                        paddingLeft: LIST_GUTTER_WIDTH,
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                    },
                    "& ul": { listStyleType: "none" },
                    "& ol": { listStyleType: "decimal" },
                    "& li": { lineHeight: LIST_ITEM_LINE_HEIGHT },
                    // The inline [TOC] keeps its per-level padding but must not
                    // show the bullet the preview draws for ordinary list items.
                    "& ul > li:not(.task-list-item):not([data-toc-id])": {
                        position: "relative",
                    },
                    "& ul > li:not(.task-list-item):not([data-toc-id])::before": {
                        content: '"•"',
                        position: "absolute",
                        left: "-0.82em",
                        top: "-0.385em",
                        fontSize: "2em",
                        lineHeight: LIST_ITEM_LINE_HEIGHT,
                    },
                    "& li.task-list-item": { listStyleType: "none" },
                    "& li.task-list-item input[type='checkbox']": {
                        appearance: "none !important",
                        WebkitAppearance: "none !important",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "1em",
                        height: "1em",
                        margin: "0 0.5em 0 -1.75em",
                        verticalAlign: "text-bottom",
                        cursor: "pointer",
                        border: previewDarkMode
                            ? "2px solid rgba(255, 255, 255, 0.3)"
                            : "2px solid rgba(0, 0, 0, 0.3)",
                        borderRadius: "3px",
                        backgroundColor: "transparent",
                        position: "relative",
                        "&:checked": {
                            backgroundColor: "rgb(59, 130, 246)",
                            borderColor: "rgb(59, 130, 246)",
                            "&::after": {
                                content: '"✓"',
                                color: "white",
                                fontSize: "0.72em",
                                fontWeight: "bold",
                                lineHeight: 1,
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                            },
                        },
                    },
                    // Tight task lists have no <p> wrapper, so this only fires for loose lists.
                    "& li.task-list-item > p": {
                        display: "block",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                    },
                    "& li.task-list-item > ul, & li.task-list-item > ol": {
                        marginTop: "0.4em",
                        marginBottom: "0.4em",
                    },
                    "& p": { marginTop: "0.5em", marginBottom: "0.5em" },
                    "& details": {
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                    },
                    "& summary": {
                        cursor: "pointer",
                        userSelect: "none",
                    },
                    "& details[open] > summary": {
                        marginBottom: "0.4em",
                    },
                    "& code:not(pre code)": {
                        fontSize: "0.82em",
                        backgroundColor: previewDarkMode ? LIGHT_WHITE_BG : "rgba(0, 0, 0, 0.07)",
                        color: previewDarkMode ? "inherit" : "rgb(190, 50, 50)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    },
                    "& pre": {
                        backgroundColor: previewDarkMode ? LIGHT_WHITE_BG : "rgba(0, 0, 0, 0.07)",
                        borderRadius: "4px",
                        padding: "12px",
                        overflow: "auto",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                    },
                    "& pre code, & pre code.hljs, & .hljs": {
                        backgroundColor: "transparent",
                        background: "transparent",
                        color: previewDarkMode ? "inherit" : "rgb(30, 30, 30)",
                        padding: "0",
                        fontSize: "0.9em",
                    },
                    "& blockquote": {
                        borderLeft: previewDarkMode
                            ? "4px solid rgba(255, 255, 255, 0.3)"
                            : "4px solid rgba(0, 0, 0, 0.2)",
                        paddingLeft: "1em",
                        marginLeft: "0",
                        color: previewDarkMode ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.6)",
                    },
                    "& a": {
                        color: previewDarkMode ? "rgb(96, 165, 250)" : "rgb(37, 99, 235)",
                        textDecoration: "underline",
                        "&:hover": {
                            color: previewDarkMode ? "rgb(147, 197, 253)" : "rgb(29, 78, 216)",
                        },
                    },
                    "& table": {
                        borderCollapse: "collapse",
                        width: "100%",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                    },
                    "& th, & td": {
                        border: previewDarkMode
                            ? "1px solid rgba(255, 255, 255, 0.2)"
                            : "1px solid rgba(0, 0, 0, 0.15)",
                        padding: "8px",
                    },
                    "& th": {
                        backgroundColor: previewDarkMode
                            ? "rgba(0, 0, 0, 0.3)"
                            : "rgba(0, 0, 0, 0.05)",
                        fontWeight: "600",
                    },
                    "& mjx-container": { display: "inline-block", verticalAlign: "middle" },
                    "& mjx-container[display='true']": {
                        display: "block",
                        textAlign: "center",
                        margin: "1em 0",
                    },
                }}
            >
                <div
                    ref={presentationContainerRef}
                    style={{
                        maxWidth: `${Math.round((860 * fontSize) / BASE_FONT_SIZE)}px`,
                        margin: "0 auto",
                    }}
                >
                    <ReactMarkdown
                        remarkPlugins={remarkPlugins}
                        rehypePlugins={rehypePlugins}
                        components={markdownComponents}
                    >
                        {editContent}
                    </ReactMarkdown>
                </div>
            </Box>
            </div>
        </div>
    );
}

/** Imperative handle: lets MarkdownEditor call scrollPreviewToLine on the previewer. */
export type ScrollPreviewToLineFn = (lineNum: number, flash: boolean) => void;
