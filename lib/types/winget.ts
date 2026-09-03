/**
 * Types for the online WinGet repo's flat client catalog, served to internal
 * workstations through the APEN reverse proxy at /winget/api/catalog.
 */
export interface WingetInstaller {
  Architecture?: string
  InstallerType?: string
  InstallerUrl?: string
  InstallerSha256?: string
}

export interface WingetCatalogPackage {
  PackageIdentifier: string
  PackageName?: string
  Publisher?: string
  PackageVersion?: string
  ShortDescription?: string
  License?: string
  Installers?: WingetInstaller[]
}

export interface WingetCatalog {
  SourceIdentifier?: string
  Data?: WingetCatalogPackage[]
  /* Optional "when was this catalog last regenerated/synced" stamp. The online
     WinGet repo does not emit one today; these are the field names we accept if
     ops adds one upstream, so the store page shows a real freshness date the
     moment it appears (no further code change). We also fall back to the HTTP
     Last-Modified response header — see fetchWingetCatalog. */
  GeneratedAt?: string
  UpdatedAt?: string
  LastUpdated?: string
  LastModified?: string
  SourceLastUpdated?: string
}
