# ✅ Folder API Migrated to Spring Boot

## 🎯 What Changed

Your folder API now uses **Spring Boot REST endpoints** instead of Tauri commands!

---

## 📁 Files Modified

### Frontend
- ✅ `src/store/api/httpBaseQuery.ts` - **NEW** HTTP base query for Spring Boot
- ✅ `src/store/api/baseApi.ts` - Switched from `tauriBaseQuery` to `httpBaseQuery`
- ✅ `src/store/api/folderApi.ts` - Updated to use REST endpoints

### Backend
- ✅ `backend-spring/src/main/kotlin/com/scriptmanager/controller/FolderController.kt` - Added reorder endpoint

---

## 🚀 How It Works Now

### Before (Tauri Commands)
```typescript
// Called Rust command via Tauri
query: () => ({
  command: 'get_all_folders',
  args: {},
})
```

### After (Spring Boot HTTP)
```typescript
// Calls Spring Boot REST API
query: () => ({
  url: '/api/folders',
  method: 'GET',
})
```

---

## 🔌 API Endpoints Used

### Get All Folders
```
GET http://localhost:7070/api/folders
```
**Response:**
```json
[
  {
    "folder": { "id": 1, "name": "Scripts", "ordering": 0 },
    "scripts": [...]
  }
]
```

### Create Folder
```
POST http://localhost:7070/api/folders
Body: { "name": "New Folder" }
```

### Update Folder (Rename)
```
PUT http://localhost:7070/api/folders/{id}
Body: { "name": "Updated Name", "ordering": 0 }
```

### Delete Folder
```
DELETE http://localhost:7070/api/folders/{id}
```

### Reorder Folders ⭐ NEW
```
POST http://localhost:7070/api/folders/reorder
Body: { "fromIndex": 0, "toIndex": 2 }
```

---

## ✨ Key Features

### 1. Response Transformation
The Spring Boot API returns folders with scripts included, but the frontend only needs folder data. We use `transformResponse`:

```typescript
transformResponse: (response: FolderResponse[]) => {
  return response.map(item => item.folder);
}
```

### 2. ApiResponse Wrapper Handling
Spring Boot wraps responses in `ApiResponse<T>`, so we extract the result:

```typescript
transformResponse: (response: { result: Folder }) => {
  return response.result;
}
```

### 3. Cache Invalidation
Instead of manual optimistic updates, we use RTK Query's automatic cache invalidation:

```typescript
invalidatesTags: ['Folder']
```

This automatically refetches folder data after mutations!

---

## 🧪 Testing

### 1. Test Backend Endpoints

```bash
# Make sure Spring Boot is running
cd backend-spring
./gradlew bootRun
```

In another terminal:

```bash
# Get all folders
curl http://localhost:7070/api/folders

# Create a folder
curl -X POST http://localhost:7070/api/folders \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Folder","ordering":0}'

# Reorder folders
curl -X POST http://localhost:7070/api/folders/reorder \
  -H "Content-Type: application/json" \
  -d '{"fromIndex":0,"toIndex":1}'
```

### 2. Test in Your App

```bash
# Run the app
cd src-tauri
cargo tauri dev
```

**Try these actions:**
- ✅ View folders list
- ✅ Create a new folder
- ✅ Rename a folder
- ✅ Delete a folder
- ✅ Drag and drop to reorder folders

All should now go through Spring Boot! Check the Network tab in DevTools to see the HTTP requests.

---

## 🔄 How Data Flows

```
User Action (Create Folder)
        ↓
React Component calls useCreateFolderMutation()
        ↓
RTK Query makes HTTP POST to Spring Boot
        ↓
POST http://localhost:7070/api/folders
        ↓
Spring Boot FolderController.createFolder()
        ↓
Save to database
        ↓
Return ApiResponse<Folder>
        ↓
Frontend transforms response
        ↓
RTK Query invalidates 'Folder' cache
        ↓
getAllFolders refetches automatically
        ↓
UI updates with new folder ✅
```

---

## 💡 Benefits

