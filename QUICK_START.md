# Quick Start: Redux Toolkit + RTK Query with Tauri

This guide shows you how to quickly start using Redux Toolkit and RTK Query with your Tauri backend.

## 🎯 What's Set Up

✅ **Redux Toolkit** - Modern Redux with less boilerplate  
✅ **RTK Query** - Data fetching and caching (using Tauri `invoke` instead of fetch/axios)  
✅ **TypeScript** - Fully typed store and API calls  
✅ **Example Components** - See working examples in action  

## 🚀 Quick Start

### 1. Use Redux State in a Component

```typescript
import { useAppSelector, useAppDispatch } from './store';
import { increment } from './store/slices/exampleSlice';

function Counter() {
  const count = useAppSelector((state) => state.example.value);
  const dispatch = useAppDispatch();

  return (
    <button onClick={() => dispatch(increment())}>
      Count: {count}
    </button>
  );
}
```

### 2. Fetch Data from Your Tauri Backend

```typescript
import { useAppDispatch, useAppSelector } from './store';
import { baseApi } from './store/api/baseApi';

function FolderList() {
  const foldersQuery = useAppSelector((state) => 
    baseApi.endpoints.getAllFolders.select()(state)
  );
  
  const { data, isLoading, error } = foldersQuery;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;

  return (
    <ul>
      {data?.map(folder => (
        <li key={folder.id}>{folder.name}</li>
      ))}
    </ul>
  );
}
```

### 3. Create/Update/Delete Data

```typescript
import { useAppDispatch } from './store';
import { baseApi } from './store/api/baseApi';

function CreateFolder() {
  const dispatch = useAppDispatch();

  const handleCreate = async () => {
    try {
      await dispatch(
        baseApi.endpoints.createFolder.initiate({ name: 'New Folder' })
      ).unwrap();
      alert('Created!');
    } catch (err) {
      alert('Error!');
    }
  };

  return (
    <button onClick={handleCreate}>
      Create Folder
    </button>
  );
}
```

## 📁 File Structure

```
src/
├── store/
│   ├── store.ts                    # Redux store configuration
│   ├── hooks.ts                    # Typed hooks
│   ├── index.ts                    # Convenient exports
│   ├── slices/
│   │   └── exampleSlice.ts         # Example Redux slice
│   └── api/
│       ├── tauriBaseQuery.ts       # Custom Tauri base query
│       ├── baseApi.ts              # Base API (createApi)
│       ├── folderApi.ts            # Folder endpoints
│       └── scriptApi.ts            # Script endpoints
├── components/
│   ├── ExampleCounter.tsx          # Redux example
│   └── FolderExample.tsx           # RTK Query example
└── main.tsx                        # Provider setup
```

## 🔧 Creating Your Own Endpoints

### Step 1: Define Your Types

```typescript
// src/store/api/myApi.ts
export interface MyData {
  id: number;
  name: string;
}
```

### Step 2: Create API Endpoints

```typescript
import { baseApi } from './baseApi';

export const myApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Query (GET)
    getMyData: builder.query<MyData[], void>({
      query: () => ({
        command: 'get_my_data',  // Your Rust command name
        args: {},
      }),
      providesTags: ['MyData'],
    }),

    // Mutation (POST/PUT/DELETE)
    createMyData: builder.mutation<MyData, { name: string }>({
      query: (data) => ({
        command: 'create_my_data',
        args: data,
      }),
      invalidatesTags: ['MyData'],  // Auto-refetch after create
    }),
  }),
});
```

### Step 3: Add Tag to baseApi.ts

```typescript
tagTypes: ['Folder', 'Script', 'MyData'],  // Add your tag
```

### Step 4: Implement Rust Command

```rust
#[tauri::command]
async fn get_my_data() -> Result<Vec<MyData>, String> {
    // Your implementation
}

#[tauri::command]
async fn create_my_data(name: String) -> Result<MyData, String> {
    // Your implementation
}
```

### Step 5: Use in Component

```typescript
import { useAppDispatch, useAppSelector } from './store';
import { baseApi } from './store/api/baseApi';

function MyComponent() {
  const dispatch = useAppDispatch();
  const dataQuery = useAppSelector((state) => 
    baseApi.endpoints.getMyData.select()(state)
  );

  const handleCreate = () => {
    dispatch(baseApi.endpoints.createMyData.initiate({ name: 'New' }));
  };

  return (
    <div>
      {dataQuery.data?.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={handleCreate}>Create</button>
    </div>
  );
}
```

## 🎓 Key Concepts

### Queries vs Mutations

- **Query**: Fetching data (GET) - use `builder.query`, access via `.endpoints.queryName.select()`
- **Mutation**: Changing data (POST/PUT/DELETE) - use `builder.mutation`, trigger via `.endpoints.mutationName.initiate()`

### Cache Invalidation

```typescript
// This endpoint provides 'Folder' tags
providesTags: ['Folder']

// This mutation invalidates 'Folder' tags
// All queries with 'Folder' tags will refetch automatically
invalidatesTags: ['Folder']
```

### Command Mapping

Your endpoint's `command` field must match your Rust command name exactly:

```typescript
// TypeScript
query: () => ({ command: 'get_all_folders' })

// Rust
#[tauri::command]
async fn get_all_folders() -> Result<Vec<Folder>, String>
```

## 📝 Common Patterns

### Loading States

```typescript
const dispatch = useAppDispatch();
const query = useAppSelector((state) => 
  baseApi.endpoints.getFolders.select()(state)
);
const { data, isLoading, error } = query;
```

### Manual Refetch

```typescript
const dispatch = useAppDispatch();

const handleRefetch = () => {
  dispatch(baseApi.endpoints.getFolders.initiate(undefined, { 
    forceRefetch: true 
  }));
};

<button onClick={handleRefetch}>Refresh</button>
```

### Triggering Queries Programmatically

```typescript
const dispatch = useAppDispatch();

// Trigger a query
dispatch(baseApi.endpoints.getFolderById.initiate(folderId));

// Trigger with options
dispatch(baseApi.endpoints.getFolders.initiate(undefined, {
  subscribe: false,  // Don't subscribe to updates
  forceRefetch: true,  // Force refetch even if cached
}));
```

## 📚 Documentation

- **Redux Toolkit Basics**: See `REDUX_USAGE.md`
- **RTK Query Details**: See `RTK_QUERY_USAGE.md`
- **Example Components**:
  - `src/components/ExampleCounter.tsx` - Redux state management
  - `src/components/FolderExample.tsx` - RTK Query with Tauri

## 🧹 Removing Example Code

When you're ready, you can remove:
- `src/store/slices/exampleSlice.ts`
- `src/components/ExampleCounter.tsx`
- `src/components/FolderExample.tsx`

And remove the example reducer from `store.ts`:
```typescript
// Remove this line
example: exampleReducer,
```

## 💡 Tips

1. Always use typed hooks: `useAppSelector`, `useAppDispatch`
2. Match TypeScript types with your Rust structs
3. Use `unwrap()` on mutations to handle promises
4. Set up proper tag invalidation for auto-updates
5. Handle loading and error states in UI
6. Keep API slices organized by feature

Happy coding! 🚀

