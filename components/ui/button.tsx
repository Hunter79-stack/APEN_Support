/**
 * Origin: shadcn/ui (button.tsx, legacy forwardRef registry) — https://github.com/shadcn-ui/ui
 * MIT License, Copyright (c) 2023 shadcn. Adapted for the APEN dark theme
 * (colour tokens only). Full notice: public/THIRD-PARTY-NOTICES.txt and /attribution.
 */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/data/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/20',
        destructive: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
        outline:     'border border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white',
        secondary:   'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10',
        ghost:       'text-slate-400 hover:bg-white/5 hover:text-white',
        link:        'text-cyan-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 rounded-md px-3 text-xs',
        lg:      'h-11 rounded-md px-8',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { Button, buttonVariants }
