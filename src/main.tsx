import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store/store";
import { BackendLoadingScreen } from "./components/BackendLoadingScreen";
import "./index.css";
import { StyledEngineProvider } from "@mui/material/styles";

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
