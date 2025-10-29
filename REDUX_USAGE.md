# Redux Toolkit Usage Guide

This project has been set up with Redux Toolkit. Here's how to use it:

## File Structure

```
src/
├── store/
│   ├── store.ts          # Redux store configuration
│   ├── hooks.ts          # Typed hooks for useDispatch and useSelector
│   └── slices/           # Redux slices
│       └── exampleSlice.ts  # Example slice (you can remove this)
├── main.tsx              # App entry point with Provider
└── App.tsx               # Your main component
```

## Creating a New Slice

Create a new file in `src/store/slices/`:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface YourState {
  // Define your state shape
  count: number;
}

const initialState: YourState = {
  count: 0,
};

export const yourSlice = createSlice({
  name: 'yourFeature',
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
    setValue: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
});

export const { increment, setValue } = yourSlice.actions;
export default yourSlice.reducer;
```

## Register the Slice in the Store

Add your reducer to `src/store/store.ts`:

```typescript
import yourReducer from './slices/yourSlice';

export const store = configureStore({
  reducer: {
    yourFeature: yourReducer,
    // other reducers...
  },
});
```

## Using Redux in Components

### Reading State

```typescript
import { useAppSelector } from './store/hooks';

function MyComponent() {
  const count = useAppSelector((state) => state.yourFeature.count);
  
  return <div>Count: {count}</div>;
}
```

### Dispatching Actions

```typescript
import { useAppDispatch } from './store/hooks';
import { increment, setValue } from './store/slices/yourSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  
  return (
    <div>
      <button onClick={() => dispatch(increment())}>
        Increment
      </button>
      <button onClick={() => dispatch(setValue(10))}>
        Set to 10
      </button>
    </div>
  );
}
```

### Using Both Together

```typescript
import { useAppDispatch, useAppSelector } from './store/hooks';
import { increment } from './store/slices/yourSlice';

function Counter() {
  const count = useAppSelector((state) => state.yourFeature.count);
  const dispatch = useAppDispatch();
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(increment())}>
        Increment
      </button>
    </div>
  );
}
```

## Async Operations with createAsyncThunk

For async operations (API calls, etc.):

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUserData = createAsyncThunk(
  'user/fetchUserData',
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
```

## Best Practices

1. **Always use typed hooks**: Use `useAppDispatch` and `useAppSelector` from `src/store/hooks.ts` instead of the plain Redux hooks
2. **Keep slices focused**: Each slice should handle a specific feature or domain
3. **Use TypeScript**: Define proper interfaces for your state and action payloads
4. **Avoid direct state mutation**: Redux Toolkit uses Immer, so you can write "mutating" logic in reducers
5. **Organize by feature**: Group related slices together

## Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Redux Toolkit TypeScript Guide](https://redux-toolkit.js.org/tutorials/typescript)

