import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowWidth() {
    const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        let cleanupFallback: (() => void) | undefined;

        const setupResizeListener = async () => {
            const currentWindow = getCurrentWindow();
            const size = await currentWindow.innerSize();
            setWindowWidth(size.width);

            unlisten = await currentWindow.onResized(({ payload }) => {
                setWindowWidth(payload.width);
            });
        };

        setupResizeListener().catch(() => {
            const handleWindowResize = () => setWindowWidth(window.innerWidth);
            setWindowWidth(window.innerWidth);
            window.addEventListener("resize", handleWindowResize);
            cleanupFallback = () => window.removeEventListener("resize", handleWindowResize);
        });

        return () => {
            unlisten?.();
            cleanupFallback?.();
        };
    }, []);

    return windowWidth;
}
