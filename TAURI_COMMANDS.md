# Tauri Commands Reference

This document lists all available Tauri commands that you can call from the frontend using RTK Query.

## 📦 Available Commands

### Example Command

#### `custom_command`
Test command to verify the setup is working.

**Parameters:**
```typescript
{ name: string }
```

**Returns:**
```typescript
{ message: string }
```

**Usage:**
```typescript
// Frontend
const result = await dispatch(
  baseApi.endpoints.exampleGreet.initiate({ name: 'John' })
).unwrap();
// Returns: { message: "Hello, John! Welcome to Tauri + Redux Toolkit!" }
```

---

## 📁 Folder Commands

### `get_all_folders`
Get all folders ordered by their ordering field.

**Parameters:** None

**Returns:**
```typescript
Folder[] // Array of: { id: number, name: string, ordering: number }
```

**Frontend Usage:**
```typescript
const foldersQuery = useAppSelector((state) => 
  baseApi.endpoints.getAllFolders.select()(state)
);
```

---

### `create_folder`
Create a new folder.

**Parameters:**
```typescript
{ name: string }
```

**Returns:**
```typescript
Folder // { id: number, name: string, ordering: number }
```

**Frontend Usage:**
```typescript
await dispatch(
  baseApi.endpoints.createFolder.initiate({ name: 'My Folder' })
).unwrap();
```

---

### `delete_folder`
Delete a folder and all its associated scripts.

**Parameters:**
```typescript
{ id: number }
```

**Returns:** `void`

**Frontend Usage:**
```typescript
await dispatch(
  baseApi.endpoints.deleteFolder.initiate(folderId)
).unwrap();
```

---

## 📝 Script Commands

### `get_scripts_by_folder`
Get all scripts belonging to a specific folder.

**Parameters:**
```typescript
{ folder_id: number }
```

**Returns:**
```typescript
Script[] // Array of: { id: number, name: string, command: string, execution_count: number }
```

**Frontend Usage:**
```typescript
const scriptsQuery = useAppSelector((state) => 
  baseApi.endpoints.getScriptsByFolder.select(folderId)(state)
);
```

---

### `create_script`
Create a new script and associate it with a folder.

**Parameters:**
```typescript
{
  name: string,
  content: string,
  folder_id: number
}
```

**Returns:**
```typescript
Script // { id: number, name: string, command: string, execution_count: number }
```

**Frontend Usage:**
```typescript
await dispatch(
  baseApi.endpoints.createScript.initiate({
    name: 'Deploy Script',
    content: 'npm run deploy',
    folder_id: 1
  })
).unwrap();
```

---

### `update_script`
Update a script's name and/or content.

**Parameters:**
```typescript
{
  id: number,
  name?: string,      // Optional
  content?: string    // Optional
}
```

**Returns:**
```typescript
Script // { id: number, name: string, command: string, execution_count: number }
```

**Frontend Usage:**
```typescript
await dispatch(
  baseApi.endpoints.updateScript.initiate({
    id: scriptId,
    name: 'New Name',
    content: 'new command'
  })
).unwrap();
```

**Note:** Currently returns placeholder data. Consider adding a `get_script_by_id` repository method.

---

### `delete_script`
Delete a script and its folder relationships.

**Parameters:**
```typescript
{ id: number }
```

**Returns:** `void`

**Frontend Usage:**
```typescript
await dispatch(
  baseApi.endpoints.deleteScript.initiate(scriptId)
).unwrap();
```

---

## 🔧 Implementation Details

### Type Mapping: Rust ↔ TypeScript

| Rust Type | TypeScript Type |
|-----------|----------------|
| `i32` | `number` |
| `String` | `string` |
| `Vec<T>` | `T[]` |
| `Option<T>` | `T \| undefined` |
| `Result<T, String>` | Returns `T` or throws error |

### Error Handling

All commands return `Result<T, String>` in Rust. Errors are automatically converted to rejections that you can catch:

```typescript
try {
  const result = await dispatch(
    baseApi.endpoints.createFolder.initiate({ name: 'Test' })
  ).unwrap();
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error); // String error message from Rust
}
```

### Database Integration

All commands use the repository pattern:
- **FolderRepository**: Located in `src-tauri/src/db/repository/folder_repository.rs`
- **ScriptRepository**: Located in `src-tauri/src/db/repository/script_repository.rs`

The repositories use Prisma Client Rust for database operations.

---

## 🚀 Adding New Commands

### 1. Define the Rust Command

In `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
async fn my_command(param: String) -> Result<MyType, String> {
    // Your implementation
    Ok(MyType { /* ... */ })
}
```

### 2. Register the Command

Add it to the invoke handler:

```rust
.invoke_handler(tauri::generate_handler![
    custom_command,
    get_all_folders,
    // ... other commands
    my_command,  // Add here
])
```

### 3. Create Frontend Endpoint

In your API file (e.g., `src/store/api/folderApi.ts`):

```typescript
myCommand: builder.query<MyType, { param: string }>({
  query: (args) => ({
    command: 'my_command',
    args,
  }),
  providesTags: ['MyTag'],
}),
```

### 4. Update Tag Types

In `src/store/api/baseApi.ts`:

```typescript
tagTypes: ['Folder', 'Script', 'MyTag'],
```

---

## 📚 Resources

- **Tauri Commands Documentation**: https://tauri.app/develop/calling-rust/
- **Prisma Client Rust**: https://prisma.brendonovich.dev/
- **RTK Query**: https://redux-toolkit.js.org/rtk-query/overview

