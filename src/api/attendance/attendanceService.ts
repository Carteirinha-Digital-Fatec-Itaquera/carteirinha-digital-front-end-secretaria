import { apiRequest, type RequestOptions } from '../config/apiRequest';
import type { AttendanceView, AttendanceSummary } from '../../domains/Attendance';

export async function getEventAttendances(
  id: string,
  options?: RequestOptions
): Promise<AttendanceView[]> {
  return apiRequest<AttendanceView[]>(
    `/events/${encodeURIComponent(id)}/attendances`,
    {
      method: 'GET',
      signal: options?.signal,
    }
  );
}

export async function getAttendanceSummary(
  id: string,
  options?: RequestOptions
): Promise<AttendanceSummary> {
  return apiRequest<AttendanceSummary>(
    `/events/${encodeURIComponent(id)}/attendances/summary`,
    {
      method: 'GET',
      signal: options?.signal,
    }
  );
}
