import type { IsoDateTime, Uuid } from './Event';

export type CheckpointType = 'CHECK_IN' | 'CHECK_OUT';

export interface CheckpointView {
  closesAt?: IsoDateTime | null;
  id: Uuid;
  eventId: Uuid;
  type: CheckpointType;
  isOpen: boolean;
  version: number;
  openedAt: IsoDateTime | null;
  closedAt: IsoDateTime | null;
}

export interface CheckpointMutationResponse {
  eventId: Uuid;
  type: CheckpointType;
  isOpen: boolean;
  version: number;
  openedAt: IsoDateTime | null;
  closedAt: IsoDateTime | null;
  closesAt?: IsoDateTime | null;
}

export interface AttendanceQrResponse {
  permanent?: boolean;
  qrToken: string;
  qrUrl?: string;
  serverTime?: IsoDateTime;
  expiresInSeconds: number | null;
  expiresAt: IsoDateTime | null;
  checkpointVersion: number;
}
