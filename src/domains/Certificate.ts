import type { IsoDateTime, Uuid } from './Event';

export interface CertificateSnapshot {
  studentName: string;
  studentRa: string;
  course: string;
  eventTitle: string;
  eventDate: string;
  workload: string;
  speaker: string;
  institution: string;
}

export interface CertificateView {
  id: Uuid;
  eventId: Uuid;
  attendanceId: Uuid;
  verificationCode: string;
  payloadSnapshot: CertificateSnapshot;
  issuedAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
}

export interface CertificateListItem {
  id: Uuid;
  eventId: Uuid;
  verificationCode: string;
  eventTitle: string;
  eventDate: string;
  workload: string;
  issuedAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
}

export interface CertificateVerificationValid {
  valid: true;
  code: string;
  studentName: string;
  eventTitle: string;
  eventDate: string;
  workload: string;
  issuedAt: IsoDateTime;
  institution: string;
}

export interface CertificateVerificationRevoked {
  valid: false;
  code: string;
  revoked: true;
  message: string;
}

export type CertificateVerificationResponse =
  | CertificateVerificationValid
  | CertificateVerificationRevoked;
