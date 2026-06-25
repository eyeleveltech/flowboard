export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #EBEBEB 25%, #F5F5F5 50%, #EBEBEB 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Skeleton width={36} height={36} borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={11} />
        </div>
        <Skeleton width={70} height={22} borderRadius={999} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={i === rows - 1 ? '60%' : '100%'} height={13} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <Skeleton width={18} height={18} borderRadius={4} />
      <Skeleton width="30%" height={14} />
      <Skeleton width="15%" height={14} />
      <Skeleton width="20%" height={22} borderRadius={999} />
      <Skeleton width="12%" height={14} />
      <Skeleton width="13%" height={14} />
    </div>
  );
}
