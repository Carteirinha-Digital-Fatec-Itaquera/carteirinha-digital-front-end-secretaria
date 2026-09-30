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

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: 'CANCELLED';
}
