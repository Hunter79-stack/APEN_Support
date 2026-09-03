'use client'

import { useState, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import { RouteImage } from '@/components/common/RouteImage'
import { TOOLS_PAGE_LOGOS } from '@/lib/data/logos'
import { COLOR_PICKER_PRESETS } from '@/lib/data/tools'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <button onClick={copy} title={`Copy ${value}`}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200
        ${copied
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-cyan-400/10 hover:text-cyan-400 hover:border-cyan-400/25'}`}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {value}
    </button>
  )
}

function GlowWrapper({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ref.current.style.setProperty('--mouse-x', `${x}px`)
    ref.current.style.setProperty('--mouse-y', `${y}px`)
  }

  const handlePointerLeave = () => {
    if (!ref.current) return
    ref.current.style.setProperty('--mouse-x', `-9999px`)
    ref.current.style.setProperty('--mouse-y', `-9999px`)
  }

  return (
    <div 
      ref={ref} 
      onPointerMove={handlePointerMove} 
      onPointerLeave={handlePointerLeave}
      className={className}
    >
      {children}
    </div>
  )
}

export default function ColorPickerPage() {
  const [color, setColor] = useState('#00d4ff')
  // The text input needs its own state: it holds in-progress values like "#0f"
  // while the user types, and only commits to `color` once a full 7-char hex
  // is present. Binding the input straight to `color` swallowed every
  // keystroke (partial values were reverted on each render), making the
  // field impossible to type into.
  const [hexDraft, setHexDraft] = useState('#00D4FF')

  const commitColor = (value: string) => {
    setColor(value)
    setHexDraft(value.toUpperCase())
  }

  const hex = color.toUpperCase()
  const { r, g, b } = hexToRgb(color)
  const { h, s, l } = rgbToHsl(r, g, b)
  const rgbStr = `rgb(${r}, ${g}, ${b})`
  const hslStr = `hsl(${h}, ${s}%, ${l}%)`
  const r255   = `R: ${r}  G: ${g}  B: ${b}`

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4">
            {/* Color picker logo */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 p-1.5">
              <RouteImage
                route="/applications/color-picker"
                fallbackSrc={TOOLS_PAGE_LOGOS['/applications/color-picker']}
                alt="Color Picker"
                width={56}
                height={56}
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
            <div>
              <a
                href="/applications"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border mb-1 transition-all duration-200
                           bg-cyan-400/10 text-cyan-400/80 border-cyan-400/25
                           hover:bg-cyan-400/20 hover:text-cyan-400 hover:border-cyan-400/60"
              >
                ← Applications
              </a>
              <h1 className="text-3xl font-bold text-white tracking-tight">HEX Color Picker</h1>
              <p className="mt-1 text-slate-400 text-sm">Pick any color and copy HEX, RGB, or HSL values instantly.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main picker */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Swatch + inputs */}
        <GlowWrapper className="card-glow p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-32 h-32 rounded-2xl shadow-card border border-white/10 flex-shrink-0"
            style={{ backgroundColor: color }} />
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 block">Choose Color</label>
              <input type="color" value={color} onChange={(e) => commitColor(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer border-0 bg-transparent" style={{ padding: '2px' }} />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 block">HEX Input</label>
              <input type="text" value={hexDraft}
                onChange={(e) => {
                  let v = e.target.value.trim()
                  if (v && !v.startsWith('#')) v = `#${v}`
                  if (!/^#[0-9A-Fa-f]{0,6}$/.test(v) && v !== '') return
                  setHexDraft(v.toUpperCase())
                  if (v.length === 7) setColor(v)
                }}
                onBlur={() => setHexDraft(hex)}
                maxLength={7}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-white font-mono text-sm
                           focus:outline-none focus:border-cyan-400/50 transition-colors"
                style={{ background: 'rgba(10,15,35,0.8)' }} />
            </div>
          </div>
        </GlowWrapper>

        {/* Copy buttons */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Color Values — Click to Copy</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <CopyButton value={hex} />
            <CopyButton value={rgbStr} />
            <CopyButton value={hslStr} />
            <CopyButton value={r255} />
          </div>
        </div>

        {/* Channel sliders */}
        <GlowWrapper className="card-glow p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Channel Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Red',   value: r, color: 'bg-red-500',     max: 255 },
              { label: 'Green', value: g, color: 'bg-emerald-500', max: 255 },
              { label: 'Blue',  value: b, color: 'bg-blue-500',    max: 255 },
            ].map((ch) => (
              <div key={ch.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-10">{ch.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(6,11,24,0.8)' }}>
                  <div className={`h-full rounded-full transition-all duration-200 ${ch.color}`}
                    style={{ width: `${(ch.value / ch.max) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-400 w-8 text-right">{ch.value}</span>
              </div>
            ))}
          </div>
        </GlowWrapper>

        {/* Presets */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Quick Presets</h2>
          <div className="flex flex-wrap gap-2">
            {COLOR_PICKER_PRESETS.map((p) => (
              <button key={p} onClick={() => commitColor(p)} title={p}
                className={`w-9 h-9 rounded-lg border-2 transition-all duration-150
                  ${color.toLowerCase() === p.toLowerCase()
                    ? 'border-white scale-110 shadow-cyan-glow-sm'
                    : 'border-transparent hover:border-white/40 hover:scale-105'}`}
                style={{ backgroundColor: p }} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
