import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { baseApi } from '../store/api/baseApi';
import type { Folder } from '../store/api/folderApi';

/**
 * Example component demonstrating RTK Query with Tauri invoke using .endpoints API
 * This shows how to fetch, create, update, and delete folders using dispatch
 */
export function FolderExample() {
  const [newFolderName, setNewFolderName] = useState('');
  const dispatch = useAppDispatch();

  // Access query state from the Redux store
  const foldersQuery = useAppSelector((state) => 
    baseApi.endpoints.getAllFolders.select()(state)
  );
  
  const folders = foldersQuery.data;
  const isLoading = foldersQuery.isLoading;
  const error = foldersQuery.error;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await dispatch(
        baseApi.endpoints.createFolder.initiate({ name: newFolderName })
      ).unwrap();
      setNewFolderName('');
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleUpdateFolder = async (id: number, newName: string) => {
    try {
      await dispatch(
        baseApi.endpoints.updateFolder.initiate({ id, name: newName })
      ).unwrap();
    } catch (err) {
      console.error('Failed to update folder:', err);
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      await dispatch(
        baseApi.endpoints.deleteFolder.initiate(id)
      ).unwrap();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleRefetch = () => {
    dispatch(baseApi.endpoints.getAllFolders.initiate(undefined, { forceRefetch: true }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading folders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">Error loading folders: {JSON.stringify(error)}</p>
        <button
          onClick={handleRefetch}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">RTK Query + Tauri Example (.endpoints API)</h2>

      {/* Create Folder Form */}
      <form onSubmit={handleCreateFolder} className="space-y-2">
        <h3 className="text-lg font-semibold">Create New Folder</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create
          </button>
        </div>
      </form>

      {/* Folder List */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Folders ({folders?.length || 0})</h3>
        {folders && folders.length > 0 ? (
          <div className="space-y-2">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded"
              >
                <span className="flex-1 font-medium">{folder.name}</span>
                <button
                  onClick={() => {
                    const newName = prompt('Enter new name:', folder.name);
                    if (newName) handleUpdateFolder(folder.id, newName);
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No folders yet. Create one above!</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          💡 This component uses RTK Query's .endpoints API with dispatch.
          All API calls go through your Rust backend commands.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Make sure your Rust backend has these commands implemented:
          <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
            get_all_folders, create_folder, update_folder, delete_folder
          </code>
        </p>
      </div>
    </div>
  );
}
