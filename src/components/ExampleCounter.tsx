import { useAppDispatch, useAppSelector } from '../store/hooks';
import { increment, decrement, incrementByAmount, setText } from '../store/slices/folderSlice/';

export function ExampleCounter() {
  const count = useAppSelector((state) => state.example.value);
  const text = useAppSelector((state) => state.example.text);
  const dispatch = useAppDispatch();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Redux Toolkit Example</h2>

      <div className="space-y-2">
        <p className="text-lg">Count: {count}</p>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch(increment())}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Increment
          </button>
          <button
            onClick={() => dispatch(decrement())}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Decrement
          </button>
          <button
            onClick={() => dispatch(incrementByAmount(5))}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            +5
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-lg">Text: {text}</p>
        <input
          type="text"
          value={text}
          onChange={(e) => dispatch(setText(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded"
          placeholder="Type something..."
        />
      </div>

      <p className="text-sm text-gray-600 mt-4">
        This is an example component. You can remove it and the exampleSlice from your store.
      </p>
    </div>
  );
}

