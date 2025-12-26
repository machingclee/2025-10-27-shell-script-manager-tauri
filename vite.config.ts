import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
    plugins: [
        react(),
        // Removed monacoEditorPlugin as we are now using static assets from public/monaco
    ],

    // Use relative paths for assets in production so they work with Tauri's custom protocol
    base: "./",

    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html"),
                markdown: path.resolve(__dirname, "src/subwindows/markdown-window.html"),
            },
            output: {
                // Force shared CSS and vendor chunks
                manualChunks: (id) => {
                    // Put all CSS-related imports together
                    if (id.includes(".css") || id.includes("tailwind")) {
                        return "styles";
                    }
                    // Put all node_modules in vendor chunk
                    if (id.includes("node_modules")) {
                        return "vendor";
                    }
                },
                // Ensure consistent asset naming
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split(".");
                    const ext = info[info.length - 1];
                    if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
                        return `assets/images/[name]-[hash][extname]`;
                    }
                    if (/\.css$/i.test(assetInfo.name)) {
                        return `assets/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
            },
        },
        // Ensure assets are properly inlined/copied
        assetsInlineLimit: 4096, // Inline assets smaller than 4kb
        cssCodeSplit: false, // Bundle all CSS into one file to ensure Monaco styles are loaded
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Ensure proper minification
        minify: "esbuild",
        // Output to a clean directory
        emptyOutDir: true,
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: "ws",
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
