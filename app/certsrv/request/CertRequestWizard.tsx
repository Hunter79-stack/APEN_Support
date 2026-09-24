'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { CERTSRV_PAGE_LOGOS, LOGOS } from '@/lib/data/logos'
import { EXTERNAL_URLS, EXTERNAL_URL_LABELS } from '@/lib/data/constants'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { CodeBlock } from '@/components/common/CodeBlock'
import { PageHeader, Callout } from '@/components/layout/PageHeader'
import { parseCertificate } from '@/lib/utils/cert-parsing'
import { downloadFile } from '@/lib/utils/download-file'
import type {
  OS, SubjectType, SANType, CertType, RequestMode,
  SubjectEntry, SANEntry,
} from '@/lib/types/cert-types'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  FileDown,
  Terminal,
  Trash2,
  Shield,
  Network,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  KeyRound,
  ClipboardPaste,
  FilePlus2,
  RefreshCw,
  Server,
  Globe2,
  Loader2,
  Send,
  Clock,
} from 'lucide-react'

/* ─── Subject field catalogue ────────────────────────────── */
const SUBJECT_TYPES: {
  id:          SubjectType
  label:       string
  placeholder: string
  hint:        string | null
}[] = [
  { id: 'CN', label: 'Common Name',         placeholder: 'server.example.mil',    hint: 'Primary FQDN the certificate will protect. Only one CN is allowed.' },
  { id: 'O',  label: 'Organization',        placeholder: 'Example Organization',   hint: 'Exact legal name of the requesting entity.' },
  { id: 'OU', label: 'Organizational Unit', placeholder: 'Information Technology', hint: 'Division or department managing this certificate.' },
  { id: 'L',  label: 'Locality',            placeholder: 'Arlington',              hint: '⚠ Must be the full city name — abbreviations are not permitted.' },
  { id: 'ST', label: 'State',               placeholder: 'Virginia',               hint: 'State or province. Abbreviations are acceptable (e.g. VA).' },
  { id: 'C',  label: 'Country',             placeholder: 'US',                     hint: 'Exactly 2 letters (ISO 3166-1 alpha-2). Auto-uppercased.' },
]

function getRequiredTypes(os: OS): SubjectType[] {
  return os === 'windows'
    ? ['CN', 'O', 'OU', 'L', 'ST', 'C']
    : ['CN', 'O', 'L', 'ST', 'C']
}

function getMissingRequired(entries: SubjectEntry[], os: OS): SubjectType[] {
  return getRequiredTypes(os).filter(
    (t) => !entries.some((e) => e.type === t && e.value.trim()),
  )
}

/* ─── Validation ─────────────────────────────────────────── */
function getSubjectValidator(type: SubjectType): (v: string) => string | null {
  if (type === 'C')
    return (v) =>
      /^[A-Za-z]{2}$/.test(v) ? null : 'Must be exactly 2 letters (ISO 3166-1, e.g. US).'
  return (v) => (v.trim() ? null : 'Value cannot be empty.')
}

function validateDNS(v: string): string | null {
  if (!v) return 'Cannot be empty.'
  if (v.includes('*')) return 'Wildcard domains and hostnames are not permitted.'
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/.test(v))
    return 'Invalid hostname or domain format.'
  return null
}

function validateIP(v: string): string | null {
  if (!v) return 'Cannot be empty.'
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return 'Must be a valid IPv4 address (e.g. 192.168.1.100).'
  if (m.slice(1).map(Number).some((o) => o > 255))
    return 'Each octet must be between 0 and 255.'
  if (v === '0.0.0.0') return 'Wildcard IP addresses are not permitted.'
  return null
}

/* ─── Certificate type → EKU OIDs ───────────────────────── */
const CERT_TYPE_CONFIG: Record<CertType, { label: string; sub: string; oids: { oid: string; comment: string }[] }> = {
  server: {
    label: 'Server',
    sub:   'Server + Client Authentication (most common for AD-joined servers)',
    oids:  [
      { oid: '1.3.6.1.5.5.7.3.1', comment: 'Server Authentication' },
      { oid: '1.3.6.1.5.5.7.3.2', comment: 'Client Authentication' },
    ],
  },
  workstation: {
    label: 'Workstation',
    sub:   'Client Authentication only (machine/user certificates)',
    oids:  [
      { oid: '1.3.6.1.5.5.7.3.2', comment: 'Client Authentication' },
    ],
  },
  webserver: {
    label: 'Web Server',
    sub:   'Server Authentication only (TLS/HTTPS endpoint certificates)',
    oids:  [
      { oid: '1.3.6.1.5.5.7.3.1', comment: 'Server Authentication' },
    ],
  },
}

/* ─── Config / command builders ──────────────────────────── */
function getCN(entries: SubjectEntry[]): string {
  const cn = entries.find((e) => e.type === 'CN')
  return cn ? (cn.value.trim().replace(/[^a-zA-Z0-9\-_.]/g, '_') || 'server') : 'server'
}

function buildOpenSSLConfig(entries: SubjectEntry[], sans: SANEntry[]): string {
  const dnLines = entries.map((e) => `${e.type.padEnd(3)} = ${e.value}`).join('\n')

  let dnsIdx = 0, ipIdx = 0
  const altLines = sans.map((s) => {
    if (s.type === 'DNS') { dnsIdx++; return `DNS.${dnsIdx} = ${s.value}` }
    else                  { ipIdx++;  return `IP.${ipIdx}  = ${s.value}` }
  })
  const hasSAN = altLines.length > 0

  return [
    '[req]',
    'default_bits       = 2048',
    'prompt             = no',
    'default_md         = sha256',
    ...(hasSAN ? ['req_extensions     = req_ext'] : []),
    'distinguished_name = dn',
    '',
    '[dn]',
    dnLines,
    ...(hasSAN
      ? ['', '[req_ext]', 'subjectAltName = @alt_names', '', '[alt_names]', altLines.join('\n')]
      : []),
  ].join('\n')
}

function buildShellScript(name: string, confFile: string, mode: RequestMode, keyPath: string): string {
  // For renewal, re-use the existing key file the user supplies. For new
  // enrollment, generate a fresh key alongside the CSR.
  const keyLine = mode === 'renew'
    ? `EXISTING_KEY="${keyPath || `${name}.key`}"`
    : `KEY="${name}.key"`
  const opensslCmd = mode === 'renew'
    ? `openssl req -new \\
  -key    "$EXISTING_KEY" \\
  -out    "$CSR" \\
  -config "$CONF"`
    : `openssl req -new -newkey rsa:2048 -nodes \\
  -keyout "$KEY" \\
  -out    "$CSR" \\
  -config "$CONF"`

  return `#!/bin/bash
# APEN ${mode === 'renew' ? 'Renewal' : 'New'} CSR Generation Script — Generated by APEN Support Site
set -e

CONF="${confFile}"
${keyLine}
CSR="${name}.csr"

if [ ! -f "$CONF" ]; then
  echo "ERROR: $CONF not found. Place this script in the same directory as the .cnf file."
  exit 1
fi
${mode === 'renew' ? '\nif [ ! -f "$EXISTING_KEY" ]; then\n  echo "ERROR: $EXISTING_KEY not found. Set EXISTING_KEY at the top of this script to the path of your existing private key."\n  exit 1\nfi\n' : ''}
echo "[1/2] Generating ${mode === 'renew' ? 'renewal ' : ''}CSR..."
${opensslCmd}

echo "[2/2] Verifying CSR..."
openssl req -noout -text -in "$CSR"

echo ""
echo "✓ Done."
echo "  CSR : $CSR  (submit this to the APEN Certificate Authority)"
${mode === 'renew' ? 'echo "  Key : $EXISTING_KEY  (your existing private key — left untouched)"' : 'echo "  Key : $KEY  (keep this file secure — never share it)"'}
`
}

