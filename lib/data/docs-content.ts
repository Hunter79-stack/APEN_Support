/**
 * Documentation content for the /docs/* tree — release notes compiled from
 * the official vendor release-notes pages (learn.microsoft.com for SSMS &
 * Visual Studio) plus the internal VMware release-notes PDFs. Rendered by
 * components/cards/ReleaseNotes.tsx.
 */

export interface ReleaseNote {
  version: string
  date?: string
  /** Optional link to the full vendor/internal release notes (PDF or URL). */
  href?: string
  bullets: string[]
}

export interface ReleaseNoteGroup {
  id: string
  title: string
  summary?: string
  releases: ReleaseNote[]
}

/* ─── SQL Server Management Studio (SSMS) ─── source: learn.microsoft.com/ssms ─ */
export const ssmsReleaseNotes: ReleaseNoteGroup[] = [
  {
    id: 'ssms-22',
    title: 'SSMS 22.x',
    summary: 'Current GA line — Visual Studio 18.x based, installed via the Visual Studio Installer. Latest build 22.6.0 (2026-05-12).',
    releases: [
      {
        version: '22.x (GA)', date: '2026-05-12 (22.6.0)',
        bullets: [
          'GitHub Copilot in SSMS reached general availability — model selection, bring-your-own-model, custom/database instructions, code completions, and right-click Document/Explain/Fix/Optimize.',
          'Windows Arm64 support added for connect/query (22.0.0), extended to Profiler and Database Tuning Advisor (22.3.0).',
          'Database DevOps workload (Preview): SQL database projects, source control, 74+ item templates, and "Create Project from Database".',
          'Vector/AI and SQL Server 2025 support: vector & JSON indexes, vector data type across designers, IntelliSense for VECTOR_SEARCH, AI_GENERATE_EMBEDDINGS, REGEXP_*.',
          'Modern connection dialog is now the default (Fabric browsing, Reset, auto-select most recent connection, faster startup).',
          'Results grid: JSON viewer, zoom, column data-type tooltips, and Excel/JSON/Markdown/XML export.',
          'Full SSIS capabilities reinstated (SSISDB catalog, package execution, Import/Export Wizard) out of preview.',
          'Library updates through 22.6.0: Visual Studio 18.6.0, MSODBCSQL 18.6.2.1, Microsoft.Data.SqlClient 6.1.3, SMO 17.100.91, DacFx 170.0.97.',
        ],
      },
    ],
  },
  {
    id: 'ssms-21',
    title: 'SSMS 21.x',
    summary: 'First 64-bit, Visual-Studio-2022-based SSMS, installed via the Visual Studio Installer. Latest build 21.6.17 (2025-10-14); GA 21.0.0 (2025-05-19).',
    releases: [
      {
        version: '21.x', date: '2025-10-14 (21.6.17)',
        bullets: [
          '64-bit application built on Visual Studio 2022 — reduces out-of-memory errors; installed through the Visual Studio Installer.',
          'Modernized high-DPI UI with a new dark theme across Object Explorer, Query Editor, Results, Query Store, and Query Plans.',
          'New Modern connection dialog (Preview) with dark mode, Browse tab (local/network/Azure, Registered Servers, Fabric), and connection-string copy/paste.',
          'Copilot in SSMS (Preview) via the AI Assistance workload in the Visual Studio Installer.',
          'Reinstated: Git integration, Presenter mode, project/solution support, Quick Find (Ctrl+F), integrated Terminal, Maintenance Plans, and SSIS (Preview).',
          'Always Encrypted: online encryption (incremental encrypt/decrypt/re-encrypt) and key generation into Azure Key Vault Managed HSM.',
          'Vector data-type support in IntelliSense/designers; IntelliSense for JSON_CONTAINS and REGEXP_ functions.',
          'Command line: added -A (authentication method); -G (Entra) and -E (Windows) deprecated. Note: SSMS 21 is not supported on Arm64.',
        ],
      },
    ],
  },
  {
    id: 'ssms-20',
    title: 'SSMS 20.x',
    summary: 'Final standalone-installer, 32-bit SSMS line (superseded by the VS-2022-based SSMS 21). Latest build 20.2.1 (2025-04-08).',
    releases: [
      {
        version: '20.2.1', date: '2025-04-08',
        bullets: [
          'Security servicing release addressing CVE-2025-29803 in Visual Studio Tools for Applications 2019 (existing installs are not auto-updated — manually install the latest VSTA 2019).',
        ],
      },
      {
        version: '20.2', date: '2024-07-09',
        bullets: [
          'Always Encrypted support for temporal tables, plus added wizard logging for troubleshooting.',
          'Updated MSOLEDBSQL 18.7.4, DacFx 162.3.566, SMO 171.36.0; removed Microsoft Visual C++ 2013 Redistributable (x86) from the installer.',
          'Removed HADOOP files from SSIS install files (CVE-2022-25168); simplified link-failover for the Azure SQL Managed Instance link feature.',
          'Numerous accessibility fixes (Database Properties, Restore Database, Data Classification) and Query Store report fixes.',
        ],
      },
      {
        version: '20.0', date: '2024-03-19',
        bullets: [
          'Moved Encryption and Trust Server Certificate onto the main Connection dialog; added "Host Name in Certificate" property.',
          'Added Microsoft.Data.SqlClient 5.1.4 with Strict encryption and TLS 1.3 support; Microsoft Entra ID auth in the New Login wizard.',
          'Addressed OpenSSL CVE-2023-2975.',
        ],
      },
    ],
  },
]

