// Skeleton Loading Components — consistent with app design

export function SkeletonLine({ width = '100%', height = 12 }: { width?: string; height?: number }) {
  return <div className="skeleton" style={{ width, height, marginBottom: 8 }} />;
}

export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return <div className="skeleton" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />;
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

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-12 h-12 rounded-xl" />
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

export function SkeletonDashboard() {
  return (
    <div className="space-y-4 p-4 page-enter">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <SkeletonLine width="100px" height={10} />
          <SkeletonLine width="160px" height={20} />
        </div>
        <div className="flex gap-2">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton w-10 h-10 rounded-xl" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
        <SkeletonLine width="80px" height={10} />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="skeleton w-11 h-11 rounded-xl" />
              <SkeletonLine width="40px" height={8} />
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    </div>
  );
}

export function SkeletonJobList() {
  return (
    <div className="p-4 space-y-3 page-enter">
      <SkeletonLine width="200px" height={20} />
      <div className="skeleton w-full h-10 rounded-2xl" />
      <div className="flex gap-2 mt-2">
        {[1,2,3,4].map(i => <div key={i} className="skeleton w-16 h-7 rounded-full" />)}
      </div>
      <div className="space-y-2 mt-3">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    </div>
  );
}
