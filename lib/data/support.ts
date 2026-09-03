export const SUPPORT_SERVICE_CARDS = [
  {
    id: 'ticket',
    title: 'Open a Support Ticket',
    description: 'Report outages, blockers, account access issues, hardware problems, software needs, or service requests.',
    icon: 'ticket',
    href: '/support/ticket',
    glowColor: 'cyan',
  },
  {
    id: 'status',
    title: 'Track My Tickets',
    description: 'Check the status of your open requests and history.',
    icon: 'activity',
    href: '/support/status',
    glowColor: 'indigo',
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge Base',
    description: 'Use APEN guidance for network, hardware, access, and software issues.',
    icon: 'book',
    href: '/support/knowledge-base',
    glowColor: 'green',
  },
] as const

export const KNOWLEDGE_BASE_CATEGORIES = [
  { id: 'access', title: 'Account Access', icon: 'shield', color: 'green', href: '/support/knowledge-base/access' },
  { id: 'network', title: 'Network Connectivity', icon: 'server', color: 'cyan', href: '/support/knowledge-base/network' },
  { id: 'hardware', title: 'Hardware Provisioning', icon: 'hardDrive', color: 'indigo', href: '/support/knowledge-base/hardware' },
  { id: 'software', title: 'Software Installation', icon: 'monitor', color: 'purple', href: '/support/knowledge-base/software' },
] as const

export const KNOWLEDGE_BASE_CATEGORY_DETAILS = {
  access: {
    title: 'Account Access',
    description: 'Closed-enclave account support is handled through APEN support intake, not public self-service recovery.',
    quickChecks: [
      'Confirm the username and target system are correct before retrying.',
      'Check whether the issue follows the user to another workstation.',
      'Capture the exact sign-in error, workstation name, and time of failure.',
    ],
    ticketDetails: [
      'Username, workstation name, target application or system, and contact method.',
      'Whether the account appears locked, password-related, CAC-related, or group-access related.',
      'Approval contact or business justification for new group or application access.',
    ],
    articles: [
      {
        title: 'Locked account or password reset',
        detail: 'Open an access ticket with your username, workstation, affected system, and the exact sign-in error. Do not include passwords.',
      },
      {
        title: 'Group or application access',
        detail: 'Include the application, share, system, requested role, mission need, and approving office when available.',
      },
      {
        title: 'CAC, certificate, or AD sign-in issue',
        detail: 'Capture the workstation name, timestamp, certificate behavior, and whether the issue follows the user or the workstation.',
      },
    ],
  },
  network: {
    title: 'Network Connectivity',
    description: 'Start with local checks, then route persistent network issues through support with enough detail to triage.',
    quickChecks: [
      'Run the APEN Speed Test and note the result before opening a ticket.',
      'Check whether nearby systems on the same jack or switch path are affected.',
      'Confirm whether the issue affects all sites or one named service.',
    ],
    ticketDetails: [
      'Hostname, location, jack or room, IP address if known, and affected service.',
      'Speed test result, error text, outage start time, and whether the issue is intermittent.',
      'Source, destination, protocol, and port for routing or firewall requests.',
    ],
    articles: [
      {
        title: 'No network or intermittent access',
        detail: 'Record the jack, VLAN if known, workstation name, IP configuration, and whether neighboring systems are affected.',
      },
      {
        title: 'Slow application or file access',
        detail: 'Run the local speed test, note the target service, and include time of day plus any packet-loss symptoms.',
      },
      {
        title: 'Firewall or enclave routing request',
        detail: 'Provide source, destination, protocol, port, system owner, and mission justification for the requested path.',
      },
    ],
  },
  hardware: {
    title: 'Hardware Provisioning',
    description: 'Use hardware support for workstation, peripheral, imaging, and replacement requests.',
    quickChecks: [
      'Record the asset tag, serial number, location, and assigned user.',
      'Confirm whether the system powers on and whether the problem follows a cable, dock, or peripheral.',
      'Note recent moves, patches, imaging, or hardware changes before the failure.',
    ],
    ticketDetails: [
      'Asset tag, location, user, device type, and urgency.',
      'Symptoms, diagnostic codes, photos if allowed locally, and whether the device can boot.',
      'Replacement, reimage, loaner, or new-issue requirement with target date.',
    ],
    articles: [
      {
        title: 'New workstation or peripheral',
        detail: 'Open a ticket with user, location, asset need, required software baseline, and target delivery date.',
      },
      {
        title: 'Failed component',
        detail: 'Include asset tag, symptoms, recent changes, diagnostic codes, and whether the system can still boot.',
      },
      {
        title: 'Reimage or baseline refresh',
        detail: 'List the current OS, desired baseline, data-retention needs, and any mission software that must be preserved.',
      },
    ],
  },
  software: {
    title: 'Software Installation',
    description: 'Use local repositories and hosted packages first, then request support for installs that need coordination.',
    quickChecks: [
      'Check the local APEN repository or software page for the requested package first.',
      'Capture the application name, version, OS, and install source.',
      'Record exact error output instead of summarizing the failure.',
    ],
    ticketDetails: [
      'Software name, version, host, OS, requester, and mission need.',
      'Install command or package path, error output, and whether admin support is required.',
      'License source, approving office, and maintenance window for broad updates.',
    ],
    articles: [
      {
        title: 'Approved software install',
        detail: 'Include product name, version, host, business need, license source, and whether admin support is required.',
      },
      {
        title: 'Repository or package issue',
        detail: 'Capture the repository path, package name, error output, OS version, and whether other hosts see the same issue.',
      },
      {
        title: 'Patch or update request',
        detail: 'Provide current version, target version, affected hosts, maintenance window, and rollback expectations.',
      },
    ],
  },
} as const

export type KnowledgeBaseCategoryKey = keyof typeof KNOWLEDGE_BASE_CATEGORY_DETAILS

export const SUPPORT_STATUS_CONFIG = {
  placeholderDomain: 'your-helpdesk.domain.com',
  placeholderEmail: 'jwebber.ou@yourdomain.com',
  ticketSearchRevalidateSeconds: 60,
} as const

export const SUPPORT_STATUS_MOCK_TICKETS = [
  {
    id: 'TKT-1042',
    subject: 'Password Reset for AD Account',
    status: 'Closed',
  },
  {
    id: 'TKT-1055',
    subject: 'Request access to GitLab',
    status: 'Pending',
  },
] as const
