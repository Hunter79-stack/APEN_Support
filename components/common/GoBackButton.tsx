'use client'

import { ArrowLeft } from 'lucide-react'

export function GoBackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="btn-ghost"
    >
      <ArrowLeft size={15} /> Go Back
    </button>
  )
}
