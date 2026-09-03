'use client'

import { VMwareProductTiles } from '../VMwareProductTiles'
import { vmware7Products } from '@/lib/data/vmware'

/** Cards bucket by their first tag, which is already the product family. */
const FAMILIES = ['vCenter', 'ESXi'] as const

export function VMware7Cards() {
  return (
    <VMwareProductTiles
      scope="vmware/v7/products"
      cards={vmware7Products}
      categoryOrder={FAMILIES}
    />
  )
}
