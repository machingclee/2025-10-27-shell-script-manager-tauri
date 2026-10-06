import React, { useCallback, useEffect, useRef, useState } from "react";

const THUMB_MIN_HEIGHT = 24;

/**
 * Scroll container whose vertical scrollbar floats over the content instead of
 * reserving a gutter. Horizontal scrolling is disabled.
 */
export default function OverlayScrollbar({
    children,
    className,
    style,
    thumbColor = "rgba(156, 163, 175, 0.55)",
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    thumbColor?: string;
}) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });
    const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

    const update = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight <= clientHeight + 1) {
            setThumb((prev) => (prev.visible ? { top: 0, height: 0, visible: false } : prev));
            return;
        }
        const height = Math.max(THUMB_MIN_HEIGHT, (clientHeight / scrollHeight) * clientHeight);
        const maxTop = clientHeight - height;
        const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
        setThumb({ top, height, visible: true });
    }, []);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => observer.disconnect();
    }, [update, children]);

    const onThumbMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const el = scrollerRef.current;
        if (!el) return;
        dragRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
        const scrollable = el.scrollHeight - el.clientHeight;
        const track = el.clientHeight - thumb.height;

        const onMove = (ev: MouseEvent) => {
            if (!dragRef.current || track <= 0) return;
            const delta = ev.clientY - dragRef.current.startY;
            el.scrollTop = dragRef.current.startScrollTop + (delta / track) * scrollable;
        };
        const onUp = () => {
            dragRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div style={{ position: "relative", minHeight: 0, ...style }} className={className}>
            <div
                ref={scrollerRef}
                onScroll={update}
                style={{
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    scrollbarWidth: "none",
                }}
                className="[&::-webkit-scrollbar]:hidden"
            >
                {children}
            </div>
            {thumb.visible && (
                <div
                    onMouseDown={onThumbMouseDown}
                    style={{
                        position: "absolute",
                        top: thumb.top,
                        right: 2,
                        width: 6,
                        height: thumb.height,
                        borderRadius: 3,
                        backgroundColor: thumbColor,
                        cursor: "default",
                    }}
                />
            )}
        </div>
    );
}
