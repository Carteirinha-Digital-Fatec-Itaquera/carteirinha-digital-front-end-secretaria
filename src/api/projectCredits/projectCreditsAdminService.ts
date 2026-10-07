import { apiRequest } from '../config/apiRequest';
import type {
  AdminAuditLogItem,
  AdminProjectContributorDetail,
  AdminProjectContributorSummary,
  ProjectCreditContact,
  ProjectCreditStatus,
} from '../../domains/ProjectCredits';

export interface AdminContributorsListResponse {
  contributors: AdminProjectContributorSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminContributorsQuery {
  search?: string;
  status?: ProjectCreditStatus | 'ALL';
  semester?: string;
  page?: number;
  limit?: number;
}

export interface CreateContributorDto {
  name: string;
  profileConfirmed?: boolean;
  photoConfirmed?: boolean;
}

export interface UpdateContributorDto {
  expectedVersion: number;
  name?: string;
  profileConfirmed?: boolean;
  photoConfirmed?: boolean;
  participations?: Array<{
    semester: string;
    course?: string | null;
    roles: string[];
    contribution?: string | null;
    confirmed?: boolean;
    order?: number;
  }>;
  links?: Array<{
    kind: ProjectCreditContact['kind'];
    label: string;
    url: string;
    confirmed?: boolean;
    order?: number;
  }>;
}

export interface PublishContributorDto {
  expectedVersion: number;
  profileConfirmed: boolean;
  photoConfirmed?: boolean;
}

export interface ArchiveContributorDto {
  expectedVersion: number;
  reason?: string;
}

export interface RestoreContributorDto {
  expectedVersion: number;
}

export interface ContributorHistoryResponse {
  history: AdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listAdminContributors(
  query: AdminContributorsQuery = {},
  signal?: AbortSignal,
): Promise<AdminContributorsListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status && query.status !== 'ALL') params.set('status', query.status);
  if (query.semester && query.semester !== 'ALL') params.set('semester', query.semester);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const qs = params.toString();
  const path = qs ? `/project-credits/admin/contributors?${qs}` : '/project-credits/admin/contributors';

  return apiRequest<AdminContributorsListResponse>(path, {
    method: 'GET',
    authenticated: true,
    signal,
  });
}

export async function getAdminContributor(
  id: string,
  signal?: AbortSignal,
): Promise<AdminProjectContributorDetail> {
  return apiRequest<AdminProjectContributorDetail>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      authenticated: true,
      signal,
    },
  );
}

export async function createContributorDraft(
  dto: CreateContributorDto,
): Promise<AdminProjectContributorDetail> {
  return apiRequest<AdminProjectContributorDetail>('/project-credits/admin/contributors', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(dto),
  });
}

export async function updateContributor(
  id: string,
  dto: UpdateContributorDto,
): Promise<AdminProjectContributorDetail> {
  return apiRequest<AdminProjectContributorDetail>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify(dto),
    },
  );
}

export async function publishContributor(
  id: string,
  dto: PublishContributorDto,
): Promise<AdminProjectContributorDetail> {
  return apiRequest<AdminProjectContributorDetail>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}/publish`,
    {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(dto),
    },
  );
}

export async function archiveContributor(
  id: string,
  dto: ArchiveContributorDto,
): Promise<AdminProjectContributorDetail> {
  return apiRequest<AdminProjectContributorDetail>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}/archive`,
    {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(dto),
    },
  );
}

export async function restoreContributor(
  id: string,
  dto: RestoreContributorDto,
): Promise<AdminProjectContributorDetail> {
  return apiRequest<AdminProjectContributorDetail>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}/restore`,
    {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(dto),
    },
  );
}

export async function uploadContributorPhoto(
  id: string,
  file: File,
  expectedVersion: number,
): Promise<{ photoUrl: string; draftVersion: number }> {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('expectedVersion', String(expectedVersion));

  return apiRequest<{ photoUrl: string; draftVersion: number }>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}/photo`,
    {
      method: 'POST',
      authenticated: true,
      body: formData,
    },
  );
}

export async function removeContributorPhoto(
  id: string,
  expectedVersion: number,
): Promise<{ draftVersion: number }> {
  return apiRequest<{ draftVersion: number }>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}/photo`,
    {
      method: 'DELETE',
      authenticated: true,
      body: JSON.stringify({ expectedVersion }),
    },
  );
}

export async function getContributorHistory(
  id: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal,
): Promise<ContributorHistoryResponse> {
  return apiRequest<ContributorHistoryResponse>(
    `/project-credits/admin/contributors/${encodeURIComponent(id)}/history?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      authenticated: true,
      signal,
    },
  );
}
