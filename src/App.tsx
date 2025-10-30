import "./App.css";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import FolderColumn from "./app-component/FolderColumn";
import ScriptsColumn from "./app-component/ScriptsColumn/ScriptsColumn";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./components/ui/resizable";
import { appStateApi } from "./store/api/appStateApi";
import { useAppDispatch } from "./store/hooks";
import folderSlice from "./store/slices/folderSlice";



function App() {
  const { data: appState } = appStateApi.endpoints.getAppState.useQuery();
  const { data: darkMode } = appStateApi.endpoints.getDarkMode.useQuery();
  const [setDarkMode] = appStateApi.endpoints.setDarkMode.useMutation();
  const dispatch = useAppDispatch();

  // Load the last opened folder on app start
  useEffect(() => {
    if (appState?.last_opened_folder_id) {
      dispatch(folderSlice.actions.setSelectedFolderId(appState.last_opened_folder_id));
    }
  }, [appState, dispatch]);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen for toggle dark mode event from menu
  useEffect(() => {
    const unlisten = listen('toggle-dark-mode', () => {
      const newDarkMode = !darkMode;
      setDarkMode(newDarkMode);

      // Apply immediately for better UX
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [darkMode, setDarkMode]);

  return (
    <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={25} maxSize={50}>
          <FolderColumn />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <ScriptsColumn />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default App
