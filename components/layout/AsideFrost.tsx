'use client'

import { ReactNode, useMemo } from 'react'
import { getGpuTier } from '@/lib/data/gpuTier'

interface AsideFrostProps {
  children: ReactNode
  wide?: boolean    // w-72 instead of w-64
}

/**
 * AsideFrost — frosted-glass sidebar panel, GPU-tier aware.
 *
 * backdrop-filter blur is tuned to GPU capability so compositing
 * the WebGL aurora layer underneath never pegs the CPU:
 *
 *  'high'  18 px blur  — dedicated GPU handles compositor work easily
 *  'mid'   8 px blur   — lighter compositing load for integrated GPUs
 *  'none'  no blur     — software-rendered path uses opaque background;
 *                        no pixel-readback compositing at all
 */
export function AsideFrost({ children, wide = false }: AsideFrostProps) {
  const style = useMemo((): React.CSSProperties => {
    const tier = getGpuTier()

    if (tier === 'none') {
      // No backdrop-filter — avoids software compositing entirely.
      return {
        background: 'rgba(5, 9, 20, 0.92)',
      }
    }

    const blurPx = tier === 'high' ? 18 : 8
    return {
      background: 'rgba(5, 9, 20, 0.65)',
      backdropFilter: `blur(${blurPx}px)`,
      WebkitBackdropFilter: `blur(${blurPx}px)`,
    }
  }, [])

  return (
    <aside
      className={`w-full ${wide ? 'lg:w-72' : 'lg:w-64'} flex-shrink-0 border-b border-white/5
                  lg:sticky lg:top-16 lg:self-start lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r
                  overflow-y-auto py-6 px-3`}
      style={style}
    >
      {children}
    </aside>
  )
}
