'use client'

interface SnappingGuidesProps {
  guides: Array<{ orientation: 'horizontal' | 'vertical'; position: number }>
  color?: string
}

export function SnappingGuides({ guides, color = '#f59e0b' }: SnappingGuidesProps) {
  if (guides.length === 0) return null

  return (
    <>
      {guides.map((guide, idx) => (
        <div
          key={idx}
          className="absolute pointer-events-none z-40"
          style={{
            ...(guide.orientation === 'horizontal'
              ? {
                  left: 0,
                  right: 0,
                  top: `${guide.position}%`,
                  height: 0,
                  borderTop: `1px dashed ${color}`
                }
              : {
                  top: 0,
                  bottom: 0,
                  left: `${guide.position}%`,
                  width: 0,
                  borderLeft: `1px dashed ${color}`
                })
          }}
        />
      ))}
    </>
  )
}
