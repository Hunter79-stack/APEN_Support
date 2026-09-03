/**
 * SQL Tools data — SSMS release cards for /sqltools.
 *
 * Each entry shows up as a release card with installer + release-notes
 * download links. Editable through the AdminContentEditor at scope
 * "sqltools/ssms".
 */

import { URLS } from '@/lib/data/constants'
import { LOGOS } from '@/lib/data/logos'
import type { BaseCard } from '@/lib/types/cards'

const VS_BASE = URLS.visualStudio

export interface SSMSReleaseCard extends BaseCard {
  /** Marketing version, also used as the card id (e.g. "21.0"). */
  version: string
  /** Release date in ISO format. */
  date: string
  installerHref: string
  notesHref?: string
  logo: string
}

// SSMS 21 ships as an offline Visual Studio Installer layout (run the
// vs_SSMS.exe bootstrapper against the staged layout) — this is what's actually
// hosted at /VisualStudio/vs_ssms/ (productDisplayVersion 21.4.8). The legacy
// standalone SSMS-Setup-ENU-*.exe builds are not staged here.
export const ssmsReleaseCards: SSMSReleaseCard[] = [
  {
    id: 'ssms-21',
    version: '21.4.8',
    date: '2026-04-01',
    title: 'SSMS 21.4.8',
    description: 'SQL Server Management Studio 21 — offline Visual Studio Installer layout. Run the vs_SSMS.exe bootstrapper to install or update from the staged layout.',
    glowColor: 'cyan',
    tags: ['SSMS', '21', 'Latest', 'Offline Layout'],
    installerHref: `${VS_BASE}/vs_ssms/vs_SSMS.exe`,
    logo: LOGOS.mssql,
  },
]
