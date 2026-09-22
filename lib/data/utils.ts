/**
 * Origin: shadcn/ui `cn()` helper (lib/utils.ts) — https://github.com/shadcn-ui/ui
 * MIT License, Copyright (c) 2023 shadcn. See public/THIRD-PARTY-NOTICES.txt.
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
