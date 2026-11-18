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
  registrationNumber?: string;
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

export function listEmployees(query: string, cursor: string | null, signal?: AbortSignal) {
  const filters = new URLSearchParams({ limit: '25' });
  if (query) filters.set('q', query);
  if (cursor) filters.set('cursor', cursor);
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
