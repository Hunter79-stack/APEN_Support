/**
 * Minimal X.509 parsing for the renewal flow.
 *
 * Accepts either a PEM-encoded certificate (-----BEGIN CERTIFICATE-----)
 * or the dumped text output of `openssl x509 -text -noout`, and pulls out
 * the Subject DN and Subject Alternative Names. That is all the renewal
 * wizard needs in order to pre-fill the certificate-details form — the
 * private key never crosses the wire.
 *
 * The ASN.1 walker here is the bare minimum: it descends to the Subject
 * RDN sequence by counting siblings inside the tbsCertificate, then
 * scans the v3 extensions for the SubjectAltName extension (OID
 * 2.5.29.17). It does not validate signatures or interpret time fields.
 */
import type { SubjectEntry, SANEntry, SubjectType } from '@/lib/types/cert-types'

/* ─── OID → Subject field-type mapping ───────────────────── */
const SUBJECT_OID_TO_TYPE: Record<string, SubjectType> = {
  '2.5.4.3':  'CN',   // commonName
  '2.5.4.10': 'O',    // organizationName
  '2.5.4.11': 'OU',   // organizationalUnitName
  '2.5.4.7':  'L',    // localityName
  '2.5.4.8':  'ST',   // stateOrProvinceName
  '2.5.4.6':  'C',    // countryName
}

const TEXT_TO_TYPE: Record<string, SubjectType> = {
  CN: 'CN', commonName: 'CN',
  O:  'O',  organizationName: 'O',
  OU: 'OU', organizationalUnitName: 'OU',
  L:  'L',  localityName: 'L',
  ST: 'ST', stateOrProvinceName: 'ST',
  S:  'ST', // openssl sometimes prints "S=" for state
  C:  'C',  countryName: 'C',
}

export interface ParsedCert {
  subject: SubjectEntry[]
  sans:    SANEntry[]
  /** True if anything was successfully extracted. */
  ok:      boolean
  /** Human-readable error when nothing recognisable was found. */
  error?:  string
}

/* ─── Public entry point ─────────────────────────────────── */
export function parseCertificate(input: string): ParsedCert {
  const trimmed = input.trim()
  if (!trimmed) {
    return { subject: [], sans: [], ok: false, error: 'Paste a certificate or its openssl text output.' }
  }

  if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
    try {
      return parsePem(trimmed)
    } catch (err) {
      return {
        subject: [], sans: [], ok: false,
        error: err instanceof Error ? err.message : 'Could not parse PEM certificate.',
      }
    }
  }

  // Fall back to text output of `openssl x509 -text` or `certutil -dump`.
  return parseOpensslText(trimmed)
}

