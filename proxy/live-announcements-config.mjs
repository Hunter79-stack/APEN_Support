export const LIVE_ANNOUNCEMENT_DEFAULTS = {
  cacheSeconds: 10,
  maxDepth: 8,
  maxFilesScanned: 5000,
  maxItems: 30,
  maxLabels: 3,
}

export const TEMP_FILE_EXTENSIONS = new Set([
  '.crdownload',
  '.download',
  '.part',
  '.partial',
  '.swp',
  '.tmp',
])

export const IGNORED_DIRECTORY_NAMES = new Set([
  '.git',
  '.next',
  'node_modules',
])

export const DEFAULT_LIVE_ANNOUNCEMENT_ROOTS = [
  ['Site Uploads', 'Site Update', '/var/www/html/uploads', '/uploads/'],
  ['Static Export Uploads', 'Site Update', '/var/www/apen_support_nextjs/out/uploads', '/uploads/'],
  ['PDQ Repository', 'Software', '/var/www/html/PDQ/Repository', '/PDQ/Repository/'],
  ['Evaluate-STIG Documents', 'Security', '/var/www/html/evaluate-stig/doc', '/evaluate-stig/doc/'],
  ['PIP Repository', 'Software', '/var/www/html/repos/piprepo', '/repos/piprepo/'],
  ['Logos', 'Site Update', '/var/www/html/logos', '/logos/'],
  ['Cisco Repository', 'Software', '/mnt/storage/cisco', '/cisco/'],
  ['CRAN Repository', 'Software', '/mnt/storage/repos/cran', '/cran/'],
  ['Valhalla Repository', 'Software', '/mnt/storage/valhalla', '/valhalla/'],
  ['SSMS Downloads', 'Software', '/mnt/storage/vs_ssms', '/VisualStudio/SSMS/'],
  ['Visual Studio Enterprise', 'Software', '/mnt/storage/vs2022enterprise', '/VisualStudio/Enterprise/'],
  ['Visual Studio Professional', 'Software', '/mnt/storage/vs2022professional', '/VisualStudio/Professional/'],
  ['Visual Studio Community', 'Software', '/mnt/storage/vs2022community', '/VisualStudio/Community/'],
]