/* ─── Visual Studio 2022 ─── source: learn.microsoft.com/visualstudio/releases/2022 ─
 * Enterprise, Professional, and Community share the same 17.x release notes. */
export const visualStudioReleaseNotes: ReleaseNoteGroup[] = [
  {
    id: 'vs-17',
    title: 'Visual Studio 2022 (17.x)',
    summary: 'Enterprise, Professional, and Community editions share the same 17.x release notes. Newest first.',
    releases: [
      {
        version: '17.14', date: '2025-05-13',
        bullets: [
          'GitHub Copilot Agent Mode reached general availability — handles entire tasks end-to-end.',
          'MCP (Model Context Protocol) support GA with OAuth authentication, one-click install, and governance policies.',
          'Expanded model choice in Copilot Chat (GPT-4.1 default, Gemini 2.5 Pro, Claude Sonnet 4, Claude Opus 4) plus bring-your-own-model.',
          'Profiler Copilot Agent for performance tuning; LINQ-expression debugging datatips with Copilot analysis.',
          'Live Preview at design time for real-time XAML changes; Copilot-powered .NET upgrade/modernization agent.',
          'Git in Copilot Chat (#changes, #commit:), better AI code reviews; faster incremental VSIX builds.',
        ],
      },
      {
        version: '17.13', date: '2025-02-11',
        bullets: [
          'AI-enhanced Feature Search, customizable file encoding, reimagined horizontal scrollbar, word-wrap indenting.',
          'GitHub Copilot Edits across files, vision support in Copilot Chat, code referencing, and GitHub Copilot Free.',
          'Smarter exception/variable analysis, Copilot Chat in Parallel Stacks, thread summaries, complex LINQ query crafting.',
          'New UWP .NET 9 project templates, improved MSIX/MSBuild tooling, Windows SDK 26100.',
          'SDK-style SQL projects in SSDT (preview): schema/data compare, project references, SQL debugging.',
          'C++: C++23 preview setting, CMake Presets v9, better AI completions.',
        ],
      },
      {
        version: '17.12', date: '2024-11-12',
        bullets: [
          'Productivity: copy Error List descriptions, "go to line" in Code Search, dockable Code Search, non-blocking Code Cleanup on save.',
          'GitHub Copilot: custom instructions, model selection, debug tests and fix code, better C# completions, guided onboarding.',
          '.NET 9 support; NuGet audit improvements and transitive-dependency vulnerability indicators in Solution Explorer.',
          'Debugging: Blazor WebAssembly debugging, method return values, profiler meter histogram, exportable breakpoint groups.',
          'Git: PR drafts/templates, internal GitHub repos, multi-repo support, customizable AI commit messages.',
        ],
      },
      {
        version: '17.11', date: '2024-08-13',
        bullets: [
          'Improved Code Search, CodeLens timeline fix, PR creation updates, more meaningful code reviews.',
          'Familiar shortcuts: Ctrl+/ to toggle line comments, Ctrl+Shift+P for Feature Search (Command Palette).',
          'GitHub Copilot: inline method/class context, symbol understanding, AI breakpoint expressions, AI variable inspection, AI-assisted naming.',
          'Debugging: easier async-exception fixing, external-code profiling, improved Arm64 debugging, faster C++ breakpoints.',
          'IDE: detect/prompt to install missing extensions, new Teams Toolkit templates; Unreal Engine templates & toolbar.',
        ],
      },
    ],
  },
]
