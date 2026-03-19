export default function CoverageLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="card h-48" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-surface-plus rounded-lg" />
        ))}
      </div>
    </div>
  );
}
