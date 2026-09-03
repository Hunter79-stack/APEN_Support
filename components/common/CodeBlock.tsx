'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  className?: string
}

export function CodeBlock({ code, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }, [code])

  return (
    <div
      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-lg
                  bg-[#0d1428] border cursor-pointer select-all transition-all duration-200
                  ${copied
                    ? 'border-emerald-500/40 bg-emerald-900/20'
                    : 'border-cyan-400/15 hover:border-cyan-400/35 hover:bg-[#111c33]'
                  } ${className}`}
      onClick={handleCopy}
      title="Click to copy"
    >
      <code className={`font-mono text-sm break-all leading-relaxed
                        ${copied ? 'text-emerald-300' : 'text-cyan-300'}`}>
        {code}
      </code>
      <span className={`flex-shrink-0 transition-all duration-200
                        ${copied ? 'text-emerald-400' : 'text-slate-600 group-hover:text-cyan-400'}`}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </span>
    </div>
  )
}

/* Single-line inline code for embedding within text */
export function InlineCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* Clipboard API may be unavailable in non-secure contexts — fail silently */
    }
  }

  return (
    <code
      onClick={handleCopy}
      title="Click to copy"
      className={`code-inline ${copied ? 'copied' : ''}`}
    >
      {code}
    </code>
  )
}
