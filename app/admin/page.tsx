import type { Metadata } from 'next'
import AdminDashboard from './AdminDashboard'

export const metadata: Metadata = {
  title: 'Admin | APEN CESC',
  description: 'CESC Administrator Dashboard — system health, deployments, compliance.',
}

export default function AdminPage() {
  return (
    <div className="page-enter">
      <AdminDashboard />
    </div>
  )
}
