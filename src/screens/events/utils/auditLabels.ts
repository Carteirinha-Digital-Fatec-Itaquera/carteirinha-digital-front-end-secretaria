/**
 * Dicionário e formatador de ações de auditoria para exibição amigável à secretaria e usuários leigos.
 */
const AUDIT_ACTION_MAP: Record<string, string> = {
  BULK_MANUAL_CHECK_OUT: 'Saídas confirmadas em lote pela Secretaria',
  MANUAL_CERTIFICATE_ISSUED: 'Certificado emitido por regularização administrativa',
  MANUAL_CERTIFICATE_ALREADY_ISSUED: 'Certificado existente consultado na regularização',
  // Abertura e encerramento de checkpoints
  CHECKPOINT_OPEN_CHECK_IN: 'Check-in (Entrada) aberto',
  CHECKPOINT_CLOSE_CHECK_IN: 'Check-in (Entrada) encerrado',
  CHECKPOINT_OPEN_CHECK_OUT: 'Check-out (Saída) aberto',
  CHECKPOINT_CLOSE_CHECK_OUT: 'Check-out (Saída) encerrado',
  WINDOW_EXPIRED_CHECK_IN: 'Janela de Check-in expirada automaticamente',
  WINDOW_EXPIRED_CHECK_OUT: 'Janela de Check-out expirada automaticamente',

  // Presenças manuais e atendimento presencial
  MANUAL_CHECK_IN: 'Presença confirmada manualmente pela secretaria (Entrada)',
  MANUAL_CHECK_OUT: 'Presença confirmada manualmente pela secretaria (Saída)',
  PARTICIPANT_CORRECTED: 'Dados cadastrais do participante corrigidos',

  // Alteração de papéis
  ROLE_ATTENDEE: 'Papel atribuído como Participante',
  ROLE_SPEAKER: 'Papel atribuído como Palestrante',
  ROLE_ORGANIZER: 'Papel atribuído como Organizador',
  ROLE_VOLUNTEER: 'Papel atribuído como Voluntário',
  ROLE_STAFF: 'Papel atribuído como Equipe / Staff',

  // Ciclo de vida do evento
  EVENT_CREATED: 'Evento criado',
  EVENT_UPDATED: 'Evento atualizado',
  EVENT_CANCELLATION_REVOKED: 'Cancelamento do evento revogado',
  EVENT_CANCELLATION_CAPTURED: 'Histórico do cancelamento preservado',
  EVENT_CANCELLED: 'Evento cancelado',
  EVENT_DELETED_WITHOUT_HISTORY: 'Evento excluído sem histórico',

  // Certificados e Modelos
  CERTIFICATE_REISSUED: 'Certificado substituído por versão corrigida',
  CERTIFICATE_RETRY: 'Reemissão de certificado reprocessada',
  SERIES_SAVED: 'Configuração da edição do evento salva',
  TEMPLATE_VERSION_CREATED: 'Novo modelo de certificado configurado',
  SIGNER_VERSION_CREATED: 'Novo assinante de certificado cadastrado',
  OPERATIONAL_DATA_PURGED: 'Dados operacionais sensíveis expurgados por segurança',
};

/**
 * Traduz um código de auditoria interno para uma descrição compreensível em português do Brasil.
 */
export function formatAuditAction(action: string | null | undefined): string {
  if (!action || typeof action !== 'string') {
    return 'Ação administrativa registrada';
  }

  const trimmed = action.trim();
  if (AUDIT_ACTION_MAP[trimmed]) {
    return AUDIT_ACTION_MAP[trimmed];
  }

  // Tratamentos de prefixos dinâmicos
  if (trimmed.startsWith('ROLE_')) {
    const roleName = trimmed.replace('ROLE_', '');
    const readableRole =
      roleName === 'ATTENDEE'
        ? 'Participante'
        : roleName === 'SPEAKER'
        ? 'Palestrante'
        : roleName === 'ORGANIZER'
        ? 'Organizador'
        : roleName === 'VOLUNTEER'
        ? 'Voluntário'
        : roleName;
    return `Papel atribuído como ${readableRole}`;
  }

  if (trimmed.startsWith('MANUAL_')) {
    const cpName = trimmed.replace('MANUAL_', '');
    const readableCp =
      cpName === 'CHECK_IN'
        ? 'Entrada'
        : cpName === 'CHECK_OUT'
        ? 'Saída'
        : cpName;
    return `Presença confirmada manualmente pela secretaria (${readableCp})`;
  }

  if (trimmed.startsWith('CHECKPOINT_OPEN_')) {
    const cpName = trimmed.replace('CHECKPOINT_OPEN_', '');
    const readableCp =
      cpName === 'CHECK_IN'
        ? 'Check-in (Entrada)'
        : cpName === 'CHECK_OUT'
        ? 'Check-out (Saída)'
        : cpName;
    return `${readableCp} aberto`;
  }

  if (trimmed.startsWith('CHECKPOINT_CLOSE_')) {
    const cpName = trimmed.replace('CHECKPOINT_CLOSE_', '');
    const readableCp =
      cpName === 'CHECK_IN'
        ? 'Check-in (Entrada)'
        : cpName === 'CHECK_OUT'
        ? 'Check-out (Saída)'
        : cpName;
    return `${readableCp} encerrado`;
  }

  if (trimmed.startsWith('WINDOW_EXPIRED_')) {
    const cpName = trimmed.replace('WINDOW_EXPIRED_', '');
    const readableCp =
      cpName === 'CHECK_IN'
        ? 'Check-in'
        : cpName === 'CHECK_OUT'
        ? 'Check-out'
        : cpName;
    return `Janela de ${readableCp} expirada automaticamente`;
  }

  // Fallback genérico amigável caso surja um novo código não mapeado
  return trimmed
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
