export default function WordsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-48 bg-surface-plus rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card h-32 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
