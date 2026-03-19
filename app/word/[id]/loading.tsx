export default function WordDetailLoading() {
  return (
    <div className="flex flex-col gap-8 py-4 animate-pulse">
      <div className="h-4 w-32 bg-surface-plus rounded" />
      <div className="card p-8 flex flex-col md:flex-row gap-8">
        <div className="flex flex-col gap-3 items-center">
          <div className="h-24 w-24 bg-surface-plus rounded-xl" />
          <div className="h-4 w-16 bg-surface-plus rounded" />
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="h-4 w-24 bg-surface-plus rounded" />
          <div className="h-7 w-40 bg-surface-plus rounded" />
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-7 w-20 bg-surface-plus rounded-full" />)}
          </div>
        </div>
      </div>
      <div className="card h-32 animate-pulse" />
      <div className="card h-24 animate-pulse" />
    </div>
  );
}
