import { apiRequest } from '../config/apiRequest';
import type { ProjectCreditsResponse } from '../../domains/ProjectCredits';

export function getProjectCredits(signal?: AbortSignal): Promise<ProjectCreditsResponse> {
  return apiRequest<ProjectCreditsResponse>('/project-credits', {
    authenticated: false,
    cache: 'no-store',
    signal,
  });
}
