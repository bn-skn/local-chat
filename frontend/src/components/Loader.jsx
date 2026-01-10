export default function Loader() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
        <div className="flex gap-1">
          <span className="loading-dot w-2 h-2 bg-gray-400 rounded-full" />
          <span className="loading-dot w-2 h-2 bg-gray-400 rounded-full" />
          <span className="loading-dot w-2 h-2 bg-gray-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}
