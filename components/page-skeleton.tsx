export function PageSkeleton() {
  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-4 w-44 bg-kvsr-navy/[0.06] rounded mb-4" />
        <div className="h-9 w-56 bg-kvsr-navy/10 rounded-lg mb-2" />
        <div className="h-5 w-72 bg-kvsr-navy/[0.06] rounded-lg mb-8" />
        <div className="h-24 rounded-2xl bg-white border border-kvsr-soft mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-white border border-kvsr-soft" />
          <div className="h-72 rounded-2xl bg-white border border-kvsr-soft" />
        </div>
      </div>
    </div>
  );
}
