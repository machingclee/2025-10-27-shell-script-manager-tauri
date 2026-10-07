import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store/store";
import { BackendLoadingScreen } from "./components/BackendLoadingScreen";
import "./index.css";
import { StyledEngineProvider } from "@mui/material/styles";
import { isExternalHref, openExternalLink } from "./lib/openExternalLink";
import { TauriClickToComponent } from "./components/TauriClickToComponent";

// Intercept all link clicks and open them in the default browser
document.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (!isExternalHref(href)) return;
    // Always stop the navigation, even when the link cannot be opened outside
    // the app (a site-relative path, for example).
    e.preventDefault();
    openExternalLink(href!).catch(console.error);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        {import.meta.env.DEV && <TauriClickToComponent />}
        <StyledEngineProvider injectFirst>
            <Provider store={store}>
                <BackendLoadingScreen>
                    <App />
                </BackendLoadingScreen>
            </Provider>
        </StyledEngineProvider>
    </React.StrictMode>
);
