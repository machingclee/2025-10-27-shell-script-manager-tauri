import "./App.css";
import { useEffect } from "react";
import FolderColumn from "./app-component/FolderColumn";
import ScriptsColumn from "./app-component/ScriptsColumn";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./components/ui/resizable";
import { appStateApi } from "./store/api/appStateApi";
import { useAppDispatch } from "./store/hooks";
import { setSelectedFolderId } from "./store/slices/folderSlice";


function App() {
  const { data: appState } = appStateApi.endpoints.getAppState.useQuery();
  const dispatch = useAppDispatch();

  // Load the last opened folder on app start
  useEffect(() => {
    if (appState?.lastOpenedFolderId) {
      dispatch(setSelectedFolderId(appState.lastOpenedFolderId));
    }
  }, [appState, dispatch]);

  return (
    <div className="h-screen w-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
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
