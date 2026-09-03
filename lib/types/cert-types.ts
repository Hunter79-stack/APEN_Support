/**
 * Shared types for the Cert Request wizard and the X.509 parser.
 *
 * Kept in lib/ so both client components and the parsing helper can
 * import them without dragging in any React.
 */

export type OS          = 'windows' | 'el' | 'ubuntu' | null
export type SubjectType = 'CN' | 'O' | 'OU' | 'L' | 'ST' | 'C'
export type SANType     = 'DNS' | 'IP'
export type CertType    = 'server' | 'workstation' | 'webserver'
export type RequestMode = 'enroll' | 'renew'

export interface SubjectEntry { type: SubjectType; value: string }
export interface SANEntry     { type: SANType;     value: string }
