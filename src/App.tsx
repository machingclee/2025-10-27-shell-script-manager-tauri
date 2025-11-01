import "./App.css";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import FolderColumn from "./app-component/FolderColumn/FolderColumn";
import ScriptsColumn from "./app-component/ScriptsColumn/ScriptsColumn";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./components/ui/resizable";
import { appStateApi } from "./store/api/appStateApi";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import folderSlice from "./store/slices/folderSlice";
import { folderApi } from "./store/api/folderApi";




function App() {
  const { data: appState } = appStateApi.endpoints.getAppState.useQuery();
  const { data: appStateData } = appStateApi.endpoints.getAppState.useQueryState();
  const [updateAppState] = appStateApi.endpoints.updateAppState.useMutation();
  const dispatch = useAppDispatch();

  const darkMode = appState?.darkMode ?? false;

  // Load the last opened folder on app start
  useEffect(() => {
    if (appState?.lastOpenedFolderId) {
      dispatch(folderSlice.actions.setSelectedFolderId(appState.lastOpenedFolderId));
    }
  }, [appState, dispatch]);

  // Apply dark mode class to document and update title bar
  useEffect(() => {
    const applyDarkMode = async () => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        await invoke('set_title_bar_color', { isDark: true });
      } else {
        document.documentElement.classList.remove('dark');
        await invoke('set_title_bar_color', { isDark: false });
      }
    };

    applyDarkMode();
  }, [darkMode]);

  const selectedFolderId = useAppSelector(s => s.folder.selectedFolderId)
  const { data: selectedFolder } = folderApi.endpoints.getAllFolders.useQueryState(undefined, {
    selectFromResult: (result) => ({
      data: result.data?.find(f => f.id === selectedFolderId)
    }),
    skip: !selectedFolderId,
  })

  // Listen for toggle dark mode event from menu
  useEffect(() => {
    const unlisten = listen('toggle-dark-mode', async () => {
      const newDarkMode = !darkMode;
      if (appStateData) {
        updateAppState({ ...appStateData, darkMode: newDarkMode });
      }

      // Apply immediately for better UX
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        await invoke('set_title_bar_color', { isDark: true });
      } else {
        document.documentElement.classList.remove('dark');
        await invoke('set_title_bar_color', { isDark: false });
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [darkMode, updateAppState]);

  const handleDragStart = (e: React.MouseEvent) => {
    // Only trigger on left click
    if (e.button !== 0) return;

    const window = getCurrentWindow();
    window.startDragging().catch(err => {
      console.error('Failed to start dragging:', err);
    });
  };

  return (
    <div className="h-screen w-screen bg-neutral-100 dark:bg-neutral-800 flex flex-col">
      {/* Draggable title bar area */}
      <div
        className="h-12 flex-shrink-0 bg-transparent select-none dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center dark:text-white w-full"
        onMouseDown={handleDragStart}
        onDoubleClick={(e) => e.preventDefault()}
      >
        {selectedFolder?.name}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
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
    </div>
  )
}

export default App
