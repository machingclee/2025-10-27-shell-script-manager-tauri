import "./App.css";
import { useEffect } from "react";
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
  const dispatch = useAppDispatch();

  // Load the last opened folder on app start
  useEffect(() => {
    if (appState?.last_opened_folder_id) {
      dispatch(folderSlice.actions.setSelectedFolderId(appState.last_opened_folder_id));
    }
  }, [appState, dispatch]);

  return (
    <div className="h-screen w-screen bg-gray-100">
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
