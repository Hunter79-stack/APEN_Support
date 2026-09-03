import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Construction } from 'lucide-react'
import { BackNavPill } from '@/components/layout/BackNavPill'

// Route gated until the new ticketing system endpoints are wired up.
// The previous placeholder submission form is preserved at the bottom of
// this file in a comment block for easy restoration.
export default function SubmitTicketPage() {
  return (
    <div className="container max-w-2xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <BackNavPill href="/support" label="Support" color="cyan" />
      </div>

      <Card className="border-cyan-400/15 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-cyan-500/10 p-4 rounded-full w-fit mb-4 text-cyan-300 border border-cyan-400/20">
            <Construction size={32} aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Support Requests Coming Soon</CardTitle>
          <CardDescription className="text-cyan-200/60">
            Online ticket submission is being configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-sm leading-relaxed text-slate-300">
            APEN is standing up a new ticketing system. Online submission and status tracking
            will return here once the endpoints are ready.
          </p>
          <p className="text-sm leading-relaxed text-slate-400">
            In the meantime, browse the knowledge base for guides covering account access,
            network, hardware, and software requests.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   Preserved: original placeholder submission form.
   Restore (and re-add 'use client' at the top of the file) when the new
   ticketing system endpoints are wired up.

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'

export default function SubmitTicketPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Ticket submission is handled by the OsTicket Self-Service portal.
    // This form is a placeholder — wire to a backend API when available.
    setTimeout(() => setIsSubmitting(false), 1000)
  }

  return (
    <div className="container max-w-3xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <GoBackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Submit a Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Category</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all appearance-none">
                <option>Hardware Issue</option>
                <option>Software Request</option>
                <option>Network Access</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Subject</label>
              <input
                required
                type="text"
                placeholder="Brief summary of the issue"
                className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea
                required
                rows={6}
                placeholder="Please provide as much detail as possible..."
                className="w-full bg-black/40 border border-white/10 rounded-md p-3 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all resize-y"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Paperclip size={16} className="mr-2" /> Attach File
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30">
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'} <Send size={16} className="ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
─────────────────────────────────────────────────────────────────────────── */
