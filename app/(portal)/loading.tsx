export default function PortalLoading() {
  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-9 w-48 bg-kvsr-navy/10 rounded-lg mb-2" />
        <div className="h-5 w-72 bg-kvsr-navy/[0.07] rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white border border-kvsr-soft" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white border border-kvsr-soft" />
      </div>
    </div>
  );
}