/* ─── PEM (DER ASN.1) parser ─────────────────────────────── */
function parsePem(pem: string): ParsedCert {
  const match = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/)
  if (!match) throw new Error('No certificate block found.')

  const b64 = match[1].replace(/\s+/g, '')
  let bytes: Uint8Array
  try {
    const bin = atob(b64)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch {
    throw new Error('Certificate is not valid base64.')
  }

  // Top SEQUENCE: Certificate ::= { tbsCertificate, signatureAlg, signature }
  const top = readTLV(bytes, 0)
  if (top.tag !== 0x30) throw new Error('Top-level structure is not a SEQUENCE.')
  const tbs = readTLV(bytes, top.contentStart)
  if (tbs.tag !== 0x30) throw new Error('tbsCertificate is not a SEQUENCE.')

  // tbsCertificate children:
  //   [0] version (optional, explicit), serialNumber, signature,
  //   issuer, validity, subject, subjectPublicKeyInfo,
  //   [3] extensions (optional, explicit)
  const children = readChildren(bytes, tbs.contentStart, tbs.contentEnd)

  // Skip optional [0] version explicit tag.
  let idx = 0
  if (children[idx] && children[idx].tag === 0xa0) idx++

  // serialNumber, signatureAlg, issuer, validity → skip
  idx += 4 // serial, sig-alg, issuer, validity
  const subject = children[idx]
  if (!subject || subject.tag !== 0x30) {
    throw new Error('Could not locate Subject in certificate.')
  }
  idx++

  const subjectEntries = parseRDN(bytes, subject)

  // Extensions are [3] explicit, which appears after subjectPublicKeyInfo
  // and any optional uniqueIDs. Find any child with tag 0xa3.
  const sans: SANEntry[] = []
  for (let i = idx; i < children.length; i++) {
    if (children[i].tag === 0xa3) {
      const extsSeq = readTLV(bytes, children[i].contentStart)
      if (extsSeq.tag !== 0x30) continue
      const extList = readChildren(bytes, extsSeq.contentStart, extsSeq.contentEnd)
      for (const ext of extList) {
        if (ext.tag !== 0x30) continue
        const extKids = readChildren(bytes, ext.contentStart, ext.contentEnd)
        if (extKids.length === 0 || extKids[0].tag !== 0x06) continue
        const oid = readOID(bytes, extKids[0])
        if (oid !== '2.5.29.17') continue
        // Last child of an Extension is an OCTET STRING wrapping the value.
        const valueOctet = extKids[extKids.length - 1]
        if (valueOctet.tag !== 0x04) continue
        const sanSeq = readTLV(bytes, valueOctet.contentStart)
        if (sanSeq.tag !== 0x30) continue
        const names = readChildren(bytes, sanSeq.contentStart, sanSeq.contentEnd)
        for (const gn of names) {
          // GeneralName CHOICE: dNSName [2] IA5String, iPAddress [7] OCTET STRING
          if (gn.tag === 0x82) {
            sans.push({ type: 'DNS', value: readAsciiBytes(bytes, gn.contentStart, gn.contentEnd) })
          } else if (gn.tag === 0x87) {
            const ipBytes = bytes.subarray(gn.contentStart, gn.contentEnd)
            if (ipBytes.length === 4) {
              sans.push({ type: 'IP', value: Array.from(ipBytes).join('.') })
            }
          }
        }
      }
      break
    }
  }

  return {
    subject: subjectEntries,
    sans,
    ok: subjectEntries.length > 0,
    error: subjectEntries.length === 0 ? 'No Subject fields found in certificate.' : undefined,
  }
}

/* ─── ASN.1 helpers ──────────────────────────────────────── */
interface TLV { tag: number; contentStart: number; contentEnd: number; nextStart: number }

function readTLV(bytes: Uint8Array, offset: number): TLV {
  if (offset >= bytes.length) throw new Error('Truncated ASN.1.')
  const tag = bytes[offset]
  let i = offset + 1
  const lenByte = bytes[i++]
  let length: number
  if ((lenByte & 0x80) === 0) {
    length = lenByte
  } else {
    const n = lenByte & 0x7f
    if (n === 0 || n > 4) throw new Error('Unsupported ASN.1 length.')
    length = 0
    for (let k = 0; k < n; k++) length = (length << 8) | bytes[i++]
  }
  return { tag, contentStart: i, contentEnd: i + length, nextStart: i + length }
}

function readChildren(bytes: Uint8Array, start: number, end: number): TLV[] {
  const out: TLV[] = []
  let pos = start
  while (pos < end) {
    const tlv = readTLV(bytes, pos)
    out.push(tlv)
    pos = tlv.nextStart
  }
  return out
}

function readOID(bytes: Uint8Array, tlv: TLV): string {
  const buf = bytes.subarray(tlv.contentStart, tlv.contentEnd)
  if (buf.length === 0) return ''
  const first = Math.floor(buf[0] / 40)
  const second = buf[0] % 40
  const parts: number[] = [first, second]
  let acc = 0
  for (let i = 1; i < buf.length; i++) {
    acc = (acc << 7) | (buf[i] & 0x7f)
    if ((buf[i] & 0x80) === 0) {
      parts.push(acc)
      acc = 0
    }
  }
  return parts.join('.')
}

