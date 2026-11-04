import { useEffect, useState } from "react";

const FADE_MS = 100;

/** Keep a popover mounted through a 0.1s opacity fade in and out. */
export function useFadePresence(open: boolean) {
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(open);

    useEffect(() => {
        if (open) {
            setMounted(true);
            setVisible(false);
            let inner = 0;
            const outer = requestAnimationFrame(() => {
                inner = requestAnimationFrame(() => setVisible(true));
            });
            return () => {
                cancelAnimationFrame(outer);
                cancelAnimationFrame(inner);
            };
        }
        setVisible(false);
        const timer = window.setTimeout(() => setMounted(false), FADE_MS);
        return () => window.clearTimeout(timer);
    }, [open]);

    return { mounted, visible };
}

export function fadePopoverClass(visible: boolean) {
    return `transition-opacity duration-100 ease-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
    }`;
}