function buildWindowsInf(
  entries: SubjectEntry[], sans: SANEntry[], certType: CertType, mode: RequestMode,
): string {
  const subject    = entries.map((e) => `${e.type}=${e.value}`).join(', ')
  const hasSAN     = sans.length > 0
  const ekuLines   = CERT_TYPE_CONFIG[certType].oids
    .map((o) => `OID = ${o.oid} ; ${o.comment}`)
    .join('\n')
  const sanSection = hasSAN
    ? [
        '',
        '[Extensions]',
        '2.5.29.17 = "{text}"',
        ...sans.map((s) =>
          s.type === 'DNS'
            ? `_continue_ = "dns=${s.value}&"`
            : `_continue_ = "ipaddress=${s.value}&"`,
        ),
      ].join('\n')
    : ''

  // For renewal, set UseExistingKeySet = TRUE so certreq re-uses the
  // private key already in the Local Machine store. The actual cert-renewal
  // semantics (linking the request to the prior cert by thumbprint) are
  // handled by the certreq -enroll … Renew flow described in the output step.
  const useExisting = mode === 'renew' ? 'TRUE' : 'FALSE'
  const exportable  = mode === 'renew' ? 'FALSE' : 'TRUE' // renewing should not re-export

  return `[Version]
Signature = "$Windows NT$"

[NewRequest]
Subject           = "${subject}"
KeySpec           = 1
KeyLength         = 2048
Exportable        = ${exportable}
MachineKeySet     = TRUE
SMIME             = FALSE
PrivateKeyArchive = FALSE
UserProtected     = FALSE
UseExistingKeySet = ${useExisting}
ProviderName      = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType      = 12
RequestType       = PKCS10
KeyUsage          = 0xa0
HashAlgorithm     = SHA256

[EnhancedKeyUsageExtension]
${ekuLines}${sanSection}`
}

/* ─── Step bar — built dynamically per mode ──────────────── */
interface StepDef { id: number; label: string }

function buildSteps(mode: RequestMode | null): StepDef[] {
  if (mode === 'renew') {
    return [
      { id: 1, label: 'Choose Path'         },
      { id: 2, label: 'Paste Existing Cert' },
      { id: 3, label: 'Select OS'           },
      { id: 4, label: 'Certificate Details' },
      { id: 5, label: 'Generate CSR'        },
      { id: 6, label: 'Submit to CA'        },
    ]
  }
  // 'enroll' or path not yet chosen — show the enroll-path bar.
  return [
    { id: 1, label: 'Choose Path'         },
    { id: 2, label: 'Select OS'           },
    { id: 3, label: 'Certificate Details' },
    { id: 4, label: 'Generate CSR'        },
    { id: 5, label: 'Submit to CA'        },
  ]
}

