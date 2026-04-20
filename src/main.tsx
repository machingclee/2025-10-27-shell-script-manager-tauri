import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store/store";
import { BackendLoadingScreen } from "./components/BackendLoadingScreen";
import "./index.css";
import { StyledEngineProvider } from "@mui/material/styles";
import { openUrl } from "@tauri-apps/plugin-opener";

// Intercept all link clicks and open them in the default browser
document.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    e.preventDefault();
    openUrl(href).catch(console.error);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <Provider store={store}>
                <BackendLoadingScreen>
                    <App />
                </BackendLoadingScreen>
            </Provider>
        </StyledEngineProvider>
    </React.StrictMode>
);
