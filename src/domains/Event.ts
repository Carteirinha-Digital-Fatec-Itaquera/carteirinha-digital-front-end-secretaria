export type EventStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type IsoDateTime = string;
export type Uuid = string;

import type { CheckpointView } from './Checkpoint';

export interface EventView {
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
  checkpoints: CheckpointView[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  speaker: string;
  location: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  workloadMinutes: number;
  certificateEnabled?: boolean;
}

export interface CancelEventRequest {
  reason: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: 'CANCELLED';
  cancelReason?: string;
}