function readUtf(bytes: Uint8Array, start: number, end: number): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(start, end))
}

function readAsciiBytes(bytes: Uint8Array, start: number, end: number): string {
  let s = ''
  for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i])
  return s
}

/** Parse a Name (RDN SEQUENCE) and return our SubjectEntry shape. */
function parseRDN(bytes: Uint8Array, name: TLV): SubjectEntry[] {
  const entries: SubjectEntry[] = []
  const rdns = readChildren(bytes, name.contentStart, name.contentEnd)
  for (const rdn of rdns) {
    if (rdn.tag !== 0x31) continue // SET OF AttributeTypeAndValue
    const atvs = readChildren(bytes, rdn.contentStart, rdn.contentEnd)
    for (const atv of atvs) {
      if (atv.tag !== 0x30) continue
      const pair = readChildren(bytes, atv.contentStart, atv.contentEnd)
      if (pair.length < 2 || pair[0].tag !== 0x06) continue
      const oid = readOID(bytes, pair[0])
      const type = SUBJECT_OID_TO_TYPE[oid]
      if (!type) continue
      const valueTlv = pair[1]
      // Subject values are usually PrintableString (0x13), UTF8String (0x0c), or IA5String (0x16).
      const value = readUtf(bytes, valueTlv.contentStart, valueTlv.contentEnd).trim()
      if (value) entries.push({ type, value })
    }
  }
  return entries
}

/* ─── Text-output parser (openssl x509 -text / certutil -dump) ── */
function parseOpensslText(text: string): ParsedCert {
  // Subject line: "Subject: C=US, ST=Virginia, L=Arlington, O=Example, CN=server.example.mil"
  // certutil uses "Subject:" followed by indented "CN=...", one per line.
  const subject: SubjectEntry[] = []

  const subjectLineMatch = text.match(/^\s*Subject\s*:\s*(.+?)\s*$/m)
  if (subjectLineMatch && subjectLineMatch[1].includes('=')) {
    const dn = subjectLineMatch[1]
    for (const part of dn.split(/,\s*|\/\s*/)) {
      const m = part.match(/^\s*([A-Za-z]+)\s*=\s*(.+?)\s*$/)
      if (m) {
        const t = TEXT_TO_TYPE[m[1]]
        if (t) subject.push({ type: t, value: m[2] })
      }
    }
  }

  // certutil style: a Subject: header, then indented "CN=...\nOU=...\n..."
  if (subject.length === 0) {
    const certutilBlock = text.match(/Subject:\s*\n([\s\S]+?)(?:\n\s*\n|\n[A-Z])/)
    if (certutilBlock) {
      for (const line of certutilBlock[1].split('\n')) {
        const m = line.match(/^\s*([A-Za-z]+)\s*=\s*(.+?)\s*$/)
        if (m) {
          const t = TEXT_TO_TYPE[m[1]]
          if (t) subject.push({ type: t, value: m[2] })
        }
      }
    }
  }

  // SANs: "X509v3 Subject Alternative Name:" block, next non-empty indented line.
  const sans: SANEntry[] = []
  const sanMatch = text.match(/Subject Alternative Name\s*:\s*[^\n]*\n\s+([^\n]+)/i)
  if (sanMatch) {
    for (const part of sanMatch[1].split(/,\s*/)) {
      const dns = part.match(/DNS\s*:\s*([^\s,]+)/i)
      const ip  = part.match(/IP(?:\s*Address)?\s*:\s*([0-9.]+)/i)
      if (dns) sans.push({ type: 'DNS', value: dns[1] })
      else if (ip) sans.push({ type: 'IP', value: ip[1] })
    }
  }

  return {
    subject,
    sans,
    ok: subject.length > 0,
    error: subject.length === 0
      ? 'Could not find Subject fields. Paste either the PEM certificate (BEGIN CERTIFICATE…) or the full output of `openssl x509 -text -noout`.'
      : undefined,
  }
}
