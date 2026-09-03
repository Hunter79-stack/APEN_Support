import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Construction, ExternalLink, BookOpen } from 'lucide-react'
import { BackNavPill } from '@/components/layout/BackNavPill'
import { EXTERNAL_URLS, EXTERNAL_URL_LABELS } from '@/lib/data/constants'

// Route gated until the new ticketing system endpoints are wired up.
// The previous mock-data-backed status list is preserved at the bottom of
// this file in a comment block for easy restoration.
export default function TicketStatusPage() {
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
          <CardTitle className="text-2xl">Track Your Requests in TrackIt</CardTitle>
          <CardDescription className="text-cyan-200/60">
            Integrated request lookup on this page is coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-sm leading-relaxed text-slate-300">
            Until the new ticketing system endpoints are ready, check the status of your
            existing help-desk tickets directly in the TrackIt self-service portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href={EXTERNAL_URLS.trackItSelfService}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                         bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-sm font-medium
                         hover:bg-cyan-500/25 hover:text-cyan-200 transition-colors"
            >
              <ExternalLink size={16} aria-hidden="true" />
              Open {EXTERNAL_URL_LABELS.trackItSelfService}
            </a>
            <Link
              href="/support/knowledge-base/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                         border border-white/10 text-slate-300 text-sm font-medium
                         hover:border-white/25 hover:text-white transition-colors"
            >
              <BookOpen size={16} aria-hidden="true" />
              Browse the Knowledge Base
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-slate-400 pt-2">
            Requester-scoped status tracking will return to this page once the new
            help-desk endpoints are wired up.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   Preserved: original mock-data-backed requester ticket list.
   Restore when the new ticketing system endpoints are wired up.

import { Clock, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react'
import { SUPPORT_STATUS_CONFIG, SUPPORT_STATUS_MOCK_TICKETS } from '@/lib/data/support'

interface Ticket {
  id: string
  subject: string
  status: string
  date: string
}

// 1. Map backend API statuses to UI styling
function getStatusDesign(status: string) {
  switch (status.toLowerCase()) {
    case 'open':
    case 'new':
      return { icon: AlertCircle, color: 'text-cyan-400' }
    case 'pending reminder':
    case 'pending':
      return { icon: Clock, color: 'text-amber-400' }
    case 'closed':
    case 'resolved':
      return { icon: CheckCircle2, color: 'text-emerald-400' }
    default:
      return { icon: HelpCircle, color: 'text-slate-400' }
  }
}

// 2. Fetcher function that calls Help Desk API
async function getUserTickets(userEmail: string) {
  try {
    const domain = SUPPORT_STATUS_CONFIG.placeholderDomain
    if (domain === SUPPORT_STATUS_CONFIG.placeholderDomain) {
      // Return mock data to prevent network errors for the placeholder domain
      return SUPPORT_STATUS_MOCK_TICKETS.map((ticket) => ({
        ...ticket,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      }))
    }

    // Example: Fetching from Zammad via REST API
    // The query filters for tickets where the customer matches the logged-in user
    const res = await fetch(`https://${domain}/api/v1/tickets/search?query=customer.email:${userEmail}`, {
      headers: {
        'Authorization': `Bearer ${process.env.HELPDESK_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: SUPPORT_STATUS_CONFIG.ticketSearchRevalidateSeconds }
    })

    if (!res.ok) throw new Error('Failed to fetch tickets')

    const data = await res.json()

    return data.tickets.map((ticket: any) => ({
      id: `TKT-${ticket.number}`,
      subject: ticket.title,
      status: ticket.state,
      date: new Date(ticket.updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      })
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}

export default async function TicketStatusPage() {
  const userEmail = SUPPORT_STATUS_CONFIG.placeholderEmail
  const isStaticPreview = SUPPORT_STATUS_CONFIG.placeholderDomain === 'your-helpdesk.domain.com'
  const tickets = await getUserTickets(userEmail)

  return (
    <div className="container max-w-4xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <GoBackButton />
      </div>

      <h1 className="text-2xl font-bold text-white mb-3">Track My Tickets</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-400">
        This page is for requester-scoped ticket status. Production ticket lookups must filter by
        customer.email for the signed-in requester, so visitors see their own requests and not a global ticket queue.
      </p>

      <Card className="mb-6 border-cyan-400/15 bg-cyan-400/[0.04]">
        <CardContent className="flex gap-4 p-5">
          <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Requester scope</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              {isStaticPreview
                ? 'Static preview is showing sample requester tickets only. It is not connected to the help-desk backend and is not a global queue.'
                : 'Connected mode should return only tickets owned by the authenticated requester identity.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {tickets.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-8 text-center text-slate-400">
            You do not have any open or recent support requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket: Ticket) => {
            const { icon: StatusIcon, color } = getStatusDesign(ticket.status)

            return (
              <Card key={ticket.id} className="hover:border-white/20 transition-colors">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-slate-500">{ticket.id}</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
                        <StatusIcon size={14} /> {ticket.status}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-white">{ticket.subject}</h3>
                  </div>
                  <div className="text-sm text-slate-400">
                    Updated: {ticket.date}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
─────────────────────────────────────────────────────────────────────────── */
