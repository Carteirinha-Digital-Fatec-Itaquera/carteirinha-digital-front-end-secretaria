import { describe, it, expect } from 'vitest';
import { formatAuditAction } from './auditLabels';

describe('formatAuditAction', () => {
  it('traduz ações conhecidas de checkpoints', () => {
    expect(formatAuditAction('CHECKPOINT_OPEN_CHECK_IN')).toBe('Check-in (Entrada) aberto');
    expect(formatAuditAction('CHECKPOINT_CLOSE_CHECK_IN')).toBe('Check-in (Entrada) encerrado');
    expect(formatAuditAction('CHECKPOINT_OPEN_CHECK_OUT')).toBe('Check-out (Saída) aberto');
    expect(formatAuditAction('CHECKPOINT_CLOSE_CHECK_OUT')).toBe('Check-out (Saída) encerrado');
    expect(formatAuditAction('WINDOW_EXPIRED_CHECK_IN')).toBe('Janela de Check-in expirada automaticamente');
    expect(formatAuditAction('WINDOW_EXPIRED_CHECK_OUT')).toBe('Janela de Check-out expirada automaticamente');
  });

  it('traduz ações de atendimento presencial e correção cadastral', () => {
    expect(formatAuditAction('MANUAL_CHECK_IN')).toBe('Presença confirmada manualmente pela secretaria (Entrada)');
    expect(formatAuditAction('MANUAL_CHECK_OUT')).toBe('Presença confirmada manualmente pela secretaria (Saída)');
    expect(formatAuditAction('PARTICIPANT_CORRECTED')).toBe('Dados cadastrais do participante corrigidos');
  });

  it('traduz atribuição de papéis', () => {
    expect(formatAuditAction('ROLE_ATTENDEE')).toBe('Papel atribuído como Participante');
    expect(formatAuditAction('ROLE_SPEAKER')).toBe('Papel atribuído como Palestrante');
    expect(formatAuditAction('ROLE_ORGANIZER')).toBe('Papel atribuído como Organizador');
    expect(formatAuditAction('ROLE_VOLUNTEER')).toBe('Papel atribuído como Voluntário');
    expect(formatAuditAction('ROLE_STAFF')).toBe('Papel atribuído como Equipe / Staff');
  });

  it('traduz eventos de ciclo de vida e certificados', () => {
    expect(formatAuditAction('EVENT_CREATED')).toBe('Evento criado');
    expect(formatAuditAction('EVENT_UPDATED')).toBe('Evento atualizado');
    expect(formatAuditAction('EVENT_CANCELLED')).toBe('Evento cancelado');
    expect(formatAuditAction('EVENT_DELETED_WITHOUT_HISTORY')).toBe('Evento excluído sem histórico');
    expect(formatAuditAction('CERTIFICATE_RETRY')).toBe('Reemissão de certificado reprocessada');
    expect(formatAuditAction('SERIES_SAVED')).toBe('Configuração da edição do evento salva');
    expect(formatAuditAction('TEMPLATE_VERSION_CREATED')).toBe('Novo modelo de certificado configurado');
    expect(formatAuditAction('SIGNER_VERSION_CREATED')).toBe('Novo assinante de certificado cadastrado');
    expect(formatAuditAction('OPERATIONAL_DATA_PURGED')).toBe('Dados operacionais sensíveis expurgados por segurança');
  });

  it('aplica fallback humanizado para ações dinâmicas ou desconhecidas', () => {
    expect(formatAuditAction('CUSTOM_AUDIT_ACTION')).toBe('Custom Audit Action');
    expect(formatAuditAction(null)).toBe('Ação administrativa registrada');
    expect(formatAuditAction('')).toBe('Ação administrativa registrada');
  });
});
