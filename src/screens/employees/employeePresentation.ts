import { ApiRequestError } from '../../api/config/apiRequest';

export const accountLabels = { ACTIVE: 'Ativa', BLOCKED: 'Bloqueada', ARCHIVED: 'Arquivada' };
export const assignmentLabels = { ACTIVE: 'Vigente', FUTURE: 'Futura', EXPIRED: 'Vencida', ENDED: 'Encerrada', ARCHIVED: 'Arquivada' };
export const deliveryLabels = {
  ACCEPTED: 'Envio aceito pelo serviço de e-mail. A entrega na caixa de entrada não é confirmada.',
  FAILED: 'O serviço de e-mail não aceitou o envio.',
  PENDING: 'Envio em processamento.',
  UNKNOWN: 'O resultado do envio ainda é desconhecido.',
};

export function employeeError(error: unknown) {
  if (!(error instanceof ApiRequestError)) return 'Não foi possível conectar à API. Tente novamente.';
  if (error.code === 'EMAIL_ALREADY_EXISTS') return 'Já existe um funcionário com este e-mail.';
  if (error.code === 'REGISTRATION_ALREADY_EXISTS') return 'Já existe um funcionário com esta matrícula funcional.';
  if (error.status === 403) return 'A operação não está disponível para esta conta ou sessão.';
  return error.message;
}

export function dateLabel(date: string | null) {
  return date ? date.split('-').reverse().join('/') : 'Não informada';
}
export function timeLabel(time: string | null) {
  return time ? new Date(time).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Sem registro';
}
