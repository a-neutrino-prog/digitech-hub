// Skeleton Loading Components

export function SkeletonLine({ width = '100%', height = 12 }: { width?: string; height?: number }) {
  return <div className="skeleton" style={{ width, height, marginBottom: 8 }} />;
}

export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return <div className="skeleton" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle size={48} />
        <div className="flex-1">
          <SkeletonLine width="75%" height={14} />
          <SkeletonLine width="50%" height={10} />
        </div>
      </div>
      <SkeletonLine width="100%" height={12} />
      <SkeletonLine width="85%" height={12} />
      <SkeletonLine width="60%" height={12} />
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-4 flex items-center gap-4">
      <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1">
        <SkeletonLine width="60%" height={14} />
        <SkeletonLine width="40%" height={10} />
      </div>
      <div className="skeleton w-16 h-5 rounded" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
      <div className="flex justify-between mb-4">
        <div className="skeleton w-12 h-12 rounded-xl" />
        <div className="skeleton w-16 h-6 rounded-full" />
      </div>
      <SkeletonLine width="40%" height={10} />
      <SkeletonLine width="60%" height={24} />
      <SkeletonLine width="50%" height={10} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <SkeletonCard />
      <div className="space-y-2">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    </div>
  );
}
