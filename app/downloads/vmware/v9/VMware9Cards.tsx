'use client'

import { VMwareProductTiles } from '../VMwareProductTiles'
import { vmware9Products } from '@/lib/data/vmware'

/** Cards bucket by their first tag, which is already the product family. */
const FAMILIES = ['vCenter', 'ESXi'] as const

export function VMware9Cards() {
  return (
    <VMwareProductTiles
      scope="vmware/v9/products"
      cards={vmware9Products}
      categoryOrder={FAMILIES}
    />
  )
}
