import { apiRequest } from '../config/apiRequest';

export interface AssignmentInput {
  title: string;
  startsOn?: string;
  validUntil?: string;
}
export interface EmployeeInput {
  name: string;
  socialName?: string;
  email: string;
  registrationNumber: string;
  rg?: string;
  admissionDate: string;
  assignments: AssignmentInput[];
}
type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
export type DeliveryState = 'PENDING' | 'ACCEPTED' | 'FAILED' | 'UNKNOWN';
interface EmployeeIdentity {
  id: string;
  name: string;
  displayName: string;
  email: string;
  registrationNumber: string | null;
  accountStatus: AccountStatus;
}
export interface EmployeeItem extends EmployeeIdentity {
  assignmentTitles: string[];
}
export interface EmployeeDetails extends EmployeeIdentity {
  socialName: string | null;
  rg: string | null;
  admissionDate: string;
  version: number;
  assignments: Array<{
    id: string;
    title: string;
    startsOn: string | null;
    validUntil: string | null;
    effectiveStatus: 'ACTIVE' | 'FUTURE' | 'EXPIRED' | 'ENDED' | 'ARCHIVED';
  }>;
}
export interface AccessStatus {
  passwordDefined: boolean;
  firstAccessMethod?: 'REGISTRATION_EMAIL' | 'EMAIL_ONLY' | null;
  lastLoginAt: string | null;
  lastAccessRequestAt: string | null;
  lastDeliveryState: DeliveryState | null;
}
export interface InviteResult {
  requested: true;
  deliveryState: DeliveryState;
  requestedAt: string;
}
interface EmployeePage {
  items: EmployeeItem[];
  nextCursor: string | null;
}

const root = '/funcionarios';
const employeePath = (id: string) => root + '/' + encodeURIComponent(id);

export function listEmployees(query: string, cursor: string | null, signal?: AbortSignal, includeArchived = false) {
  const filters = new URLSearchParams({ limit: '25' });
  if (query) filters.set('q', query);
  if (cursor) filters.set('cursor', cursor);
  if (includeArchived) filters.set('includeArchived', 'true');
  return apiRequest<EmployeePage>(root + '?' + filters, { signal });
}

export function createEmployee(input: EmployeeInput, requestId: string, signal?: AbortSignal) {
  return apiRequest<EmployeeDetails>(root, { method: 'POST', body: JSON.stringify({ ...input, requestId }), signal });
}

export function getEmployee(id: string, signal?: AbortSignal) {
  return apiRequest<EmployeeDetails>(employeePath(id), { signal });
}

export function getEmployeeAccess(id: string, signal?: AbortSignal) {
  return apiRequest<AccessStatus>(employeePath(id) + '/acesso', { signal });
}

export function inviteEmployee(id: string, requestId: string, expectedVersion: number, signal?: AbortSignal) {
  return apiRequest<InviteResult>(employeePath(id) + '/convite', {
    method: 'POST', body: JSON.stringify({ requestId, expectedVersion }), signal,
  });
}

export type VersionedReason = { expectedVersion: number; reason: string };
export type EmployeePatch = Partial<Pick<EmployeeDetails, 'name' | 'socialName' | 'email' | 'registrationNumber' | 'rg' | 'admissionDate'>>;
export type AssignmentPatch = { title?: string; startsOn?: string | null; validUntil?: string | null; active?: boolean };

export function editEmployee(id: string, data: VersionedReason & EmployeePatch, signal: AbortSignal) {
  return apiRequest<EmployeeDetails>(employeePath(id), { method: 'PATCH', body: JSON.stringify(data), signal });
}

export function saveAssignment(id: string, assignmentId: string | undefined, data: VersionedReason & AssignmentPatch, signal: AbortSignal) {
  const path = employeePath(id) + '/funcoes' + (assignmentId ? '/' + encodeURIComponent(assignmentId) : '');
  return apiRequest<{ version: number }>(path, { method: assignmentId ? 'PATCH' : 'POST', body: JSON.stringify(data), signal });
}

export function changeArchive(id: string, restore: boolean, data: VersionedReason, signal: AbortSignal) {
  return apiRequest<EmployeeDetails>(employeePath(id) + (restore ? '/restaurar' : ''),
    { method: restore ? 'POST' : 'DELETE', body: JSON.stringify(data), signal });
}
