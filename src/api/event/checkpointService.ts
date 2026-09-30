import { apiRequest, type RequestOptions } from '../config/apiRequest';
import type {
  CheckpointType,
  CheckpointMutationResponse,
  AttendanceQrResponse,
} from '../../domains/Checkpoint';
import { getEvent } from './eventService';

export { getEvent };

function mapCheckpointType(type: CheckpointType): 'check-in' | 'check-out' {
  if (type === 'CHECK_IN') return 'check-in';
  if (type === 'CHECK_OUT') return 'check-out';
  throw new Error(`Tipo de checkpoint inválido: ${type}`);
}

export async function openCheckpoint(
  id: string,
  type: CheckpointType,
  options?: RequestOptions
): Promise<CheckpointMutationResponse> {
  const typeParam = mapCheckpointType(type);
  return apiRequest<CheckpointMutationResponse>(
    `/events/${encodeURIComponent(id)}/checkpoints/${typeParam}/open`,
    {
      method: 'POST',
      signal: options?.signal,
    }
  );
}

export async function closeCheckpoint(
  id: string,
  type: CheckpointType,
  options?: RequestOptions
): Promise<CheckpointMutationResponse> {
  const typeParam = mapCheckpointType(type);
  return apiRequest<CheckpointMutationResponse>(
    `/events/${encodeURIComponent(id)}/checkpoints/${typeParam}/close`,
    {
      method: 'POST',
      signal: options?.signal,
    }
  );
}

export async function getCheckpointQr(
  id: string,
  type: CheckpointType,
  options?: RequestOptions
): Promise<AttendanceQrResponse> {
  const typeParam = mapCheckpointType(type);
  return apiRequest<AttendanceQrResponse>(
    `/events/${encodeURIComponent(id)}/checkpoints/${typeParam}/qr`,
    {
      method: 'GET',
      signal: options?.signal,
    }
  );
}
