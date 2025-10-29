# RTK Query with Tauri Usage Guide

This project uses RTK Query with a custom base query that uses Tauri's `invoke` function instead of fetch/axios. This allows you to seamlessly call your embedded Rust backend.

## File Structure

```
src/store/
├── api/
│   ├── tauriBaseQuery.ts  # Custom base query using Tauri invoke
│   ├── baseApi.ts         # Base API (createApi)
│   ├── folderApi.ts       # Example: Folder endpoints
│   └── scriptApi.ts       # Example: Script endpoints
└── store.ts               # Store configuration with RTK Query middleware
```

## How It Works

The custom `tauriBaseQuery` wraps Tauri's `invoke` function, allowing you to define endpoints that call your Rust backend commands directly.

## Defining Endpoints

### Basic Query Endpoint

```typescript
import { baseApi } from './baseApi';

export const myApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getItems: builder.query<Item[], void>({
      query: () => ({
        command: 'get_items',  // Your Rust command name
        args: {},              // Arguments to pass to the command
      }),
      providesTags: ['Item'],
    }),
  }),
});
```

### Query with Parameters

```typescript
getFolderById: builder.query<Folder, number>({
  query: (id) => ({
    command: 'get_folder_by_id',
    args: { id },  // Pass the id to your Rust command
  }),
  providesTags: (result, error, id) => [{ type: 'Folder', id }],
}),
```

### Mutation Endpoints

```typescript
createFolder: builder.mutation<Folder, CreateFolderRequest>({
  query: (folder) => ({
    command: 'create_folder',
    args: folder,
  }),
  invalidatesTags: ['Folder'],  // Refetch all Folder queries after mutation
}),
```

## Using Endpoints in Components

All examples use the `.endpoints` API with dispatch rather than auto-generated hooks.

### Queries (GET operations)

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { baseApi } from '../store/api/baseApi';

function FolderList() {
  const dispatch = useAppDispatch();
  const foldersQuery = useAppSelector((state) => 
    baseApi.endpoints.getAllFolders.select()(state)
  );
  
  const { data, error, isLoading } = foldersQuery;

  const handleRefetch = () => {
    dispatch(baseApi.endpoints.getAllFolders.initiate(undefined, { 
      forceRefetch: true 
    }));
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.data}</div>;

  return (
    <div>
      <button onClick={handleRefetch}>Refresh</button>
      {data?.map(folder => (
        <div key={folder.id}>{folder.name}</div>
      ))}
    </div>
  );
}
```

### Queries with Parameters

```typescript
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { baseApi } from '../store/api/baseApi';
import { useEffect } from 'react';

function FolderDetail({ folderId }: { folderId: number }) {
  const dispatch = useAppDispatch();
  
  // Trigger the query when component mounts or folderId changes
  useEffect(() => {
    dispatch(baseApi.endpoints.getFolderById.initiate(folderId));
  }, [dispatch, folderId]);

  const folderQuery = useAppSelector((state) => 
    baseApi.endpoints.getFolderById.select(folderId)(state)
  );

  if (folderQuery.isLoading) return <div>Loading...</div>;

  return <div>{folderQuery.data?.name}</div>;
}
```

### Mutations (POST, PUT, DELETE operations)

```typescript
import { useAppDispatch } from '../store/hooks';
import { baseApi } from '../store/api/baseApi';
import { useState } from 'react';

function CreateFolderForm() {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await dispatch(
        baseApi.endpoints.createFolder.initiate({
          name: 'New Folder',
          parent_id: 1,
        })
      ).unwrap();
      console.log('Folder created:', result);
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Folder'}
      </button>
      {error && <div>Error: {JSON.stringify(error)}</div>}
    </form>
  );
}
```

## Advanced Features

### Conditional Fetching

Skip a query until a condition is met using `useEffect`:

```typescript
import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { baseApi } from '../store/api/baseApi';

function MyComponent({ folderId }: { folderId?: number }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (folderId) {
      // Only fetch if folderId exists
      dispatch(baseApi.endpoints.getFolderById.initiate(folderId));
    }
  }, [dispatch, folderId]);

  // ... rest of component
}
```

### Polling

Automatically refetch data at intervals by setting up a polling effect:

```typescript
import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { baseApi } from '../store/api/baseApi';

