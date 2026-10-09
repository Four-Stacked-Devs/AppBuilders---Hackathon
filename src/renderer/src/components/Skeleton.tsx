// Shimmering placeholders that match the shapes they stand in for, so a screen does not jump when
// its data arrives. The shimmer stops under reduced motion (the global rule).
export function Skeleton(props: {
  w?: string | number
  h?: string | number
  r?: string
  className?: string
}): React.JSX.Element {
  const { w = '100%', h = '1.2rem', r, className = '' } = props
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width: w, height: h, ...(r ? { borderRadius: r } : {}) }}
      aria-hidden="true"
    />
  )
}

export const SkeletonRows = ({ n = 3 }: { n?: number }): React.JSX.Element => (
  <div className="skeleton-rows" role="status" aria-label="Loading">
    {Array.from({ length: n }, (_, i) => (
      <div className="skeleton-row" key={i}>
        <Skeleton w="4.4rem" />
        <div className="skeleton-col">
          <Skeleton w="70%" />
          <Skeleton w="40%" h="1rem" />
        </div>
        <Skeleton w="6rem" h="3rem" r="var(--r-sm)" />
      </div>
    ))}
  </div>
)

export const SkeletonStats = ({ n = 5 }: { n?: number }): React.JSX.Element => (
  <div className="stats" role="status" aria-label="Loading">
    {Array.from({ length: n }, (_, i) => (
      <div className="panel stat" key={i}>
        <Skeleton w="2.2rem" h="2.2rem" r="50%" />
        <Skeleton w="50%" h="2.2rem" />
        <Skeleton w="75%" h="1rem" />
      </div>
    ))}
  </div>
)

export const SkeletonChart = ({ h = '12rem' }: { h?: string }): React.JSX.Element => (
  <div className="panel" role="status" aria-label="Loading">
    <Skeleton w="30%" h="1.4rem" />
    <div className="skeleton-bars" style={{ height: h }}>
      {[40, 65, 30, 80, 55, 70, 45, 60, 35, 75].map((p, i) => (
        <Skeleton key={i} w="100%" h={`${p}%`} r="0.4rem" />
      ))}
    </div>
  </div>
)

export const SkeletonCard = ({ lines = 3 }: { lines?: number }): React.JSX.Element => (
  <div className="panel" role="status" aria-label="Loading">
    <Skeleton w="35%" h="1.4rem" />
    <div className="skeleton-col" style={{ marginTop: '1.2rem' }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} w={`${90 - i * 15}%`} />
      ))}
    </div>
  </div>
)
