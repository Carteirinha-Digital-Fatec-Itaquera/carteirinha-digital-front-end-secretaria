export type CheckpointType = "check-in" | "check-out";

export type CheckpointStatus =
  | "open"
  | "closed"
  | "finished";

export interface EventResponse {
  id: string;
  title: string;
  speaker: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  workload: number;

  checkInStatus: CheckpointStatus;
  checkOutStatus: CheckpointStatus;

  entries?: number;
  exits?: number;
  confirmedAttendances?: number;
}

export interface CheckpointResponse {
  status: CheckpointStatus;
}

export interface QrResponse {
  token: string;
}

async function handleResponse<T>(
  response: Response
): Promise<T> {
  if (!response.ok) {
    let message = "Erro na requisição.";

    try {
      const data = await response.json();

      if (data?.message) {
        message = data.message;
      }
    } catch {
      // Resposta sem JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getEvent(
  eventId: string
): Promise<EventResponse> {
  const response = await fetch(
    `/events/${eventId}`
  );

  return handleResponse<EventResponse>(response);
}

export async function openCheckpoint(
  eventId: string,
  type: CheckpointType
): Promise<CheckpointResponse> {
  const response = await fetch(
    `/events/${eventId}/checkpoints/${type}/open`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return handleResponse<CheckpointResponse>(response);
}

export async function closeCheckpoint(
  eventId: string,
  type: CheckpointType
): Promise<CheckpointResponse> {
  const response = await fetch(
    `/events/${eventId}/checkpoints/${type}/close`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return handleResponse<CheckpointResponse>(response);
}

export async function getCheckpointQr(
  eventId: string,
  type: CheckpointType
): Promise<QrResponse> {
  const response = await fetch(
    `/events/${eventId}/checkpoints/${type}/qr`
  );

  return handleResponse<QrResponse>(response);
}