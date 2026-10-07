import { openPath, openUrl } from "@tauri-apps/plugin-opener";

/**
 * A link the webview must never navigate to. `#...` is an in-document jump
 * (the contents sidebar) and stays inside the previewer. Anything else — an
 * absolute URL, a `file://` path, or a site-relative path such as
 * `/files/spec.pdf#page=610` — would replace the app with a blank page.
 */
export function isExternalHref(href: string | null | undefined): boolean {
    if (!href) return false;
    const trimmed = href.trim();
    if (!trimmed || trimmed.startsWith("#")) return false;
    return true;
}

/**
 * Open a link outside the webview. `openUrl` only accepts http(s), mailto and
 * tel, so a `file://` link (a PDF, for example) must go through `openPath` —
 * otherwise the webview navigates to it and the app goes blank.
 *
 * A root-relative link has no host of its own; resolving it against the app
 * (`http://localhost:1420/files/...`) is exactly the navigation that blanks the
 * window, so it is refused rather than opened.
 */
export function openExternalLink(href: string): Promise<void> {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return Promise.reject(new Error(`Not an absolute link: ${href}`));
    }
    if (url.protocol === "file:") {
        const path = decodeURIComponent(url.pathname);
        return openPath(path);
    }
    return openUrl(href);
}
