import ReusableParticipantExport from './ReusableParticipantExport';
import ParticipantPagination from './ParticipantPagination';
import ReissueCertificateDialog from './ReissueCertificateDialog';
import { EllipsisVertical } from 'lucide-react';
import { ManualCheckoutDialog } from './ManualCheckoutDialog';
import React, { useState, useEffect } from 'react';
import type { AttendanceView } from '../../../domains/Attendance';
import { formatEventTime } from '../../../utils/eventPresentation';
import {
  management,
  openManagementPdf,
  type Participant,
  type AuditEntry,
} from '../../../api/event/publicEventService';
import { formatAuditAction } from '../utils/auditLabels';
import styles from './ParticipantsPanel.module.css';

export interface ParticipantsPanelProps {
  items: AttendanceView[];
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
  eventId?: string;
  eventStatus?: string;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  items,
  loading,
  refreshing,
  stale,
  error,
  lastUpdatedAt,
  onRefresh,
  eventId,
  eventStatus,
}) => {
  const [participantsDetails, setParticipantsDetails] = useState<Map<string, Participant>>(new Map());
  const [reissue, setReissue] = useState<{ id: string; version: number } | null>(null);
  const [auditList, setAuditList] = useState<AuditEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ eventId, page: 0 });
  const page = Math.min(pagination.eventId === eventId ? pagination.page : 0, Math.max(0, Math.ceil(items.length / 25) - 1));
  const visibleItems = items.slice(page * 25, page * 25 + 25);
  const [bulkTargets, setBulkTargets] = useState<AttendanceView[] | null>(null);
  const pendingRows = items.filter(row => row.checkInAt && !row.checkOutAt && row.status === 'CHECKED_IN');
  const selectedRows = pendingRows.filter(row => selectedIds.includes(row.id));
  const allSelected = pendingRows.length > 0 && selectedRows.length === pendingRows.length;
  const [manualCheckout, setManualCheckout] = useState<AttendanceView | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Modal de atendimento presencial / alteração de papel
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [modalAction, setModalAction] = useState<'ATTENDEE' | 'SPEAKER' | 'CONFIRM_PRESENCE' | 'CORRECT'>('CONFIRM_PRESENCE');
  const [modalReason, setModalReason] = useState('');
  const [correctedName, setCorrectedName] = useState('');
  const [correctedCourse, setCorrectedCourse] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal de reconciliação de entrega ambígua
  const [reconcileModalData, setReconcileModalData] = useState<{
    certId: string;
    studentName: string;
  } | null>(null);
  const [reconcileResolution, setReconcileResolution] = useState<
    'CONFIRM_SENT' | 'RESCHEDULE_SEND' | 'KEEP_AMBIGUOUS'
  >('CONFIRM_SENT');
  const [reconcileReason, setReconcileReason] = useState('');
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  // Carrega dados adicionais de certificados e auditoria se eventId estiver presente
  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;
    const controller = new AbortController();

    const fetchDetails = async () => {
      try {
        const [people, history] = await Promise.all([
          management<Participant[]>(`events/${eventId}/participants`, undefined, 'GET', controller.signal),
          management<AuditEntry[]>(`events/${eventId}/audit`, undefined, 'GET', controller.signal).catch(() => []),
        ]);
        if (isMounted) {
          const map = new Map<string, Participant>();
          for (const p of people) {
            if (p.attendance?.id) map.set(p.attendance.id, p);
          }
          setParticipantsDetails(map);
          setAuditList(history);
        }
      } catch {
        // Fallback silencioso
      }
    };

    void fetchDetails();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventId, items, refreshing]);

  const handleExportCsv = () => {
    const csvRows = [
      'Nome,Identificação,Curso,Papel,Entrada,Saída,Status,Certificado',
      ...items.map((it) => {
        const detail = participantsDetails.get(it.id);
        const ident = it.studentRa || (detail?.visitorId ? 'Visitante' : 'Aluno');
        const role = detail?.role === 'SPEAKER' ? 'Palestrante' : 'Participante';
        const certCode = detail?.certificate?.verificationCode || '';
        const inTime = it.checkInAt ? new Date(it.checkInAt).toLocaleString('pt-BR') : '';
        const outTime = it.checkOutAt ? new Date(it.checkOutAt).toLocaleString('pt-BR') : '';
        const st = it.status === 'CONFIRMED' ? 'Confirmada' : 'Aguardando saída';

        return [
          it.studentName,
          ident,
          it.studentCourse || '',
          role,
          inTime,
          outTime,
          st,
          certCode,
        ]
          .map((v) => `"${(/^[=+@-]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`)
          .join(',');
      }),
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-evento-${eventId || 'export'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenManualModal = (item: AttendanceView) => {
    const p = participantsDetails.get(item.id);
    if (!p) { setActionFeedback('Atualize a lista para carregar a identificação do participante.'); return; }
    setSelectedParticipant(p);
    setCorrectedName(p.name);
    setCorrectedCourse(p.course || '');
    setModalReason('');
    setModalError(null);
    setModalAction(p.attendance?.status === 'CONFIRMED' ? 'ATTENDEE' : 'CONFIRM_PRESENCE');
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant) return;
    const reason = modalReason.trim();
    if (reason.length < 10) {
      setModalError('A justificativa deve ter pelo menos 10 caracteres.');
      return;
    }

    try {
      setActionBusy(true);
      setModalError(null);

      if (modalAction === 'CONFIRM_PRESENCE') {
        if (!eventId) throw new Error('Identificador do evento não disponível.');
        await management(`events/${eventId}/manual-presence`, {
          participantId: selectedParticipant.id,
          checkpoint: 'CHECK_OUT',
          reason,
        });
        setActionFeedback(`Presença confirmada manualmente para ${selectedParticipant.name}.`);
      } else if (modalAction === 'ATTENDEE' || modalAction === 'SPEAKER') {
        await management(`participants/${selectedParticipant.id}/role`, {
          role: modalAction,
          reason,
        });
        setActionFeedback(`Papel alterado para ${modalAction === 'SPEAKER' ? 'Palestrante' : 'Participante'}.`);
      } else if (modalAction === 'CORRECT') {
        await management(
          `participants/${selectedParticipant.id}`,
          {
            name: correctedName.trim(),
            course: correctedCourse.trim() || undefined,
            reason,
          },
          'PATCH'
        );
        setActionFeedback('Dados cadastrais corrigidos com sucesso.');
      }

      setSelectedParticipant(null);
      onRefresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Erro ao processar atendimento presencial.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRetryCert = async (certId: string) => {
    try {
      setActionBusy(true);
      await management(`certificates/${certId}/retry`, {});
      setActionFeedback('Tentativa de emissão do certificado reagendada.');
      onRefresh();
    } catch (err: unknown) {
      setActionFeedback(err instanceof Error ? err.message : 'Falha ao reemitir certificado.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenReconcileModal = (certId: string, studentName: string) => {
    setReconcileModalData({ certId, studentName });
    setReconcileResolution('CONFIRM_SENT');
    setReconcileReason('');
    setReconcileError(null);
  };

  const handleCloseReconcileModal = () => {
    setReconcileModalData(null);
    setReconcileReason('');
    setReconcileError(null);
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileModalData) return;
    if (reconcileReason.trim().length < 5) {
      setReconcileError('Informe a justificativa/evidência da reconciliação (mínimo de 5 caracteres).');
      return;
    }
    try {
      setActionBusy(true);
      await management(
        `certificates/${reconcileModalData.certId}/reconcile-delivery`,
        {
          resolution: reconcileResolution,
          reason: reconcileReason.trim(),
        },
      );
      setActionFeedback(`Entrega reconciliada como ${reconcileResolution}.`);
      handleCloseReconcileModal();
      onRefresh();
      if (eventId) {
        management<AuditEntry[]>(`events/${eventId}/audit`)
          .then((res) => {
            if (Array.isArray(res)) setAuditList(res);
          })
          .catch(() => {});
      }
    } catch (err: unknown) {
      setReconcileError(
        err instanceof Error ? err.message : 'Falha ao reconciliar entrega do certificado.',
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownloadCert = async (certId: string) => {
    try {
      await openManagementPdf(`certificates/${certId}/pdf`);
    } catch (err: unknown) {
      setActionFeedback(err instanceof Error ? err.message : 'Falha ao baixar certificado.');
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="participants-panel-title">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 id="participants-panel-title" className={styles.title}>
            Participantes
          </h2>
          <span className={styles.badgeCount}>
            {items.length} {items.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className={styles.actionsBar}>
          {eventId && items.length > 0 && <ReusableParticipantExport items={items} eventId={eventId} />}
          {eventId && <button type="button" className={styles.refreshButton} disabled={!selectedRows.length || eventStatus === 'CANCELLED' || actionBusy || loading} onClick={() => setBulkTargets([...selectedRows])}>Confirmar saídas selecionadas ({selectedRows.length})</button>}
          {items.length > 0 && (
            <button
              type="button"
              className={styles.csvButton}
              onClick={handleExportCsv}
              aria-label="Exportar lista de participantes em CSV"
            >
              Exportar CSV
            </button>
          )}

          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            disabled={loading || refreshing || actionBusy}
            aria-label="Atualizar lista de participantes"
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            color: '#166534',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #bbf7d0',
          }}
          role="status"
        >
          {actionFeedback}
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {stale && (
        <div className={styles.staleAlert} role="status">
          <span>
            ⚠️ Exibindo dados em cache ({lastUpdatedAt ? `atualizado às ${formatEventTime(lastUpdatedAt.toISOString())}` : 'desatualizado'}). Ocorreu uma falha na última sincronização.
          </span>
        </div>
      )}

      {error && !stale && (
        <div className={styles.errorAlert} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.retryButton} onClick={onRefresh}>
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState} role="status">
          Carregando participantes...
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          Nenhum participante registrado até o momento.
        </div>
      ) : (
        <><div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {eventId && <th scope="col"><input type="checkbox" aria-label="Selecionar todos com saída pendente" checked={allSelected} ref={element => { if (element) element.indeterminate = selectedRows.length > 0 && !allSelected; }} disabled={!pendingRows.length || eventStatus === 'CANCELLED'} onChange={() => setSelectedIds(allSelected ? [] : pendingRows.map(row => row.id))} /></th>}
                <th scope="col">Nome</th>
                <th scope="col">RA</th>
                <th scope="col">Curso</th>
                <th scope="col">Entrada</th>
                <th scope="col">Saída</th>
                <th scope="col">Status</th>
                {eventId && <th scope="col">Certificado</th>}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((attendance) => {
                const detail = participantsDetails.get(attendance.id);
                const cert = detail?.certificate;

                return (
                  <tr key={attendance.id}>
                    {eventId && <td>{attendance.checkInAt && !attendance.checkOutAt && attendance.status === 'CHECKED_IN' && <input type="checkbox" aria-label={`Selecionar ${attendance.studentName}`} checked={selectedIds.includes(attendance.id)} disabled={eventStatus === 'CANCELLED'} onChange={() => setSelectedIds(current => current.includes(attendance.id) ? current.filter(id => id !== attendance.id) : [...current, attendance.id])} />}</td>}
                    <td>
                      <div>
                        <div className={styles.nameActions}><strong>{attendance.studentName}</strong>
                          {eventId && <details className={styles.rowMenu} onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
                            <summary aria-label={`Ações para ${attendance.studentName}`} title="Ações do participante"><EllipsisVertical size={20} aria-hidden="true" /></summary>
                            <div className={styles.rowMenuContent}>
                              {attendance.checkInAt && !attendance.checkOutAt && attendance.status === 'CHECKED_IN' && <button type="button" disabled={actionBusy || eventStatus === 'CANCELLED'} onClick={e => { const menu = e.currentTarget.closest('details'); if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); } setManualCheckout(attendance); }}>Registrar saída manual</button>}
                              {attendance.checkOutAt && <span>Presença já confirmada</span>}
                              {cert && !cert.revokedAt && attendance.studentRa && <button type="button" disabled={eventStatus === 'CANCELLED'} onClick={() => setReissue({ id: cert.id, version: cert.version ?? 1 })}>Corrigir e reemitir certificado</button>}
                              {detail && <button type="button" disabled={actionBusy || eventStatus === 'CANCELLED'} onClick={e => { const menu = e.currentTarget.closest('details'); if (menu) menu.open = false; handleOpenManualModal(attendance); }}>Outras ações de atendimento</button>}
                            </div>
                          </details>}
                        </div>
                        {detail?.role && detail.role !== 'ATTENDEE' && (
                          <span className={styles.badgeRole} style={{ marginLeft: '6px' }}>
                            {detail.role === 'SPEAKER' ? 'Palestrante' : detail.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {attendance.studentRa ? (
                        <span>{attendance.studentRa}</span>
                      ) : (
                        <span className={styles.badgeVisitor}>Visitante</span>
                      )}
                    </td>
                    <td>{attendance.studentCourse}</td>
                    <td>{attendance.checkInAt ? formatEventTime(attendance.checkInAt) : '—'}</td>
                    <td>{attendance.checkOutAt ? formatEventTime(attendance.checkOutAt) : '—'}</td>
                    <td>
                      {attendance.status === 'CONFIRMED' ? (
                        <span className={styles.statusConfirmed}>Presença confirmada</span>
                      ) : (
                        <span className={styles.statusCheckedIn}>Aguardando saída</span>
                      )}
                    </td>
                    {eventId && (
                      <td>
                        <div className={styles.cellActions}>
                          {cert && (
                            <>
                              {cert.revokedAt ? (
                                <span className={styles.badgeCertRevoked}>Revogado</span>
                              ) : cert.artifact?.state === 'READY' ? (
                                <>
                                  <button
                                    type="button"
                                    className={styles.btnAction}
                                    onClick={() => handleDownloadCert(cert.id)}
                                    disabled={actionBusy}
                                    title="Baixar certificado PDF"
                                  >
                                    Baixar PDF
                                  </button>
                                  {cert.artifact?.deliveryState === 'AMBIGUOUS' && (
                                    <button
                                      type="button"
                                      className={styles.btnAction}
                                      onClick={() => handleOpenReconcileModal(cert.id, attendance.studentName)}
                                      disabled={actionBusy}
                                      title="Reconciliar entrega com status ambíguo"
                                      style={{ color: '#d97706', borderColor: '#fcd34d' }}
                                    >
                                      Reconciliar Envio
                                    </button>
                                  )}
                                  {cert.artifact?.deliveryState === 'SENT' && (
                                    <span className={styles.badgeRole} style={{ color: '#059669', borderColor: '#a7f3d0' }}>
                                      E-mail Enviado
                                    </span>
                                  )}
                                </>
                              ) : cert.artifact?.state === 'RENDER_FAILED' || cert.artifact?.deliveryState === 'FAILED' ? (
                                <button
                                  type="button"
                                  className={styles.btnAction}
                                  onClick={() => handleRetryCert(cert.id)}
                                  disabled={actionBusy}
                                  title="Repetir geração do certificado"
                                  style={{ color: '#b91c1c' }}
                                >
                                  Repetir
                                </button>
                              ) : (
                                <span className={styles.badgeRole}>Processando</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ParticipantPagination total={items.length} page={page} onChange={next => setPagination({ eventId, page: next })} />
        {eventId && items.length > 25 && <p className={styles.selectionHint}>A seleção de saídas pendentes inclui todas as páginas. {selectedRows.length} participante(s) selecionado(s).</p>}
        </>
      )}

      {bulkTargets && eventId && <ManualCheckoutDialog eventId={eventId} attendances={bulkTargets.map(row => ({ id: row.id, name: row.studentName }))}
        onClose={() => setBulkTargets(null)} onSaved={ids => { const done = ids ?? []; setSelectedIds(current => current.filter(id => !done.includes(id))); setActionFeedback(`Lote processado: ${done.length} participantes.`); onRefresh(); }} />}
      {manualCheckout && eventId && <ManualCheckoutDialog eventId={eventId} attendanceId={manualCheckout.id} name={manualCheckout.studentName}
        onClose={() => setManualCheckout(null)} onSaved={() => { setActionFeedback(`Presença confirmada manualmente para ${manualCheckout.studentName}.`); onRefresh(); }} />}

      {reissue && <ReissueCertificateDialog certificateId={reissue.id} version={reissue.version} onClose={() => setReissue(null)} onSaved={onRefresh} />}
      {/* Histórico administrativo auditado */}
      {eventId && auditList.length > 0 && (
        <div className={styles.auditSection}>
          <h3 className={styles.auditTitle}>Histórico de Atendimento Presencial e Auditoria</h3>
          <div>
            {auditList.slice(0, 5).map((entry) => (
              <div key={entry.id} className={styles.auditItem}>
                <strong>{new Date(entry.createdAt).toLocaleString('pt-BR')}</strong> · {formatAuditAction(entry.action)}
                {entry.reason ? ` · Motivo: "${entry.reason}"` : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Atendimento Presencial */}
      {reconcileModalData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              Reconciliação Administrativa de Entrega
            </h3>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
              Participante: <strong>{reconcileModalData.studentName}</strong>
            </p>

            {reconcileError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                {reconcileError}
              </div>
            )}

            <form onSubmit={handleReconcileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Resolução da Entrega:
                </label>
                <select
                  value={reconcileResolution}
                  onChange={(e) =>
                    setReconcileResolution(
                      e.target.value as 'CONFIRM_SENT' | 'RESCHEDULE_SEND' | 'KEEP_AMBIGUOUS',
                    )
                  }
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="CONFIRM_SENT">Confirmar Envio (comprovado no provedor/destinatário)</option>
                  <option value="RESCHEDULE_SEND">Reagendar Envio (comprovado que não foi entregue)</option>
                  <option value="KEEP_AMBIGUOUS">Manter Ambíguo (investigação pendente)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Justificativa / Evidência obrigatória:
                </label>
                <textarea
                  value={reconcileReason}
                  onChange={(e) => setReconcileReason(e.target.value)}
                  placeholder="Ex: Verificado no console Brevo message-id 12345 entregue com sucesso."
                  required
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleCloseReconcileModal}
                  disabled={actionBusy}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--app-color-primary, #005c6d)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {actionBusy ? 'Gravando...' : 'Reconciliar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedParticipant && (
        <div className={styles.dialogOverlay} role="dialog" aria-modal="true" aria-labelledby="manual-dialog-title">
          <div className={styles.dialogBox}>
            <h3 id="manual-dialog-title" className={styles.dialogTitle}>
              Atendimento Presencial: {selectedParticipant.name}
            </h3>
            <p className={styles.dialogDesc}>
              Ações executadas presencialmente pela secretaria. Toda alteração é registrada com justificativa e não simula coordenadas de GPS.
            </p>

            {modalError && (
              <div style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 500 }} role="alert">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Ação desejada:
                </label>
                <select
                  value={modalAction}
                  onChange={(e) =>
                    setModalAction(
                      e.target.value as
                        | 'ATTENDEE'
                        | 'SPEAKER'
                        | 'CONFIRM_PRESENCE'
                        | 'CORRECT'
                    )
                  }
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="CONFIRM_PRESENCE">Confirmar presença presencial auditada</option>
                  <option value="ATTENDEE">Atribuir papel de Participante</option>
                  <option value="SPEAKER">Atribuir papel de Palestrante</option>
                  <option value="CORRECT">Corrigir dados cadastrais (Nome / Curso)</option>
                </select>
              </div>

              {modalAction === 'CORRECT' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Nome completo:
                    </label>
                    <input
                      type="text"
                      value={correctedName}
                      onChange={(e) => setCorrectedName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Curso:
                    </label>
                    <input
                      type="text"
                      value={correctedCourse}
                      onChange={(e) => setCorrectedCourse(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Justificativa obrigatória:
                </label>
                <textarea
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Ex: Aluno comprovou presença presencialmente com documento no auditório."
                  required
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedParticipant(null)}
                  disabled={actionBusy}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--app-color-primary, #005c6d)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {actionBusy ? 'Gravando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
