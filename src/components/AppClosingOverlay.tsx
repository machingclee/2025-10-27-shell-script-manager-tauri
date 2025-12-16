import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export default function AppClosingOverlay() {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        console.log("[AppClosingOverlay] Setting up listener");
        const unlisten = listen("app-closing", () => {
            console.log("[AppClosingOverlay] App is closing, showing overlay");
            setIsClosing(true);
        });

        return () => {
            console.log("[AppClosingOverlay] Cleaning up listener");
            unlisten.then((fn) => fn());
        };
    }, []);

    console.log("[AppClosingOverlay] Render - isClosing:", isClosing);

    if (!isClosing) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-neutral-700 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    Shutting down...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Please wait while we close the application
                </div>
            </div>
        </div>
    );
}
