import { apiRequest, type RequestOptions } from '../config/apiRequest';
import type {
  EventView,
  CreateEventRequest,
  UpdateEventRequest,
  CancelEventRequest,
} from '../../domains/Event';

export async function getEvents(options?: RequestOptions): Promise<EventView[]> {
  return apiRequest<EventView[]>('/events', {
    method: 'GET',
    signal: options?.signal,
  });
}

export async function getEvent(
  id: string,
  options?: RequestOptions
): Promise<EventView> {
  return apiRequest<EventView>(`/events/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal: options?.signal,
  });
}

export async function createEvent(
  body: CreateEventRequest,
  options?: RequestOptions
): Promise<EventView> {
  return apiRequest<EventView>('/events', {
    method: 'POST',
    body: JSON.stringify(body),
    signal: options?.signal,
  });
}

export async function updateEvent(
  id: string,
  body: UpdateEventRequest,
  options?: RequestOptions
): Promise<EventView> {
  return apiRequest<EventView>(`/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    signal: options?.signal,
  });
}

export async function cancelEvent(
  id: string,
  body: CancelEventRequest,
  options?: RequestOptions
): Promise<EventView> {
  return apiRequest<EventView>(`/events/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: options?.signal,
  });
}
