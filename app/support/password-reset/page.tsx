import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { BookOpen, ShieldAlert } from 'lucide-react'
import { GoBackButton } from '@/components/common/GoBackButton'

export default function PasswordResetPage() {
  return (
    <div className="container max-w-2xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <GoBackButton />
      </div>

      <Card className="border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-amber-500/10 p-4 rounded-full w-fit mb-4 text-amber-400 border border-amber-500/20">
            <ShieldAlert size={32} />
          </div>
          <CardTitle className="text-2xl">Account Access Support</CardTitle>
          <CardDescription className="text-amber-200/50">
            Closed-enclave account recovery is handled by APEN support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 text-center">
          <p className="text-sm text-slate-300 leading-relaxed">
            Self-service password recovery and public identity redirects are not available in this environment.
            Open a support request for AD unlocks, password issues, group access, CAC problems, or other sign-in blockers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {/* Hidden until the new ticketing system endpoints are wired up.
            <Button asChild className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 h-12 px-6 transition-all">
              <Link href="/support/ticket">
                <Ticket size={18} className="mr-2" /> Open Access Ticket
              </Link>
            </Button>
            */}
            <Button asChild className="bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10 h-12 px-6 transition-all">
              <Link href="/support/knowledge-base/access">
                <BookOpen size={18} className="mr-2" /> Access Guidance
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
