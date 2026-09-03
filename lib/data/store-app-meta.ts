/**
 * Microsoft Store metadata for the packages published by the APEN WinGet repo.
 * Real Store icons (files under public/logos/store/, registered in the LOGOS
 * catalog), publisher names, and the app-pack category buckets used by
 * apps.microsoft.com/apppack. Keyed by PackageIdentifier — the SAME id the live
 * catalog uses, so an admin override saved against a card here still matches
 * when the live list renders. Packages with no public Store listing fall back
 * to the generic Store mark.
 *
 * Regenerate: see the store-app-meta-harvest note (Store search -> PFN
 * manifestSearch -> displaycatalog). Icons must be local + LOGOS-registered or
 * npm run validate:images fails.
 */
import { LOGOS } from '@/lib/data/logos'

export const STORE_CATEGORIES = ["Productivity", "Creativity", "Social", "Entertainment", "Tools & Utilities", "Personalization"] as const
export type StoreCategory = (typeof STORE_CATEGORIES)[number]

export interface StoreAppMeta {
  /** Package display name, used when the live catalog is unreachable. */
  name: string
  icon: string
  publisher: string
  category: StoreCategory
}

export const STORE_APP_META: Record<string, StoreAppMeta> = {
  "AdvancedMicroDevicesInc-2.AMDRadeonSoftware": { name: "AMD Radeon Software", icon: LOGOS.msStore, publisher: "Advanced Micro Devices Inc.", category: "Tools & Utilities" },
  "AppUp.IntelArcSoftware": { name: "Intel\u00ae Graphics Software", icon: LOGOS.storeIntelGraphicsSoftware, publisher: "Intel\u00ae Corporation", category: "Tools & Utilities" },
  "Clipchamp.Clipchamp": { name: "Microsoft Clipchamp", icon: LOGOS.storeMicrosoftClipchamp, publisher: "Microsoft Corp.", category: "Creativity" },
  "DropboxInc.Dropbox": { name: "Dropbox", icon: LOGOS.storeDropbox, publisher: "Dropbox Inc.", category: "Productivity" },
  "Microsoft PowerToys": { name: "Microsoft PowerToys", icon: LOGOS.storeMicrosoftPowertoys, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.AV1VideoExtension": { name: "AV1 Video Extension", icon: LOGOS.storeAv1VideoExtension, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.AVCEncoderVideoExtension": { name: "AVC Encoder Video Extension", icon: LOGOS.storeAvcEncoderVideoExtension, publisher: "Microsoft Corporation", category: "Creativity" },
  "Microsoft.ApplicationCompatibilityEnhancements": { name: "Windows Application Compatibility Enhancements", icon: LOGOS.msStore, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.BingSearch": { name: "Microsoft Bing", icon: LOGOS.storeMicrosoftBing, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.BingWeather": { name: "MSN Weather", icon: LOGOS.storeMsnWeather, publisher: "Microsoft Corporation", category: "Entertainment" },
  "Microsoft.DesktopAppInstaller": { name: "App Installer", icon: LOGOS.storeAppInstaller, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.GetHelp": { name: "Get Help", icon: LOGOS.storeGetHelp, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.HEIFImageExtension": { name: "HEIF Image Extension", icon: LOGOS.storeHeifImageExtension, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.HEVCVideoExtension": { name: "HEVC Video Extensions from Device Manufacturer", icon: LOGOS.storeHevcVideoExtensionsFromDeviceManufacturer, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.MPEG2VideoExtension": { name: "MPEG-2 Video Extension", icon: LOGOS.storeMpeg2VideoExtension, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.Microsoft3DViewer": { name: "3D Viewer", icon: LOGOS.store3dViewer, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.MicrosoftOfficeHub": { name: "Microsoft 365 Copilot", icon: LOGOS.storeMicrosoft365Copilot, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.MicrosoftStickyNotes": { name: "Microsoft Sticky Notes", icon: LOGOS.storeMicrosoftStickyNotes, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.OutlookForWindows": { name: "Outlook for Windows", icon: LOGOS.storeOutlookForWindows, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.Paint": { name: "Paint", icon: LOGOS.storePaint, publisher: "Microsoft Corporation", category: "Creativity" },
  "Microsoft.PowerAutomateDesktop": { name: "Power Automate", icon: LOGOS.storePowerAutomate, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.RawImageExtension": { name: "Raw Image Extension", icon: LOGOS.storeRawImageExtension, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.ScreenSketch": { name: "Snipping Tool", icon: LOGOS.storeSnippingTool, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.StartExperiencesApp": { name: "Start Experiences App", icon: LOGOS.storeStartExperiencesApp, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.Todos": { name: "Microsoft To Do_ Lists, Tasks & Reminders", icon: LOGOS.storeMicrosoftToDoListsTasksReminders, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.VP9VideoExtensions": { name: "VP9 Video Extensions", icon: LOGOS.storeVp9VideoExtensions, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WebMediaExtensions": { name: "Web Media Extensions", icon: LOGOS.storeWebMediaExtensions, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WebpImageExtension": { name: "WebP Image Extension", icon: LOGOS.storeWebpImageExtension, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WidgetsPlatformRuntime": { name: "Widgets Platform Runtime", icon: LOGOS.msStore, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.Windows.DevHome": { name: "Windows Advanced Settings", icon: LOGOS.storeWindowsAdvancedSettings, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WindowsAlarms": { name: "Windows Clock", icon: LOGOS.storeWindowsClock, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WindowsAppRuntime.1.8": { name: "WinAppRuntime.Main.1.8", icon: LOGOS.msStore, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WindowsCalculator": { name: "Windows Calculator", icon: LOGOS.storeWindowsCalculator, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WindowsCamera": { name: "Windows Camera", icon: LOGOS.storeWindowsCamera, publisher: "Microsoft Corporation", category: "Creativity" },
  "Microsoft.WindowsFeedbackHub": { name: "Feedback Hub", icon: LOGOS.storeFeedbackHub, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WindowsNotepad": { name: "Windows Notepad", icon: LOGOS.storeWindowsNotepad, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.WindowsSoundRecorder": { name: "Windows Sound Recorder", icon: LOGOS.storeWindowsSoundRecorder, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.WindowsTerminal": { name: "Windows Terminal", icon: LOGOS.storeWindowsTerminal, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "Microsoft.YourPhone": { name: "Phone Link", icon: LOGOS.storePhoneLink, publisher: "Microsoft Corporation", category: "Productivity" },
  "Microsoft.ZuneMusic": { name: "Windows Media Player", icon: LOGOS.storeWindowsMediaPlayer, publisher: "Microsoft Corporation", category: "Entertainment" },
  "MicrosoftCorporationII.QuickAssist": { name: "Quick Assist", icon: LOGOS.storeQuickAssist, publisher: "Microsoft Corp.", category: "Tools & Utilities" },
  "MicrosoftCorporationII.WinAppRuntime.Main.1.7": { name: "WinAppRuntime.Main.1.7", icon: LOGOS.msStore, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "MicrosoftCorporationII.WinAppRuntime.Singleton": { name: "WinAppRuntime.Singleton", icon: LOGOS.msStore, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
  "MicrosoftCorporationII.WindowsSubsystemForLinux": { name: "Windows Subsystem for Linux", icon: LOGOS.storeWindowsSubsystemForLinux, publisher: "Microsoft Corp.", category: "Tools & Utilities" },
  "MicrosoftWindows.Client.WebExperience": { name: "Windows Web Experience Pack", icon: LOGOS.storeWindowsWebExperiencePack, publisher: "Microsoft Windows", category: "Tools & Utilities" },
  "MicrosoftWindows.CrossDevice": { name: "Cross Device Experience Host", icon: LOGOS.msStore, publisher: "Microsoft Corporation", category: "Tools & Utilities" },
}
