import type { IsoDateTime, Uuid } from './Event';

export type CheckpointType = 'CHECK_IN' | 'CHECK_OUT';

export interface CheckpointView {
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
}

export interface AttendanceQrResponse {
  qrToken: string;
  expiresInSeconds: 20;
  expiresAt: IsoDateTime;
  checkpointVersion: number;
}