function MyComponent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initial fetch
    dispatch(baseApi.endpoints.getAllFolders.initiate());

    // Set up polling
    const interval = setInterval(() => {
      dispatch(baseApi.endpoints.getAllFolders.initiate(undefined, {
        forceRefetch: true
      }));
    }, 5000); // Refetch every 5 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  // ... rest of component
}
```

### Manual Cache Updates

Update cache without making a request:

```typescript
import { baseApi } from '../store/api/baseApi';
import { useAppDispatch } from '../store/hooks';

function MyComponent() {
  const dispatch = useAppDispatch();

  const updateCache = () => {
    dispatch(
      baseApi.util.updateQueryData('getAllFolders', undefined, (draft) => {
        draft.push({ id: 999, name: 'New Folder' });
      })
    );
  };
}
```

### Optimistic Updates

Update UI immediately before the mutation completes:

```typescript
deleteFolder: builder.mutation<void, number>({
  query: (id) => ({
    command: 'delete_folder',
    args: { id },
  }),
  onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
    // Optimistically update cache
    const patchResult = dispatch(
      baseApi.util.updateQueryData('getAllFolders', undefined, (draft) => {
        return draft.filter(folder => folder.id !== id);
      })
    );
    try {
      await queryFulfilled;
    } catch {
      // Undo the optimistic update if the mutation fails
      patchResult.undo();
    }
  },
  invalidatesTags: ['Folder'],
}),
```

## Cache Invalidation

RTK Query uses tags to manage cache invalidation:

### providesTags

Marks what data a query provides:

```typescript
getAllFolders: builder.query<Folder[], void>({
  query: () => ({ command: 'get_all_folders', args: {} }),
  providesTags: ['Folder'],  // All folders
}),

getFolderById: builder.query<Folder, number>({
  query: (id) => ({ command: 'get_folder_by_id', args: { id } }),
  providesTags: (result, error, id) => [{ type: 'Folder', id }],  // Specific folder
}),
```

### invalidatesTags

Marks what data a mutation invalidates:

```typescript
createFolder: builder.mutation<Folder, CreateFolderRequest>({
  query: (folder) => ({ command: 'create_folder', args: folder }),
  invalidatesTags: ['Folder'],  // Refetch all Folder queries
}),

updateFolder: builder.mutation<Folder, UpdateFolderRequest>({
  query: (folder) => ({ command: 'update_folder', args: folder }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Folder', id },  // Refetch specific folder
    'Folder',                 // Refetch all folders
  ],
}),
```

## Creating a New API Slice

1. Create a new file in `src/store/api/`:

```typescript
import { baseApi } from './baseApi';

export interface MyData {
  id: number;
  name: string;
}

export const myApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyData: builder.query<MyData[], void>({
      query: () => ({
        command: 'rust_command_name',
        args: {},
      }),
      providesTags: ['MyTag'],
    }),
  }),
});
```

2. Add the tag type to `baseApi.ts`:

```typescript
tagTypes: ['Folder', 'Script', 'MyTag'],  // Add your tag
```

## Rust Backend Integration

Your Rust commands should match the command names in your queries:

```rust
#[tauri::command]
async fn get_all_folders() -> Result<Vec<Folder>, String> {
    // Your implementation
}

#[tauri::command]
async fn create_folder(name: String, parent_id: Option<i32>) -> Result<Folder, String> {
    // Your implementation
}
```

## TypeScript Types

Make sure your TypeScript types match your Rust types:

```typescript
// TypeScript
export interface Folder {
  id: number;
  name: string;
  parent_id?: number;
}
```

```rust
// Rust
#[derive(Serialize, Deserialize)]
pub struct Folder {
    pub id: i32,
    pub name: String,
    pub parent_id: Option<i32>,
}
```

## Best Practices

1. **Use TypeScript types** for all queries and mutations
2. **Set up proper tag invalidation** for automatic cache updates
3. **Handle loading and error states** in your UI
4. **Use `unwrap()`** with mutations to handle promise results
5. **Split API slices by feature** (folderApi, scriptApi, etc.)
6. **Match command names exactly** with your Rust backend
7. **Use optimistic updates** for better UX on mutations

## Resources

- [RTK Query Documentation](https://redux-toolkit.js.org/rtk-query/overview)
- [Tauri Invoke Documentation](https://tauri.app/v1/guides/features/command)

