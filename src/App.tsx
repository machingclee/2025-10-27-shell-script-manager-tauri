import "./App.css";
import { folderApi } from "./store";



function App() {
  const { data: folders, isLoading, error } = folderApi.endpoints.getAllFolders.useQuery();
  return (
    <div className="h-screen w-screen">
      <div className="flex flex-row">
        <div className="flex flex-col gap-1/4">
          <div className="font-medium">Script Folders</div>
          {isLoading && <div>Loading...</div>}
          {folders && folders.map((folder) => <div key={folder.id}>{folder.name}</div>)}
        </div>
        <div className="flex-1">
          <div className="font-medium">Script</div>
        </div>
      </div>
    </div>
  )
}

export default App
