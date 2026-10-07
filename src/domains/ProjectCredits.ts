export type ProjectCreditContactKind =
  | 'github'
  | 'linkedin'
  | 'portfolio'
  | 'email'
  | 'external';

export type ProjectCreditStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ProjectCreditAuditAction =
  | 'DRAFT_CREATED'
  | 'DRAFT_SAVED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'RESTORED'
  | 'PHOTO_UPDATED'
  | 'PHOTO_REMOVED';

export interface ProjectCreditContact {
  id?: string;
  kind: ProjectCreditContactKind;
  label: string;
  href: string;
  confirmed?: boolean;
  order?: number;
}

export interface ProjectCreditParticipation {
  id?: string;
  semester: string;
  course?: string | null;
  roles: string[];
  contribution?: string | null;
  confirmed?: boolean;
  order?: number;
}

export interface ProjectCreditContributor {
  id: string;
  name: string;
  photoUrl?: string | null;
  participations: ProjectCreditParticipation[];
  contacts: ProjectCreditContact[];
}

export interface ProjectCreditsResponse {
  contributors: ProjectCreditContributor[];
}

export interface AdminProjectContributorSummary {
  id: string;
  name: string;
  status: ProjectCreditStatus;
  draftVersion: number;
  publishedVersion: number | null;
  hasDraftChanges: boolean;
  photoUrl?: string | null;
  semesters: string[];
  roles: string[];
  publishedAt?: string | null;
  updatedAt: string;
}

export interface AdminProjectContributorDetail {
  id: string;
  name: string;
  status: ProjectCreditStatus;
  draftVersion: number;
  publishedVersion: number | null;
  profileConfirmed: boolean;
  photoConfirmed: boolean;
  photoUrl?: string | null;
  hasPhoto: boolean;
  archiveReason?: string | null;
  archivedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  participations: ProjectCreditParticipation[];
  links: ProjectCreditContact[];
  publishedSnapshot?: unknown | null;
}

export interface AdminAuditLogItem {
  id: string;
  action: ProjectCreditAuditAction;
  performedByName: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  beforeSnapshot?: unknown | null;
  afterSnapshot?: unknown | null;
}