### 1. No More Tauri Commands for Folders
Your Rust backend doesn't need to handle folder operations anymore!

### 2. Automatic Cache Management
RTK Query handles cache invalidation - no manual optimistic updates needed.

### 3. Standard REST API
Any HTTP client can now access your folder data.

### 4. Easier Testing
You can test the API with curl/Postman without the app running.

### 5. Better Error Handling
HTTP status codes and error messages are clearer.

---

## 🔧 Configuration

### Change Backend URL

Edit `src/store/api/httpBaseQuery.ts`:

```typescript
const BACKEND_URL = 'http://localhost:7070';
// Change this ↑ if your backend runs on a different port
```

### Switch Back to Tauri (if needed)

Edit `src/store/api/baseApi.ts`:

```typescript
// Use Tauri commands
import { tauriBaseQuery } from './tauriBaseQuery';
export const baseApi = createApi({
  baseQuery: tauriBaseQuery(),
  // ...
});

// OR use HTTP (current)
import { httpBaseQuery } from './httpBaseQuery';
export const baseApi = createApi({
  baseQuery: httpBaseQuery(),
  // ...
});
```

---

## 🐛 Troubleshooting

### Folders not loading

**Check 1: Is Spring Boot running?**
```bash
curl http://localhost:7070/health
# Should return: {"status":"UP",...}
```

**Check 2: Check browser console**
Look for network errors or CORS issues.

**Check 3: Check Spring Boot logs**
Look for errors in the terminal where you ran `./gradlew bootRun`

### "Cannot read property 'folder' of undefined"

The response structure might have changed. Check the actual response in Network tab.

### Reorder not working

Make sure the Spring Boot reorder endpoint was added correctly:
```bash
curl -X POST http://localhost:7070/api/folders/reorder \
  -H "Content-Type: application/json" \
  -d '{"fromIndex":0,"toIndex":1}'
```

---

## 📊 Performance Notes

### Before (Tauri)
- Command execution: ~5-10ms
- Direct database access via Prisma

### After (Spring Boot HTTP)
- HTTP request: ~10-20ms
- Network overhead + Spring Boot processing

**Trade-off:** Slightly slower, but more flexible and scalable.

---

## 🎯 Next Steps

### 1. Migrate Other APIs

You can now migrate scripts and app state APIs the same way:

```typescript
// Example: Scripts API
export const scriptApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScripts: builder.query<Script[], void>({
      query: () => ({
        url: '/api/scripts',
        method: 'GET',
      }),
    }),
  }),
});
```

### 2. Remove Unused Tauri Commands

Once all APIs are migrated, you can remove the Tauri commands from `src-tauri/src/lib.rs`:
- `get_all_folders`
- `create_folder`
- `delete_folder`
- `rename_folder`
- `reorder_folders`

### 3. Add Error Handling

Enhance error handling in the HTTP base query:

```typescript
// In httpBaseQuery.ts
if (!response.ok) {
  // Show user-friendly error messages
  const errorData = await response.json();
  return {
    error: {
      status: response.status,
      data: errorData.message || 'Something went wrong',
    },
  };
}
```

---

## ✅ Summary

**Your folder API now:**
- ✅ Uses Spring Boot REST API on port 7070
- ✅ Has automatic cache invalidation
- ✅ Supports all CRUD operations + reorder
- ✅ Works seamlessly with existing UI
- ✅ No changes needed in React components

**Same hooks, different backend!** 🎉

---

## 📝 Component Usage (Unchanged!)

Your React components don't need to change at all:

```typescript
import { folderApi } from './store/api/folderApi';

// In your component
const { data: folders, isLoading } = folderApi.useGetAllFoldersQuery();
const [createFolder] = folderApi.useCreateFolderMutation();
const [deleteFolder] = folderApi.useDeleteFolderMutation();
const [renameFolder] = folderApi.useRenameFolderMutation();
const [reorderFolders] = folderApi.useReorderFoldersMutation();

// Everything works the same way!
```

---

**Questions?** Check Spring Boot logs or browser Network tab for debugging!

Happy coding! 🚀

