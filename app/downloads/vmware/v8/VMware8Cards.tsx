'use client'

import { VMwareProductTiles } from '../VMwareProductTiles'
import { vmware8Products } from '@/lib/data/vmware'

/** Cards bucket by their first tag, which is already the product family. */
const FAMILIES = ['vCenter', 'ESXi'] as const

export function VMware8Cards() {
  return (
    <VMwareProductTiles
      scope="vmware/v8/products"
      cards={vmware8Products}
      categoryOrder={FAMILIES}
    />
  )
}
