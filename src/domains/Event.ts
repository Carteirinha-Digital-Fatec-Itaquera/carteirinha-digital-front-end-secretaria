export type EventStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type IsoDateTime = string;
export type Uuid = string;

import type { CheckpointView } from './Checkpoint';

export interface GeoPolicy {
  latitude: number;
  longitude: number;
  radius: number;
  maxAccuracy: number;
}

export interface CertificateRolePolicy {
  templateId: string;
  signerIds: string[];
}

export interface CertificatePolicies {
  ATTENDEE?: CertificateRolePolicy;
  SPEAKER?: CertificateRolePolicy;
  [role: string]: CertificateRolePolicy | undefined;
}

export interface EventView {
  locationEnabled?: boolean;
  attendanceMode?: "FINAL_ONLY" | "TWO_PHASE";
  id: Uuid;
  title: string;
  description: string | null;
  speaker: string;
  location: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  workloadMinutes: number;
  status: EventStatus;
  cancelReason: string | null;
  cancelledAt: IsoDateTime | null;
  cancelledById: number | null;
  certificateEnabled: boolean;
  visitorsAllowed?: boolean;
  organizerCourse?: string | null;
  promoter?: string | null;
  windowMinutes?: number | null;
  geoPolicy?: GeoPolicy | null;
  certificatePolicies?: CertificatePolicies | null;
  seriesId?: string | null;
  checkpoints: CheckpointView[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateEventRequest {
  locationEnabled?: boolean;
  title: string;
  description?: string;
  speaker: string;
  location: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  workloadMinutes: number;
  certificateEnabled?: boolean;
  visitorsAllowed?: boolean;
  organizerCourse?: string | null;
  promoter?: string | null;
  windowMinutes?: number | null;
  geoPolicy?: GeoPolicy | null;
  certificatePolicies?: CertificatePolicies | null;
  seriesId?: string | null;
  attendeeTemplateId?: string;
  speakerTemplateId?: string;
  signerIds?: string[];
  speakerSignerIds?: string[];
}

export interface CancelEventRequest {
  reason: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: 'CANCELLED';
  cancelReason?: string;
}

