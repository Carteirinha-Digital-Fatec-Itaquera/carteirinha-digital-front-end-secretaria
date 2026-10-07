import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Upload,
  Archive,
  RotateCcw,
  History,
  AlertCircle,
  Users,
} from 'lucide-react';
import MenuLateral from '../../components/menuLateral/MenuLateral';
import MessageModal from '../../components/messageModal/MessageModal';
import { useCreditMessages } from './useCreditMessages';
import CreditsHistoryModal from './CreditsHistoryModal';
import {
  listAdminContributors,
  archiveContributor,
  restoreContributor,
  publishContributor,
  type AdminContributorsQuery,
} from '../../api/projectCredits/projectCreditsAdminService';
import { ApiRequestError } from '../../api/config/apiRequest';
import type {
  AdminProjectContributorSummary,
  ProjectCreditStatus,
} from '../../domains/ProjectCredits';
import { formatSemester } from '../../utils/projectCreditContact';
import styles from './styleCreditsAdmin.module.css';
import layoutStyles from '../../styles/layoutWithMenu.module.css';

export default function CreditsManageScreen() {
  const { messageDialog, closeMessage, notify, confirm } = useCreditMessages();
  const navigate = useNavigate();
  const [contributors, setContributors] = useState<AdminProjectContributorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordExpired, setPasswordExpired] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectCreditStatus | 'ALL'>('ALL');
  const [semester, setSemester] = useState('ALL');
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);

  // Action modals
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProjectContributorSummary | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<AdminProjectContributorSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadContributors = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPasswordExpired(false);

    try {
      const query: AdminContributorsQuery = {
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        semester: semester !== 'ALL' ? semester : undefined,
        limit: 100,
      };

      const res = await listAdminContributors(query);
      const items = Array.isArray(res?.items) ? res.items : [];
      setContributors(items);

      // Collect semesters for filter dropdown
      const sems = new Set<string>();
      items.forEach((c) => c.semesters?.forEach((s) => sems.add(s)));
      setAvailableSemesters(Array.from(sems).sort((a, b) => b.localeCompare(a)));
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'PASSWORD_RENEWAL_REQUIRED' || (err.status === 403 && err.message.includes('renovação'))) {
          setPasswordExpired(true);
          return;
        }
        if (err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'Falha ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, [search, status, semester, navigate]);

  useEffect(() => {
    loadContributors();
  }, [loadContributors]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadContributors();
  };

  const handleQuickPublish = async (c: AdminProjectContributorSummary) => {
    if (!(await confirm(`Deseja publicar imediatamente as alterações de "${c.name}"?`))) {
      return;
    }

    try {
      setActionLoading(true);
      await publishContributor(c.id, {
        expectedVersion: c.draftVersion,
        profileConfirmed: true,
      });
      await loadContributors();
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 409) {
        notify('Conflito de versão detectado. Os dados foram modificados por outro usuário. Recarregando lista...');
        await loadContributors();
        return;
      }
      notify(err instanceof Error ? err.message : 'Erro ao publicar colaborador');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;

    try {
      setActionLoading(true);
      await archiveContributor(archiveTarget.id, {
        expectedVersion: archiveTarget.draftVersion,
        reason: archiveReason.trim() || undefined,
      });
      setArchiveTarget(null);
      setArchiveReason('');
      await loadContributors();
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 409) {
        notify('Conflito de versão detectado. Recarregando...');
        await loadContributors();
        setArchiveTarget(null);
        return;
      }
      notify(err instanceof Error ? err.message : 'Erro ao arquivar colaborador');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;

    try {
      setActionLoading(true);
      await restoreContributor(restoreTarget.id, {
        expectedVersion: restoreTarget.draftVersion,
      });
      setRestoreTarget(null);
      await loadContributors();
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 409) {
        notify('Conflito de versão detectado. Recarregando...');
        await loadContributors();
        setRestoreTarget(null);
        return;
      }
      notify(err instanceof Error ? err.message : 'Erro ao restaurar colaborador');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <MessageModal visible={Boolean(messageDialog)} tone={messageDialog?.confirmation ? 'warning' : 'error'} title={messageDialog?.confirmation ? 'Confirmar publicação' : 'Confira as informações'} message={messageDialog?.message ?? ''} confirmText={messageDialog?.confirmation ? 'Confirmar' : 'OK'} cancelText={messageDialog?.confirmation ? 'Cancelar' : undefined} onConfirm={() => closeMessage(true)} onCancel={() => closeMessage(false)} onDismiss={() => closeMessage(false)} />
        <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div className={styles.headerText}>
            <h1>Gestão de Créditos do Projeto</h1>
            <p>
              Cadastre, edite e publique o histórico dos desenvolvedores e colaboradores que
              ajudaram a construir a Carteirinha Digital.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link to="/creditos" className={styles.secondaryButton} target="_blank">
              Visualizar Créditos Públicos
            </Link>
            <Link to="/creditos/novo" className={styles.primaryButton}>
              <Plus size={18} />
              Novo Colaborador
            </Link>
          </div>
        </div>

        {passwordExpired && (
          <div className={styles.passwordRenewalAlert} role="alert">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} />
              Renovação de Senha Necessária
            </h3>
            <p style={{ margin: 0 }}>
              O prazo de validade da sua senha expirou. Por motivos de segurança, você deve redefinir sua
              senha antes de realizar alterações administrativas nos créditos.{' '}
              <Link to="/redefinir-senha" style={{ fontWeight: 'bold', color: 'inherit' }}>
                Clique aqui para redefinir sua senha agora
              </Link>
              .
            </p>
          </div>
        )}

        {error && (
          <div className={styles.conflictAlert} role="alert">
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Barra de Filtros */}
        <form className={styles.filterCard} onSubmit={handleSearchSubmit}>
          <div className={styles.filterGroup}>
            <label htmlFor="credit-search">Buscar por nome</label>
            <div style={{ position: 'relative' }}>
              <input
                id="credit-search"
                type="text"
                className={styles.inputControl}
                placeholder="Ex: Wellington..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.filterGroup} style={{ maxWidth: 220 }}>
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              className={styles.inputControl}
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectCreditStatus | 'ALL')}
            >
              <option value="ALL">Todos os status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          {availableSemesters.length > 0 && (
            <div className={styles.filterGroup} style={{ maxWidth: 220 }}>
              <label htmlFor="semester-filter">Semestre</label>
              <select
                id="semester-filter"
                className={styles.inputControl}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="ALL">Todos os semestres</option>
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    {formatSemester(s)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className={styles.secondaryButton}>
            <Search size={16} />
            Filtrar
          </button>
        </form>

        {/* Tabela de Resultados */}
        <div className={styles.tableCard}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--app-color-muted)' }}>
              Carregando colaboradores...
            </p>
          ) : contributors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--app-color-muted)' }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>Nenhum colaborador encontrado</h3>
              <p>Nenhum registro corresponde aos filtros selecionados.</p>
              <Link to="/creditos/novo" className={styles.primaryButton} style={{ marginTop: 12 }}>
                <Plus size={16} />
                Cadastrar Colaborador
              </Link>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Status</th>
                    <th>Semestres &amp; Funções</th>
                    <th>Versão</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((c) => {
                    const initials = c.name.trim().slice(0, 2).toLocaleUpperCase('pt-BR');
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className={styles.personCell}>
                            <div className={styles.avatarThumb}>
                              <span>{initials}</span>
                            </div>
                            <div className={styles.nameInfo}>
                              <strong>{c.name}</strong>
                              {c.hasUnpublishedChanges && c.status === 'PUBLISHED' && (
                                <span className={styles.pendingChangesBadge}>
                                  Alterações não publicadas
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {c.status === 'PUBLISHED' && (
                            <span className={`${styles.statusBadge} ${styles.statusPublished}`}>
                              Publicado
                            </span>
                          )}
                          {c.status === 'DRAFT' && (
                            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                              Rascunho
                            </span>
                          )}
                          {c.status === 'ARCHIVED' && (
                            <span className={`${styles.statusBadge} ${styles.statusArchived}`}>
                              Arquivado
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                              {c.semesters.map(formatSemester).join(', ') || 'Nenhum semestre'}
                            </div>
                            <ul className={styles.tagsList}>
                              {c.roles.slice(0, 3).map((r, i) => (
                                <li key={i} className={styles.tagItem}>
                                  {r}
                                </li>
                              ))}
                              {c.roles.length > 3 && (
                                <li className={styles.tagItem}>+{c.roles.length - 3}</li>
                              )}
                            </ul>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--app-color-muted)' }}>
                            Rascunho: <strong>v{c.draftVersion}</strong>
                            {c.publishedVersion && (
                              <div>
                                Público: <strong>v{c.publishedVersion}</strong>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button
                              type="button"
                              className={styles.iconActionButton}
                              title="Editar Colaborador"
                              aria-label={`Editar ${c.name}`}
                              onClick={() => navigate(`/creditos/${c.id}/editar`)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {(c.status === 'DRAFT' || c.hasUnpublishedChanges) && (
                              <button
                                type="button"
                                className={styles.iconActionButton}
                                title="Publicar Alterações"
                                aria-label={`Publicar ${c.name}`}
                                disabled={actionLoading}
                                onClick={() => handleQuickPublish(c)}
                              >
                                <Upload size={16} />
                              </button>
                            )}

                            {c.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                className={styles.iconActionButton}
                                title="Arquivar Colaborador"
                                aria-label={`Arquivar ${c.name}`}
                                onClick={() => setArchiveTarget(c)}
                              >
                                <Archive size={16} />
                              </button>
                            )}

                            {c.status === 'ARCHIVED' && (
                              <button
                                type="button"
                                className={styles.iconActionButton}
                                title="Restaurar Colaborador"
                                aria-label={`Restaurar ${c.name}`}
                                onClick={() => setRestoreTarget(c)}
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}

                            <button
                              type="button"
                              className={styles.iconActionButton}
                              title="Histórico de Auditoria"
                              aria-label={`Histórico de ${c.name}`}
                              onClick={() => setHistoryTarget({ id: c.id, name: c.name })}
                            >
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Modal de Histórico */}
      {historyTarget && (
        <CreditsHistoryModal
          contributorId={historyTarget.id}
          contributorName={historyTarget.name}
          isOpen={true}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Modal de Arquivamento */}
      {archiveTarget && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Arquivar Colaborador</h2>
            </div>
            <div className={styles.modalBody}>
              <p>
                Tem certeza de que deseja arquivar <strong>{archiveTarget.name}</strong>?
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--app-color-muted)' }}>
                O colaborador será removido imediatamente da lista pública. Os registros históricos
                serão mantidos e você poderá restaurá-lo como rascunho quando necessário.
              </p>
              <div className={styles.formGroup} style={{ marginTop: 16 }}>
                <label htmlFor="archive-reason">Motivo do arquivamento (opcional):</label>
                <textarea
                  id="archive-reason"
                  className={styles.inputControl}
                  rows={3}
                  placeholder="Ex: Solicitação do autor, revisão pendente..."
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setArchiveTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleArchiveConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Arquivando...' : 'Confirmar Arquivamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Restauração */}
      {restoreTarget && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Restaurar Colaborador</h2>
            </div>
            <div className={styles.modalBody}>
              <p>
                Deseja restaurar <strong>{restoreTarget.name}</strong>?
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--app-color-muted)' }}>
                O registro retornará ao estado de <strong>Rascunho</strong> sem publicação automática.
                Você poderá revisar e atualizar suas informações antes de publicá-lo novamente.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setRestoreTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleRestoreConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Restaurando...' : 'Confirmar Restauração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