function StepBubble({ step, current }: { step: StepDef; current: number }) {
  const done   = step.id < current
  const active = step.id === current
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border-2
                    transition-all duration-300 text-sm font-bold
          ${done   ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'        : ''}
          ${active ? 'bg-cyan-400   border-cyan-400 text-[#060b18]'        : ''}
          ${!done && !active ? 'bg-white/5 border-white/15 text-slate-400' : ''}`}
      >
        {done ? <CheckCircle2 size={18} /> : step.id}
      </div>
      <span
        className={`text-xs font-medium whitespace-nowrap transition-colors duration-300
          ${active ? 'text-white' : done ? 'text-cyan-400' : 'text-slate-400'}`}
      >
        {step.label}
      </span>
    </div>
  )
}

function StepBar({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <div className="flex items-start gap-0 justify-center flex-wrap">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <StepBubble step={s} current={current} />
          {i < steps.length - 1 && (
            <div
              className={`w-10 sm:w-16 h-px mt-[-18px] mx-2 transition-colors duration-500
                ${current > s.id ? 'bg-cyan-400/50' : 'bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── SubjectPanel ───────────────────────────────────────── */
function SubjectPanel({
  entries, onAdd, onRemove, requiredTypes,
}: {
  entries:       SubjectEntry[]
  onAdd:         (e: SubjectEntry) => void
  onRemove:      (i: number) => void
  requiredTypes: SubjectType[]
}) {
  const [selType, setSelType] = useState<SubjectType>('CN')
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState<string | null>(null)

  const typeConfig = SUBJECT_TYPES.find((t) => t.id === selType)!

  const handleAdd = () => {
    const trimmed = selType === 'C' ? value.trim().toUpperCase() : value.trim()
    if (!trimmed) { setError('Value cannot be empty.'); return }
    const err = getSubjectValidator(selType)(trimmed)
    if (err) { setError(err); return }
    if (selType === 'CN' && entries.some((e) => e.type === 'CN')) {
      setError('Only one Common Name (CN) is allowed per certificate.')
      return
    }
    onAdd({ type: selType, value: trimmed })
    setValue('')
    setError(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selType}
          onChange={(e) => {
            setSelType(e.target.value as SubjectType)
            setError(null)
            setValue('')
          }}
          className="sm:w-60 px-3 py-2.5 rounded-lg border border-white/10 text-slate-200
                     text-sm focus:outline-none focus:border-cyan-400/50 transition-colors
                     bg-[#060b18] cursor-pointer"
        >
          {SUBJECT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({t.id}){requiredTypes.includes(t.id) ? '  *' : ''}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder={typeConfig.placeholder}
          className={`flex-1 px-3 py-2.5 rounded-lg border font-mono text-sm text-slate-200
                     placeholder:text-slate-400 focus:outline-none transition-colors
                     ${error ? 'border-red-400/50' : 'border-white/10 focus:border-cyan-400/50'}`}
          style={{ background: 'rgba(6,11,24,0.8)' }}
        />

        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                     bg-cyan-400/10 border border-cyan-400/20 text-cyan-400
                     text-sm font-semibold hover:bg-cyan-400/20 transition-colors flex-shrink-0"
        >
          Add <ChevronRight size={14} />
        </button>
      </div>

      {error
        ? (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle size={11} className="flex-shrink-0" /> {error}
          </p>
        ) : typeConfig.hint && (
          <p className="text-xs text-slate-400 leading-relaxed">{typeConfig.hint}</p>
        )}

      <div
        className="rounded-lg border border-white/8 overflow-hidden min-h-[88px]"
        style={{ background: 'rgba(6,11,24,0.6)' }}
      >
        {entries.length === 0
          ? <p className="text-xs text-slate-400 italic p-3">No subject fields added yet.</p>
          : (
            <div className="divide-y divide-white/5">
              {entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 group">
                  <span className="font-mono text-xs text-slate-300">
                    <span className="text-cyan-400/80">{e.type}</span>
                    {' = '}
                    {e.value}
                  </span>
                  <button
                    onClick={() => onRemove(i)}
                    aria-label="Remove"
                    className="ml-3 p-1 rounded text-slate-400
                               hover:!text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400 mr-0.5">Required:</span>
        {requiredTypes.map((typeId) => {
          const present = entries.some((e) => e.type === typeId && e.value.trim())
          return (
            <span
              key={typeId}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs
                          transition-all duration-200
                ${present
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border border-white/10 text-slate-400'}`}
            >
              {present && <CheckCircle2 size={9} />}
              {typeId}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ─── SANPanel ───────────────────────────────────────────── */
function SANPanel({
  sans, onAdd, onRemove,
}: {
  sans:     SANEntry[]
  onAdd:    (e: SANEntry) => void
  onRemove: (i: number) => void
}) {
  const [sanType, setSanType] = useState<SANType>('DNS')
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState<string | null>(null)

  const validate = sanType === 'DNS' ? validateDNS : validateIP

  const handleAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) { setError('Cannot be empty.'); return }
    const err = validate(trimmed)
    if (err) { setError(err); return }
    onAdd({ type: sanType, value: trimmed })
    setValue('')
    setError(null)
  }

  const hint =
    sanType === 'DNS'
      ? 'Wildcards are not permitted. Short hostnames, localhost, and FQDNs are allowed.'
      : 'Wildcard IP addresses (0.0.0.0) are not permitted.'

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={sanType}
          onChange={(e) => { setSanType(e.target.value as SANType); setError(null); setValue('') }}
          className="sm:w-36 px-3 py-2.5 rounded-lg border border-white/10 text-slate-200
                     text-sm focus:outline-none focus:border-cyan-400/50 transition-colors
                     bg-[#060b18] cursor-pointer"
        >
          <option value="DNS">DNS</option>
          <option value="IP">IP address</option>
        </select>

        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder={sanType === 'DNS' ? 'server.example.mil' : '192.168.1.100'}
          className={`flex-1 px-3 py-2.5 rounded-lg border font-mono text-sm text-slate-200
                     placeholder:text-slate-400 focus:outline-none transition-colors
                     ${error ? 'border-red-400/50' : 'border-white/10 focus:border-cyan-400/50'}`}
          style={{ background: 'rgba(6,11,24,0.8)' }}
        />

        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                     bg-cyan-400/10 border border-cyan-400/20 text-cyan-400
                     text-sm font-semibold hover:bg-cyan-400/20 transition-colors flex-shrink-0"
        >
          Add <ChevronRight size={14} />
        </button>
      </div>

      {error
        ? (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle size={11} className="flex-shrink-0" /> {error}
          </p>
        ) : (
          <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>
        )}

      <div
        className="rounded-lg border border-white/8 overflow-hidden min-h-[70px]"
        style={{ background: 'rgba(6,11,24,0.6)' }}
      >
        {sans.length === 0
          ? <p className="text-xs text-slate-400 italic p-3">No alternative names added yet.</p>
          : (
            <div className="divide-y divide-white/5">
              {sans.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 group">
                  <span className="font-mono text-xs text-slate-300">
                    <span className="text-cyan-400/80">
                      {s.type === 'IP' ? 'IP address' : 'DNS'}
                    </span>
                    {': '}
                    {s.value}
                  </span>
                  <button
                    onClick={() => onRemove(i)}
                    aria-label="Remove"
                    className="ml-3 p-1 rounded text-slate-400
                               hover:!text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

/* ─── Step: Choose Path (Enroll vs Renew) ────────────────── */
function StepChoosePath({
  mode, setMode, onNext,
}: {
  mode: RequestMode | null
  setMode: (m: RequestMode) => void
  onNext: () => void
}) {
  const options: { id: RequestMode; title: string; sub: string; icon: typeof FilePlus2 }[] = [
    {
      id:   'enroll',
      title: 'Enroll a new certificate',
      sub:   'Submit a brand-new CSR for a server, workstation, or service identity that has never been issued a certificate by the APEN CA.',
      icon:  FilePlus2,
    },
    {
      id:   'renew',
      title: 'Renew an existing certificate',
      sub:   'Re-issue a certificate that already exists. The wizard reads the subject and SANs from your current cert and re-uses the same private key.',
      icon:  RefreshCw,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">What do you need to do?</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Choose whether you are requesting a new certificate or renewing one that is
          already in service. Both paths end with the same submission step in the
          APEN Certificate Authority portal.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon
          const selected = mode === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left
                          transition-all duration-200 h-full
                ${selected
                  ? 'border-cyan-400 bg-cyan-400/8'
                  : 'border-white/10 bg-white/3 hover:border-white/25'}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                 transition-colors
                  ${selected ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-400'}`}>
                  <Icon size={20} />
                </div>
                <div className={`flex-shrink-0 transition-colors
                  ${selected ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
              </div>
              <p className={`text-sm font-semibold transition-colors
                ${selected ? 'text-white' : 'text-slate-300'}`}>
                {opt.title}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{opt.sub}</p>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!mode}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-400 text-[#060b18]
                     font-semibold text-sm hover:bg-cyan-300 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step: Paste Existing Cert (renewal only) ───────────── */
function StepPasteCert({
  certText, setCertText,
  onApply, onBack,
}: {
  certText: string
  setCertText: (s: string) => void
  onApply:  (parsed: { subject: SubjectEntry[]; sans: SANEntry[] }) => void
  onBack:   () => void
}) {
  const [error, setError]       = useState<string | null>(null)
  const [preview, setPreview]   = useState<{ subject: SubjectEntry[]; sans: SANEntry[] } | null>(null)

  const handleParse = () => {
    const result = parseCertificate(certText)
    if (!result.ok) {
      setError(result.error ?? 'Could not parse certificate.')
      setPreview(null)
      return
    }
    setError(null)
    setPreview({ subject: result.subject, sans: result.sans })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <ClipboardPaste size={18} className="text-cyan-300" />
          Paste your existing certificate
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Paste the PEM block (starting with <code className="code-inline text-xs">-----BEGIN CERTIFICATE-----</code>)
          or the full output of <code className="code-inline text-xs">openssl x509 -in cert.pem -text -noout</code>.
          The wizard reads the Subject and Subject Alternative Names so you do not have to
          retype them. <strong className="text-slate-300">Never paste a private key.</strong>
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Existing certificate (PEM or openssl text output)
        </label>
        <textarea
          value={certText}
          onChange={(e) => { setCertText(e.target.value); setError(null); setPreview(null) }}
          rows={12}
          spellCheck={false}
          placeholder={'-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----'}
          className={`w-full px-3 py-2.5 rounded-lg border font-mono text-xs text-slate-200
                     placeholder:text-slate-400 focus:outline-none transition-colors
                     ${error ? 'border-red-400/50' : 'border-white/10 focus:border-cyan-400/50'}`}
          style={{ background: 'rgba(6,11,24,0.8)' }}
        />
        {error && (
          <p className="text-xs text-red-400 flex items-start gap-1.5 leading-relaxed">
            <AlertCircle size={11} className="flex-shrink-0 mt-0.5" /> {error}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleParse}
          disabled={!certText.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                     bg-indigo-400/15 border border-indigo-400/30 text-indigo-300
                     text-sm font-semibold hover:bg-indigo-400/25 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <KeyRound size={14} /> Extract Subject &amp; SANs
        </button>
      </div>

      {preview && (
        <div
          className="p-4 rounded-xl border border-emerald-400/25 space-y-3"
          style={{ background: 'rgba(16,185,129,0.04)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Parsed successfully
          </p>
          <div>
            <p className="text-xs text-slate-400 mb-1">Subject</p>
            <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">
              {preview.subject.map((e) => `${e.type}=${e.value}`).join(', ') || '(none found)'}
            </p>
          </div>
          {preview.sans.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Subject Alternative Names</p>
              <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">
                {preview.sans.map((s) => `${s.type === 'IP' ? 'IP' : 'DNS'}:${s.value}`).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      <Callout type="info">
        Renewal uses your <strong>existing private key</strong>. Keep the
        <code className="code-inline mx-1">.key</code> file
        (Linux) or the existing certificate&apos;s key in the Local Machine store (Windows)
        in place — the wizard will reference it in the commands on the final step.
      </Callout>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10
                     text-slate-400 text-sm hover:text-white hover:border-white/25 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={() => preview && onApply(preview)}
          disabled={!preview}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-400 text-[#060b18]
                     font-semibold text-sm hover:bg-cyan-300 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Use these values <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step: Select OS ────────────────────────────────────── */
function StepSelectOS({
  os, setOs, onNext, onBack,
}: {
  os: OS
  setOs: (v: OS) => void
  onNext: () => void
  onBack: () => void
}) {
  const osOptions: { id: OS; label: string; sub: string; logo: string; badge?: string }[] = [
    { id: 'windows', label: 'Windows Server',    sub: 'Server 2019 · 2022 · 2025',         logo: LOGOS.windows,   badge: 'certlm.msc / certreq' },
    { id: 'el',      label: 'Enterprise Linux',  sub: 'AlmaLinux · Rocky Linux · CentOS',  logo: LOGOS.linuxTux, badge: 'OpenSSL'               },
    { id: 'ubuntu',  label: 'Ubuntu',             sub: 'Ubuntu 22.04 / 24.04',              logo: LOGOS.ubuntu,    badge: 'OpenSSL'               },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Select Your Operating System</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Choose the OS where the CSR will be generated. Windows targets produce a
          <code className="code-inline text-xs mx-1">certreq</code> INF file matching the
          <code className="code-inline text-xs mx-1">certlm.msc</code> workflow; Linux targets
          produce an equivalent OpenSSL config.
        </p>
      </div>

      <div className="space-y-3">
        {osOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setOs(opt.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                        transition-all duration-200
              ${os === opt.id
                ? 'border-cyan-400 bg-cyan-400/8'
                : 'border-white/10 bg-white/3 hover:border-white/25'}`}
          >
            <ThemedLogo src={opt.logo} alt={opt.label || ''} size="sm" glass={false} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold transition-colors
                               ${os === opt.id ? 'text-white' : 'text-slate-300'}`}>
                  {opt.label}
                </p>
                {opt.badge && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono
                                   bg-white/5 border border-white/10 text-slate-400">
                    {opt.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
            </div>
            <div className={`ml-auto flex-shrink-0 transition-colors
                             ${os === opt.id ? 'text-cyan-400' : 'text-slate-400'}`}>
              {os === opt.id ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10
                     text-slate-400 text-sm hover:text-white hover:border-white/25 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!os}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-400 text-[#060b18]
                     font-semibold text-sm hover:bg-cyan-300 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step: Certificate Details ──────────────────────────── */
function StepDetails({
  os, mode,
  subjectEntries, setSubjectEntries,
  sanEntries,     setSanEntries,
  certType, setCertType,
  keyPath,  setKeyPath,
  onNext, onBack,
}: {
  os:                OS
  mode:              RequestMode
  subjectEntries:    SubjectEntry[]
  setSubjectEntries: (v: SubjectEntry[]) => void
  sanEntries:        SANEntry[]
  setSanEntries:     (v: SANEntry[]) => void
  certType:          CertType
  setCertType:       (v: CertType) => void
  keyPath:           string
  setKeyPath:        (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [attempted, setAttempted] = useState(false)
  const isWindows   = os === 'windows'
  const isRenew     = mode === 'renew'
  const reqTypes    = getRequiredTypes(os)
  const missing     = getMissingRequired(subjectEntries, os)

  const handleNext = () => {
    if (missing.length > 0) { setAttempted(true); return }
    onNext()
  }

  const dnPreview = useMemo(
    () => subjectEntries.map((e) => `${e.type}=${e.value}`).join(', '),
    [subjectEntries],
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          Certificate Properties
          {isRenew && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded
                             bg-indigo-400/15 border border-indigo-400/30 text-indigo-300
                             text-xs font-semibold align-middle">
              <RefreshCw size={11} /> Renewal
            </span>
          )}
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {isRenew
            ? 'Subject and SANs were pre-filled from your existing certificate. Edit anything that has changed since the original issuance.'
            : 'Add fields using the dropdowns below — the same workflow as the certlm.msc Certificate Properties dialog. Types marked * are required.'}
        </p>
      </div>

      {isWindows && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-cyan-400 flex-shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Certificate Type
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.entries(CERT_TYPE_CONFIG) as [CertType, typeof CERT_TYPE_CONFIG[CertType]][]).map(([id, cfg]) => (
              <button
                key={id}
                onClick={() => setCertType(id)}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left
                            transition-all duration-200
                  ${certType === id
                    ? 'border-cyan-400 bg-cyan-400/8'
                    : 'border-white/10 bg-white/3 hover:border-white/25'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-sm font-semibold transition-colors
                    ${certType === id ? 'text-white' : 'text-slate-300'}`}>
                    {cfg.label}
                  </span>
                  <div className={`flex-shrink-0 transition-colors
                    ${certType === id ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {certType === id ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-snug">{cfg.sub}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cfg.oids.map((o) => (
                    <span key={o.oid} className="px-1.5 py-0.5 rounded text-[10px] font-mono
                                                  bg-white/5 border border-white/10 text-slate-400">
                      {o.comment}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Minimum key length: <code className="code-inline text-xs">2048-bit RSA</code> (enforced in the generated INF file).
          </p>
        </div>
      )}

      {/* Existing-key path for Linux renewals */}
      {isRenew && !isWindows && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={15} className="text-cyan-400 flex-shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Existing Private Key Path
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <input
            type="text"
            value={keyPath}
            onChange={(e) => setKeyPath(e.target.value)}
            placeholder="/etc/pki/tls/private/server.key"
            className="w-full px-3 py-2.5 rounded-lg border border-white/10 font-mono text-sm
                       text-slate-200 placeholder:text-slate-400 focus:outline-none
                       focus:border-cyan-400/50 transition-colors"
            style={{ background: 'rgba(6,11,24,0.8)' }}
          />
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Absolute path to the existing private key file on the target system. The renewal CSR
            will be signed with this key — the file is not uploaded.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} className="text-cyan-400 flex-shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Subject Name
          </h3>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <SubjectPanel
          entries={subjectEntries}
          onAdd={(e)    => setSubjectEntries([...subjectEntries, e])}
          onRemove={(i) => setSubjectEntries(subjectEntries.filter((_, idx) => idx !== i))}
          requiredTypes={reqTypes}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Network size={15} className="text-cyan-400 flex-shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Alternative Name
          </h3>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <SANPanel
          sans={sanEntries}
          onAdd={(e)   => setSanEntries([...sanEntries, e])}
          onRemove={(i) => setSanEntries(sanEntries.filter((_, idx) => idx !== i))}
        />
      </div>

      {dnPreview && (
        <div
          className="p-4 rounded-xl border border-white/8"
          style={{ background: 'rgba(6,11,24,0.6)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Distinguished Name
          </p>
          <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">
            {dnPreview}
          </p>
        </div>
      )}

      {attempted && missing.length > 0 && (
        <Callout type="warning">
          Missing required Subject Name{' '}
          {missing.length === 1 ? 'field' : 'fields'}:{' '}
          {missing.map((t, i) => (
            <span key={t}>
              <code className="code-inline text-xs">{t}</code>
              {i < missing.length - 1 ? ', ' : ''}
            </span>
          ))}
        </Callout>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10
                     text-slate-400 text-sm hover:text-white hover:border-white/25 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-400 text-[#060b18]
                     font-semibold text-sm hover:bg-cyan-300 transition-colors"
        >
          Generate CSR <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step: Generate Output ──────────────────────────────── */
function StepGenerate({
  os, mode, subjectEntries, sanEntries, certType, keyPath, onNext, onBack,
}: {
  os:             OS
  mode:           RequestMode
  subjectEntries: SubjectEntry[]
  sanEntries:     SANEntry[]
  certType:       CertType
  keyPath:        string
  onNext:         () => void
  onBack:         () => void
}) {
  const isWindows  = os === 'windows'
  const isRenew    = mode === 'renew'
  const name       = getCN(subjectEntries)
  const osLabel    = os === 'windows' ? 'Windows Server' : os === 'el' ? 'Enterprise Linux' : 'Ubuntu'
  const configFile = isWindows ? `${name}.inf` : `${name}.cnf`

  const configContent = isWindows
    ? buildWindowsInf(subjectEntries, sanEntries, certType, mode)
    : buildOpenSSLConfig(subjectEntries, sanEntries)

  const effectiveKeyPath = keyPath.trim() || `${name}.key`

  const genCmd = isWindows
    ? `certreq -new "${name}.inf" "${name}.csr"`
    : isRenew
      ? `openssl req -new \\\n  -key    "${effectiveKeyPath}" \\\n  -out    "${name}.csr" \\\n  -config "${name}.cnf"`
      : `openssl req -new -newkey rsa:2048 -nodes \\\n  -keyout "${name}.key" \\\n  -out    "${name}.csr" \\\n  -config "${name}.cnf"`

  const verifyCmd = isWindows
    ? `certutil -dump "${name}.csr"`
    : `openssl req -noout -text -in "${name}.csr"`

  const shellScript = isWindows ? null : buildShellScript(name, configFile, mode, effectiveKeyPath)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-cyan-400/15 border border-cyan-400/30
                        flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCircle2 size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {isRenew ? 'Renewal' : 'New'} CSR Configuration for {osLabel}
          </h2>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            Download the configuration file, then run the commands below to generate your
            {isWindows
              ? ' CSR.'
              : isRenew
                ? ' renewal CSR using your existing private key.'
                : ' private key and CSR.'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400 flex-shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {isWindows ? 'certreq INF File' : 'OpenSSL Config File'} — {configFile}
            </p>
          </div>
          <button
            onClick={() => downloadFile(configFile, configContent, 'text/plain')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-indigo-400/15 border border-indigo-400/30 text-indigo-300
                       text-xs font-semibold hover:bg-indigo-400/25 transition-colors"
          >
            <FileDown size={12} /> Download {isWindows ? '.inf' : '.cnf'}
          </button>
        </div>
        <CodeBlock code={configContent} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-xs text-slate-400 uppercase tracking-widest">then run</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400 flex-shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Step 1 — Generate the {isRenew ? 'renewal ' : ''}CSR
          </p>
        </div>
        <CodeBlock code={genCmd} />

        {isWindows && (
          <div
            className="mt-3 p-4 rounded-xl border border-white/8 space-y-3"
            style={{ background: 'rgba(6,11,24,0.7)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              How to run the certreq command
            </p>
            <ol className="space-y-2">
              {[
                <>Open <strong className="text-slate-300">Command Prompt</strong> or <strong className="text-slate-300">PowerShell</strong> <span className="text-cyan-400 font-semibold">as Administrator</span> — right-click and select <em className="text-slate-400">Run as administrator</em>.</>,
                <>Navigate to the folder where you saved <code className="code-inline text-xs">{configFile}</code>. Example: <code className="code-inline text-xs">cd C:\Certs</code></>,
                <>Copy and paste the command above into the prompt and press <kbd className="px-1.5 py-0.5 rounded border border-white/20 text-xs font-mono text-slate-300 bg-white/5">Enter</kbd>. <span className="text-slate-400">certreq will create the CSR file in the same folder.</span></>,
                <>The output file <code className="code-inline text-xs">{name}.csr</code> is your Certificate Signing Request. Continue to the next step to submit it via the {EXTERNAL_URL_LABELS.certificateServices} portal.</>,
                isRenew
                  ? <>Because <code className="code-inline text-xs">UseExistingKeySet = TRUE</code>, certreq re-uses the private key from the Local Machine certificate store associated with the existing certificate — the key never leaves the system.</>
                  : <>The private key is stored securely in the <strong className="text-slate-300">Local Machine certificate store</strong> — do not export or share it.</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-400/15 border border-cyan-400/30
                                   text-cyan-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-slate-400 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {!isWindows && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Run from the directory containing{' '}
            <code className="code-inline text-xs">{configFile}</code>. Outputs{' '}
            {isRenew
              ? <>
                  <code className="code-inline text-xs">{name}.csr</code> (signing request). Your
                  existing key at <code className="code-inline text-xs">{effectiveKeyPath}</code> is
                  re-used and left untouched.
                </>
              : <>
                  <code className="code-inline text-xs">{name}.key</code> (private key) and{' '}
                  <code className="code-inline text-xs">{name}.csr</code> (signing request).
                </>}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-cyan-400 flex-shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Step 2 — Verify the CSR
          </p>
        </div>
        <CodeBlock code={verifyCmd} />
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Review the output to confirm all Subject fields and SANs are correct before
          submitting to the APEN Certificate Authority.
        </p>
      </div>

      {!isWindows && shellScript && (
        <div
          className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-indigo-400/20"
          style={{ background: 'rgba(99,102,241,0.05)' }}
        >
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-400/10 flex items-center justify-center flex-shrink-0">
              <FileDown size={16} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">One-click automation script</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Download a shell script that runs both steps automatically.
                Place it alongside{' '}
                <code className="code-inline text-xs">{configFile}</code> and execute it.
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadFile(`${isRenew ? 'renew' : 'generate'}-csr-${name}.sh`, shellScript ?? '', 'text/plain')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-indigo-400/15 border border-indigo-400/30 text-indigo-300
                       text-xs font-semibold hover:bg-indigo-400/25 transition-colors
                       flex-shrink-0 self-start sm:self-center"
          >
            <FileDown size={13} /> Download .sh Script
          </button>
        </div>
      )}

      <Callout type="info">
        Once you have <code className="code-inline">{name}.csr</code>, continue to the next step
        to submit it via the {EXTERNAL_URL_LABELS.certificateServices} portal.
        {!isWindows && !isRenew && (
          <>
            {' '}Keep <code className="code-inline">{name}.key</code> secure on this system —
            the private key must never be shared or transferred.
          </>
        )}
      </Callout>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10
                     text-slate-400 text-sm hover:text-white hover:border-white/25 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-400 text-[#060b18]
                     font-semibold text-sm hover:bg-cyan-300 transition-colors"
        >
          Submit to CA <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step: Submit to AD CS Portal ───────────────────────── */
/**
 * Backend status shape returned by GET /api/cert-request/status.
 * Mirrors configReport() in proxy/cert-request.mjs.
 */
interface CertRequestStatus {
  configured: boolean
  authType:   'kerberos' | 'username' | 'certificate' | null
  hasCepUrl:  boolean
  hasCesUrl:  boolean
  hasCaConfig: boolean
  allowedTemplates: string[] | null
}

type SubmissionPath = 'api' | 'portal'

type ApiResult =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'issued';  certificate: string }
  | { kind: 'pending'; requestId: number }
  | { kind: 'denied';  reason: string }
  | { kind: 'error';   message: string }

function StepSubmit({ onBack }: { onBack: () => void }) {
  /* ── Backend status probe ──
   * /api/cert-request/status always answers (it's the one route that
   * works even when CES/CEP env vars are unset). If the response says
   * configured=true we surface the API submission path; otherwise the
   * wizard falls back to the existing portal-only flow.
   */
  const [status, setStatus] = useState<CertRequestStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/cert-request/status', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() as Promise<CertRequestStatus> : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { if (!cancelled) setStatus(data) })
      .catch(() => { if (!cancelled) setStatus({
        configured: false, authType: null,
        hasCepUrl: false, hasCesUrl: false, hasCaConfig: false,
        allowedTemplates: null,
      }) })
      .finally(() => { if (!cancelled) setStatusLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Once status arrives, default to API when configured, portal otherwise.
  const apiAvailable = Boolean(status?.configured)
  const [path, setPath] = useState<SubmissionPath>(apiAvailable ? 'api' : 'portal')
  const [seenApiAvailable, setSeenApiAvailable] = useState(apiAvailable)
  if (apiAvailable !== seenApiAvailable) {
    setSeenApiAvailable(apiAvailable)
    if (apiAvailable) setPath('api')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-cyan-400/15 border border-cyan-400/30
                        flex items-center justify-center flex-shrink-0 mt-0.5">
          <ExternalLink size={18} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            Submit your CSR to the APEN Certificate Authority
          </h2>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            {apiAvailable
              ? 'Submit your CSR directly through the API, or use the AD CS web portal below — pick whichever fits your workflow.'
              : 'Open the APEN Certificate Authority portal and submit your CSR there. (Direct API submission becomes available once CES/CEP are configured on the CA.)'}
          </p>
        </div>
      </div>

      {/* Path picker — only shown when the backend reports the API is wired up. */}
      {!statusLoading && apiAvailable && (
        <div className="grid sm:grid-cols-2 gap-3">
          <PathOption
            id="api"      label="Submit via API"     icon={Server}
            sub="Direct call to the CES enrollment service. Returns the issued certificate (or a pending status) in this page."
            selected={path === 'api'} onSelect={() => setPath('api')}
          />
          <PathOption
            id="portal"   label="Submit via AD CS portal" icon={Globe2}
            sub="Open the APEN CA web enrollment portal and submit the CSR there. The same flow used today."
            selected={path === 'portal'} onSelect={() => setPath('portal')}
          />
        </div>
      )}

      {path === 'api' && apiAvailable
        ? <ApiSubmitPanel allowedTemplates={status?.allowedTemplates ?? null} />
        : <PortalSubmitPanel />
      }

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10
                     text-slate-400 text-sm hover:text-white hover:border-white/25 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10
                        border border-emerald-500/25 text-emerald-400 text-sm font-medium">
          <CheckCircle2 size={16} /> Wizard complete
        </div>
      </div>
    </div>
  )
}

/* Path picker option card (small variant). */
function PathOption({
  label, icon: Icon, sub, selected, onSelect,
}: {
  id: SubmissionPath
  label:    string
  icon:     typeof Server
  sub:      string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left
                  transition-all duration-200
        ${selected
          ? 'border-cyan-400 bg-cyan-400/8'
          : 'border-white/10 bg-white/3 hover:border-white/25'}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                       transition-colors
        ${selected ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-400'}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold transition-colors
            ${selected ? 'text-white' : 'text-slate-300'}`}>
            {label}
          </p>
          <div className={`flex-shrink-0 transition-colors
            ${selected ? 'text-cyan-400' : 'text-slate-400'}`}>
            {selected ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sub}</p>
      </div>
    </button>
  )
}

/* ── API submit panel — calls /api/cert-request/submit + /poll/:id ──
 *
 * UX note: the user pastes the CSR they just generated locally in
 * Step 5 (running certreq / openssl on their own machine). A future
 * upgrade is to generate the keypair in-browser with Web Crypto so
 * no local commands are needed — left as a follow-up because key
 * lifecycle (export to PKCS#12, secure deletion) is its own design
 * conversation.
 */
function ApiSubmitPanel({ allowedTemplates }: { allowedTemplates: string[] | null }) {
  const [csr,          setCsr]          = useState('')
  const [templates,    setTemplates]    = useState<string[] | null>(allowedTemplates)
  const [templatesErr, setTemplatesErr] = useState<string | null>(null)
  const [selectedTpl,  setSelectedTpl]  = useState(allowedTemplates?.[0] ?? '')
  const [result,       setResult]       = useState<ApiResult>({ kind: 'idle' })
  // An env-pinned list that arrives after mount replaces whatever was loaded
  // (adjusted during render rather than in an effect).
  const [seenAllowed, setSeenAllowed] = useState(allowedTemplates)
  if (allowedTemplates !== seenAllowed) {
    setSeenAllowed(allowedTemplates)
    if (allowedTemplates && allowedTemplates.length > 0) {
      setTemplates(allowedTemplates)
      if (!selectedTpl) setSelectedTpl(allowedTemplates[0])
    }
  }

  // Load templates from CEP if we don't already have an env-pinned list.
  useEffect(() => {
    if (allowedTemplates && allowedTemplates.length > 0) return
    let cancelled = false
    fetch('/api/cert-request/templates', { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json().catch(() => null) as { templates?: string[]; message?: string } | null
        if (!r.ok) throw new Error(json?.message ?? `HTTP ${r.status}`)
        return json?.templates ?? []
      })
      .then((list) => {
        if (cancelled) return
        setTemplates(list)
        setSelectedTpl((cur) => cur || list[0] || '')
      })
      .catch((err) => { if (!cancelled) setTemplatesErr(err instanceof Error ? err.message : 'Failed to load templates.') })
    return () => { cancelled = true }
  }, [allowedTemplates])

  const submit = useCallback(async () => {
    setResult({ kind: 'submitting' })
    try {
      const r = await fetch('/api/cert-request/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ csr: csr.trim(), templateName: selectedTpl }),
      })
      const json = await r.json().catch(() => null) as
        | { disposition: 'issued'; certificate: string }
        | { disposition: 'pending'; requestId: number }
        | { disposition: 'denied';  reason: string }
        | { error: string; message?: string }
        | null

      if (!r.ok || !json) {
        const msg = (json && 'message' in json && json.message) || `HTTP ${r.status}`
        setResult({ kind: 'error', message: msg })
        return
      }
      if ('disposition' in json) {
        if (json.disposition === 'issued')  setResult({ kind: 'issued',  certificate: json.certificate })
        if (json.disposition === 'pending') setResult({ kind: 'pending', requestId: json.requestId })
        if (json.disposition === 'denied')  setResult({ kind: 'denied',  reason: json.reason })
        return
      }
      setResult({ kind: 'error', message: json.message ?? json.error })
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Network error.' })
    }
  }, [csr, selectedTpl])

  const checkPending = useCallback(async (requestId: number) => {
    setResult({ kind: 'submitting' })
    try {
      const r = await fetch(`/api/cert-request/poll/${requestId}`, { cache: 'no-store' })
      const json = await r.json().catch(() => null) as
        | { disposition: 'issued'; certificate: string }
        | { disposition: 'pending'; requestId: number }
        | { disposition: 'denied';  reason: string }
        | { error: string; message?: string }
        | null
      if (!r.ok || !json) {
        setResult({ kind: 'error', message: (json && 'message' in json && json.message) || `HTTP ${r.status}` })
        return
      }
      if ('disposition' in json) {
        if (json.disposition === 'issued')  setResult({ kind: 'issued',  certificate: json.certificate })
        if (json.disposition === 'pending') setResult({ kind: 'pending', requestId: json.requestId })
        if (json.disposition === 'denied')  setResult({ kind: 'denied',  reason: json.reason })
        return
      }
      setResult({ kind: 'error', message: json.message ?? json.error })
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Network error.' })
    }
  }, [])

  const canSubmit = csr.trim().length > 0 && selectedTpl.length > 0 && result.kind !== 'submitting'

  return (
    <div
      className="rounded-xl border border-white/8 p-5 space-y-5"
      style={{ background: 'rgba(6,11,24,0.65)' }}
    >
      <div className="flex items-center gap-2">
        <Server size={14} className="text-cyan-400" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          API submission
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Paste your CSR (.csr file contents)
        </label>
        <textarea
          value={csr}
          onChange={(e) => setCsr(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={'-----BEGIN CERTIFICATE REQUEST-----\nMIIC...\n-----END CERTIFICATE REQUEST-----'}
          className="w-full px-3 py-2.5 rounded-lg border border-white/10 font-mono text-xs
                     text-slate-200 placeholder:text-slate-400 focus:outline-none
                     focus:border-cyan-400/50 transition-colors"
          style={{ background: 'rgba(6,11,24,0.8)' }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Certificate template
        </label>
        {templatesErr ? (
          <p className="text-xs text-amber-400 flex items-start gap-1.5 leading-relaxed">
            <AlertCircle size={11} className="flex-shrink-0 mt-0.5" /> {templatesErr}
          </p>
        ) : templates === null ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" /> Loading templates from CEP…
          </p>
        ) : templates.length === 0 ? (
          <input
            type="text"
            value={selectedTpl}
            onChange={(e) => setSelectedTpl(e.target.value)}
            placeholder="WebServer"
            className="w-full px-3 py-2.5 rounded-lg border border-white/10 font-mono text-sm
                       text-slate-200 placeholder:text-slate-400 focus:outline-none
                       focus:border-cyan-400/50 transition-colors"
            style={{ background: 'rgba(6,11,24,0.8)' }}
          />
        ) : (
          <select
            value={selectedTpl}
            onChange={(e) => setSelectedTpl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-white/10 text-slate-200 text-sm
                       focus:outline-none focus:border-cyan-400/50 transition-colors
                       bg-[#060b18] cursor-pointer"
          >
            {templates.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      <div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-400 text-[#060b18]
                     font-semibold text-sm hover:bg-cyan-300 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {result.kind === 'submitting'
            ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
            : <><Send size={14} /> Submit to CA</>}
        </button>
      </div>

      {result.kind === 'issued' && <IssuedPanel cert={result.certificate} />}
      {result.kind === 'pending' && (
        <PendingPanel requestId={result.requestId} onCheck={() => checkPending(result.requestId)} />
      )}
      {result.kind === 'denied' && (
        <Callout type="warning">
          The request was denied by the CA: {result.reason}
        </Callout>
      )}
      {result.kind === 'error' && (
        <Callout type="warning">
          {result.message}
        </Callout>
      )}
    </div>
  )
}

function IssuedPanel({ cert }: { cert: string }) {
  const download = () => {
    const blob = new Blob([cert], { type: 'application/x-pem-file' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'apen-issued.crt'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="rounded-lg border border-emerald-400/25 p-4 space-y-3"
         style={{ background: 'rgba(16,185,129,0.05)' }}>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={16} className="text-emerald-400" />
        <p className="text-sm font-semibold text-emerald-200">Certificate issued</p>
      </div>
      <CodeBlock code={cert} />
      <button
        onClick={download}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   bg-emerald-500/15 border border-emerald-400/30 text-emerald-300
                   text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
      >
        <FileDown size={12} /> Download .crt
      </button>
    </div>
  )
}

function PendingPanel({ requestId, onCheck }: { requestId: number; onCheck: () => void }) {
  return (
    <div className="rounded-lg border border-amber-400/25 p-4 space-y-3"
         style={{ background: 'rgba(245,158,11,0.05)' }}>
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-amber-400" />
        <p className="text-sm font-semibold text-amber-200">
          Request pending CA approval — request ID {requestId}
        </p>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        The CA requires admin approval before issuing this certificate. Check back later, or
        click below to poll the CA for the current status.
      </p>
      <button
        onClick={onCheck}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   bg-amber-500/15 border border-amber-400/30 text-amber-200
                   text-xs font-semibold hover:bg-amber-500/25 transition-colors"
      >
        <RefreshCw size={12} /> Check status
      </button>
    </div>
  )
}

/* Original portal-iframe flow, kept verbatim for parity with the
   previous wizard. Renders when the API path isn't available or the
   user explicitly chose the portal path. */
function PortalSubmitPanel() {
  const [iframeFailed, setIframeFailed] = useState(false)

  return (
    <>
      <Callout type="info">
        <strong className="text-slate-200">If the portal does not load below:</strong>{' '}
        the AD Certificate Services site sets <code className="code-inline">X-Frame-Options</code> and
        cannot be embedded by every browser. Use the <em>Open in new tab</em> button to launch
        it directly. Authentication uses your APEN domain credentials.
      </Callout>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={EXTERNAL_URLS.certificateServices}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                     bg-cyan-400 text-[#060b18] font-semibold text-sm
                     hover:bg-cyan-300 transition-colors"
        >
          <ExternalLink size={14} /> Open {EXTERNAL_URL_LABELS.certificateServices} in new tab
        </a>
      </div>

      <div
        className="rounded-xl border border-white/8 overflow-hidden"
        style={{ background: 'rgba(6,11,24,0.7)' }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Embedded portal
          </p>
          <p className="text-xs text-slate-400 font-mono">
            {EXTERNAL_URL_LABELS.certificateServices}
          </p>
        </div>

        {iframeFailed ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle size={28} className="mx-auto text-amber-400/80" />
            <p className="text-sm text-slate-300 font-semibold">
              The portal could not be embedded.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your browser blocked the embed (most commonly via{' '}
              <code className="code-inline text-xs">X-Frame-Options</code>). Use the
              button above to open it in a new tab.
            </p>
          </div>
        ) : (
          <iframe
            src={EXTERNAL_URLS.certificateServices}
            title={EXTERNAL_URL_LABELS.certificateServices}
            className="w-full h-[700px] bg-white"
            referrerPolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            onError={() => setIframeFailed(true)}
          />
        )}
      </div>

      <div className="rounded-xl border border-white/8 p-4 space-y-3"
           style={{ background: 'rgba(6,11,24,0.6)' }}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Submission steps
        </p>
        <ol className="space-y-2">
          {[
            <>Sign in to the portal using your APEN domain credentials.</>,
            <>Select <strong className="text-slate-300">Request a certificate</strong>.</>,
            <>Choose <strong className="text-slate-300">Advanced certificate request</strong>, then <strong className="text-slate-300">Submit a certificate request by using a base-64-encoded CMC or PKCS #10 file</strong>.</>,
            <>Open your <code className="code-inline text-xs">.csr</code> file in a text editor, copy the entire contents (including the BEGIN/END lines), and paste it into the <em className="text-slate-400">Saved Request</em> box.</>,
            <>Select the appropriate <strong className="text-slate-300">Certificate Template</strong> (typically <code className="code-inline text-xs">Web Server</code> or <code className="code-inline text-xs">Workstation Authentication</code>).</>,
            <>Click <strong className="text-slate-300">Submit</strong> and download the issued certificate. Install it on your server alongside the existing private key.</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-400/15 border border-cyan-400/30
                               text-cyan-400 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-xs text-slate-400 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}

/* ─── Main wizard export ─────────────────────────────────── */
export function CertRequestWizard() {
  const [step,           setStep]           = useState(1)
  const [mode,           setMode]           = useState<RequestMode | null>(null)
  const [certText,       setCertText]       = useState('')
  const [os,             setOs]             = useState<OS>(null)
  const [certType,       setCertType]       = useState<CertType>('server')
  const [subjectEntries, setSubjectEntries] = useState<SubjectEntry[]>([])
  const [sanEntries,     setSanEntries]     = useState<SANEntry[]>([])
  const [keyPath,        setKeyPath]        = useState('')

  const steps = useMemo(() => buildSteps(mode), [mode])

  const handleReset = () => {
    setStep(1)
    setMode(null)
    setCertText('')
    setOs(null)
    setCertType('server')
    setSubjectEntries([])
    setSanEntries([])
    setKeyPath('')
  }

  const handleSetOs = (newOs: OS) => {
    if (newOs !== os && mode !== 'renew') {
      setCertType('server')
      setSubjectEntries([])
      setSanEntries([])
    }
    setOs(newOs)
  }

  const hasUserInput =
    mode !== null || certText.length > 0 || os !== null ||
    subjectEntries.length > 0 || sanEntries.length > 0 || keyPath.length > 0

  // Step indexes vary by mode. Helper to centralise the navigation.
  const renderStep = () => {
    if (mode === null || step === 1) {
      return (
        <StepChoosePath
          mode={mode}
          setMode={(m) => { setMode(m); /* reset OS so user picks fresh */ if (m === 'enroll') setOs(null) }}
          onNext={() => setStep(2)}
        />
      )
    }

    if (mode === 'renew') {
      switch (step) {
        case 2:
          return (
            <StepPasteCert
              certText={certText}
              setCertText={setCertText}
              onApply={({ subject, sans }) => {
                setSubjectEntries(subject)
                setSanEntries(sans)
                setStep(3)
              }}
              onBack={() => setStep(1)}
            />
          )
        case 3:
          return (
            <StepSelectOS
              os={os}
              setOs={(v) => setOs(v)} /* don't blow away renewal subject when OS changes */
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )
        case 4:
          return (
            <StepDetails
              os={os} mode="renew"
              subjectEntries={subjectEntries} setSubjectEntries={setSubjectEntries}
              sanEntries={sanEntries}         setSanEntries={setSanEntries}
              certType={certType}             setCertType={setCertType}
              keyPath={keyPath}               setKeyPath={setKeyPath}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )
        case 5:
          return (
            <StepGenerate
              os={os} mode="renew"
              subjectEntries={subjectEntries}
              sanEntries={sanEntries}
              certType={certType}
              keyPath={keyPath}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )
        case 6:
          return <StepSubmit onBack={() => setStep(5)} />
        default:
          return null
      }
    }

    // mode === 'enroll'
    switch (step) {
      case 2:
        return (
          <StepSelectOS
            os={os} setOs={handleSetOs}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )
      case 3:
        return (
          <StepDetails
            os={os} mode="enroll"
            subjectEntries={subjectEntries} setSubjectEntries={setSubjectEntries}
            sanEntries={sanEntries}         setSanEntries={setSanEntries}
            certType={certType}             setCertType={setCertType}
            keyPath={keyPath}               setKeyPath={setKeyPath}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )
      case 4:
        return (
          <StepGenerate
            os={os} mode="enroll"
            subjectEntries={subjectEntries}
            sanEntries={sanEntries}
            certType={certType}
            keyPath={keyPath}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )
      case 5:
        return <StepSubmit onBack={() => setStep(4)} />
      default:
        return null
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Cert Request Wizard"
        subtitle="Enroll a new certificate or renew an existing one. Generates a ready-to-use certreq INF (Windows) or OpenSSL config (Linux) and walks you through submission to the APEN Certificate Authority."
        badge="Certificate Services"
        backHref="/certsrv"
        backColor="cyan"
        logo={CERTSRV_PAGE_LOGOS['/certsrv/request']}
      />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex-1 min-w-0">
            <StepBar steps={steps} current={step} />
          </div>
          {hasUserInput && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-red-400/10 border border-red-400/20 text-red-400
                         text-xs font-semibold hover:bg-red-400/20 transition-colors
                         flex-shrink-0"
            >
              <RotateCcw size={13} />
              Clear Form
            </button>
          )}
        </div>

        <div
          className="rounded-2xl border border-white/8 p-6 sm:p-8"
          style={{ background: 'rgba(10,15,35,0.75)', backdropFilter: 'blur(16px)' }}
        >
          {renderStep()}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          Having trouble? Contact the CESC helpdesk via{' '}
          <a
            href={EXTERNAL_URLS.trackItSelfService}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400/70 hover:text-cyan-400 hover:underline transition-colors"
          >
            {EXTERNAL_URL_LABELS.trackItSelfService}
          </a>.
        </p>
      </div>
    </div>
  )
}
