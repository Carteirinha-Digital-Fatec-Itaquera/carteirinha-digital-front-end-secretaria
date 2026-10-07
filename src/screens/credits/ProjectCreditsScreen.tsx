import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  UsersRound,
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
import { getProjectCredits } from '../../api/projectCredits/projectCreditsService';
import { ApiRequestError } from '../../api/config/apiRequest';
import { inspectSessionToken } from '../../api/auth/session';
import { useSecretarySession } from '../../api/auth/useSecretarySession';
import type {
  AdminProjectContributorSummary,
  ProjectCreditStatus,
  ProjectCreditsResponse,
} from '../../domains/ProjectCredits';
import { isApprovedProjectCreditHref, formatSemester } from '../../utils/projectCreditContact';
import adminStyles from './styleCreditsAdmin.module.css';
import publicStyles from './styleProjectCredits.module.css';
import layoutStyles from '../../styles/layoutWithMenu.module.css';

function sortSemesters(semesters: string[]): string[] {
  return [...new Set(semesters)].sort((left, right) => right.localeCompare(left));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toLocaleUpperCase('pt-BR');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('pt-BR');
}

/** Visão Administrativa Integrada da Secretaria */
function SecretaryCreditsView() {
  const navigate = useNavigate();
  const { messageDialog, closeMessage, notify, confirm } = useCreditMessages();
  const [contributors, setContributors] = useState<AdminProjectContributorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordExpired, setPasswordExpired] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectCreditStatus | 'ALL'>('ALL');
  const [semester, setSemester] = useState('ALL');
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);

  // Modais de Ação
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProjectContributorSummary | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<AdminProjectContributorSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadContributors = useCallback(async () => {
    setLoading(true);
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

      // Coleta semestres para o dropdown
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
      notify(err instanceof Error ? err.message : 'Falha ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, [search, status, semester, navigate, notify]);

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
        notify('Conflito de versão detectado. Os dados foram modificados por outro usuário. Recarregando...');
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
        <MessageModal
          visible={Boolean(messageDialog)}
          tone={messageDialog?.confirmation ? 'warning' : 'error'}
          title={messageDialog?.confirmation ? 'Confirmar publicação' : 'Confira as informações'}
          message={messageDialog?.message ?? ''}
          confirmText={messageDialog?.confirmation ? 'Confirmar' : 'OK'}
          cancelText={messageDialog?.confirmation ? 'Cancelar' : undefined}
          onConfirm={() => closeMessage(true)}
          onCancel={() => closeMessage(false)}
          onDismiss={() => closeMessage(false)}
        />
        <main className={adminStyles.mainContent}>
          {/* Header Unificado */}
          <div className={adminStyles.pageHeader}>
            <div className={adminStyles.headerText}>
              <h1>Créditos do Projeto</h1>
              <p>
                Histórico acadêmico e equipe de desenvolvimento da Carteirinha Digital.
                Cadastre e gerencie os colaboradores que constroem este projeto.
              </p>
            </div>
            <div className={adminStyles.headerActions}>
              <Link to="/creditos/novo" className={adminStyles.primaryButton}>
                <Plus size={18} />
                Novo Colaborador
              </Link>
            </div>
          </div>

          {passwordExpired && (
            <div className={adminStyles.passwordRenewalAlert} role="alert">
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

          {/* Barra de Busca e Filtros */}
          <form className={adminStyles.filterCard} onSubmit={handleSearchSubmit}>
            <div className={adminStyles.filterGroup}>
              <label htmlFor="search-contributor">Buscar colaborador</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="search-contributor"
                  type="text"
                  className={adminStyles.inputControl}
                  placeholder="Nome, papel ou curso..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className={adminStyles.filterGroup} style={{ maxWidth: 220 }}>
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                className={adminStyles.inputControl}
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
              <div className={adminStyles.filterGroup} style={{ maxWidth: 220 }}>
                <label htmlFor="semester-filter">Semestre</label>
                <select
                  id="semester-filter"
                  className={adminStyles.inputControl}
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

            <button type="submit" className={adminStyles.secondaryButton}>
              <Search size={16} />
              Filtrar
            </button>
          </form>

          {/* Lista de Colaboradores em Cartões */}
          {loading ? (
            <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--app-color-muted)' }}>
              Carregando colaboradores...
            </p>
          ) : contributors.length === 0 ? (
            <div className={adminStyles.emptyStateCard}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>Nenhum colaborador encontrado</h3>
              <p>Nenhum registro corresponde aos filtros selecionados.</p>
              <Link to="/creditos/novo" className={adminStyles.primaryButton} style={{ marginTop: 12 }}>
                <Plus size={16} />
                Adicionar Colaborador
              </Link>
            </div>
          ) : (
            <div className={adminStyles.contributorsCardGrid}>
              {contributors.map((c) => {
                const initials = getInitials(c.name);
                return (
                  <article key={c.id} className={adminStyles.contributorAdminCard}>
                    {/* Topo: Avatar, Nome e Badges */}
                    <div className={adminStyles.cardTopRow}>
                      <div className={adminStyles.cardAvatar} aria-hidden="true">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt={'Foto de ' + c.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div className={adminStyles.cardInfo}>
                        <h2 className={adminStyles.cardName}>{c.name}</h2>
                        <div className={adminStyles.badgesRow}>
                          {c.status === 'PUBLISHED' && (
                            <span className={`${adminStyles.statusBadge} ${adminStyles.statusPublished}`}>
                              Publicado
                            </span>
                          )}
                          {c.status === 'DRAFT' && (
                            <span className={`${adminStyles.statusBadge} ${adminStyles.statusDraft}`}>
                              Rascunho
                            </span>
                          )}
                          {c.status === 'ARCHIVED' && (
                            <span className={`${adminStyles.statusBadge} ${adminStyles.statusArchived}`}>
                              Arquivado
                            </span>
                          )}
                          {c.hasUnpublishedChanges && c.status === 'PUBLISHED' && (
                            <span className={adminStyles.pendingChangesBadge}>
                              Alterações pendentes
                            </span>
                          )}
                          <span className={adminStyles.versionBadge}>v{c.draftVersion}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadados: Semestres e Funções */}
                    <div className={adminStyles.cardMeta}>
                      {(c.semesters?.length ?? 0) > 0 && (
                        <div className={adminStyles.cardMetaGroup}>
                          <span className={adminStyles.cardMetaLabel}>Semestres</span>
                          <div className={adminStyles.cardTags}>
                            {c.semesters?.map((s) => (
                              <span key={s} className={adminStyles.cardTag}>
                                {formatSemester(s)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(c.roles?.length ?? 0) > 0 && (
                        <div className={adminStyles.cardMetaGroup}>
                          <span className={adminStyles.cardMetaLabel}>Papéis no projeto</span>
                          <div className={adminStyles.cardTags}>
                            {c.roles?.map((r) => (
                              <span key={r} className={adminStyles.cardTag}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações Administrativas do Cartão */}
                    <div className={adminStyles.cardActions}>
                      <div className={adminStyles.cardActionsLeft}>
                        <button
                          type="button"
                          className={adminStyles.secondaryButton}
                          onClick={() => navigate(`/creditos/${c.id}/editar`)}
                        >
                          <Edit2 size={15} />
                          Editar
                        </button>
                        {(c.status === 'DRAFT' || c.hasUnpublishedChanges) && (
                          <button
                            type="button"
                            className={adminStyles.primaryButton}
                            onClick={() => handleQuickPublish(c)}
                            disabled={actionLoading}
                          >
                            <Upload size={15} />
                            Publicar
                          </button>
                        )}
                      </div>
                      <div className={adminStyles.cardActionsRight}>
                        <button
                          type="button"
                          className={adminStyles.iconActionButton}
                          title="Histórico de auditoria"
                          aria-label={`Ver histórico de ${c.name}`}
                          onClick={() => setHistoryTarget({ id: c.id, name: c.name })}
                        >
                          <History size={16} />
                        </button>
                        {c.status !== 'ARCHIVED' ? (
                          <button
                            type="button"
                            className={adminStyles.iconActionButton}
                            title="Arquivar colaborador"
                            aria-label={`Arquivar ${c.name}`}
                            onClick={() => {
                              setArchiveTarget(c);
                              setArchiveReason('');
                            }}
                          >
                            <Archive size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={adminStyles.iconActionButton}
                            title="Restaurar colaborador"
                            aria-label={`Restaurar ${c.name}`}
                            onClick={() => setRestoreTarget(c)}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
        <div className={adminStyles.modalOverlay} role="dialog" aria-modal="true">
          <div className={adminStyles.modalContent}>
            <div className={adminStyles.modalHeader}>
              <h2>Arquivar Colaborador</h2>
            </div>
            <div className={adminStyles.modalBody}>
              <p>
                Tem certeza de que deseja arquivar <strong>{archiveTarget.name}</strong>?
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--app-color-muted)' }}>
                O colaborador será removido imediatamente da lista pública. Os registros históricos
                serão mantidos e você poderá restaurá-lo como rascunho quando necessário.
              </p>
              <div className={adminStyles.formGroup} style={{ marginTop: 16 }}>
                <label htmlFor="archive-reason">Motivo do arquivamento (opcional):</label>
                <textarea
                  id="archive-reason"
                  className={adminStyles.inputControl}
                  rows={3}
                  placeholder="Ex: Solicitação do autor, revisão pendente..."
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                />
              </div>
            </div>
            <div className={adminStyles.modalFooter}>
              <button
                type="button"
                className={adminStyles.secondaryButton}
                onClick={() => setArchiveTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={adminStyles.dangerButton}
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
        <div className={adminStyles.modalOverlay} role="dialog" aria-modal="true">
          <div className={adminStyles.modalContent}>
            <div className={adminStyles.modalHeader}>
              <h2>Restaurar Colaborador</h2>
            </div>
            <div className={adminStyles.modalBody}>
              <p>
                Deseja restaurar <strong>{restoreTarget.name}</strong> para o status de Rascunho?
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--app-color-muted)' }}>
                Ele voltará a ser visível no painel administrativo e poderá ser editado e publicado novamente.
              </p>
            </div>
            <div className={adminStyles.modalFooter}>
              <button
                type="button"
                className={adminStyles.secondaryButton}
                onClick={() => setRestoreTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={adminStyles.primaryButton}
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

/** Visão Pública de Créditos (Visitantes Não Logados) */
function PublicCreditsView() {
  const location = useLocation();
  const requestedReturn = (location.state as { from?: unknown } | null)?.from;
  const backTo =
    typeof requestedReturn === 'string' &&
    ['/students', '/eventos', '/perfil'].includes(requestedReturn)
      ? requestedReturn
      : '/login';
  const [resource, setResource] = useState<ProjectCreditsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getProjectCredits(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setResource(response);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setLoading(true);
    setError(false);
    setAttempt((current) => current + 1);
  };

  const semesters = useMemo(
    () =>
      sortSemesters(
        (resource?.contributors ?? []).flatMap((person) =>
          person.participations.map((item) => item.semester),
        ),
      ),
    [resource],
  );
  const [semester, setSemester] = useState('all');

  const visibleContributors = useMemo(() => {
    return (resource?.contributors ?? []).filter(
      (person) =>
        semester === 'all' ||
        person.participations.some((participation) => participation.semester === semester),
    );
  }, [resource, semester]);

  return (
    <main className={publicStyles.page}>
      <header className={publicStyles.header}>
        <Link to={backTo} className={publicStyles.backLink}>
          Voltar
        </Link>
        <div className={publicStyles.brand}>
          <img
            src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png"
            alt="FATEC Itaquera"
          />
          <span>Secretaria acadêmica</span>
        </div>
        <h1>Créditos do projeto</h1>
        <p className={publicStyles.intro}>
          Cada semestre deixa sua marca na Carteirinha Digital. Conheça quem ajudou a construir este
          projeto.
        </p>
      </header>

      <div className={publicStyles.content}>
        <section className={publicStyles.headingSurface} aria-labelledby="credits-history-title">
          <span className={publicStyles.eyebrow}>Nossa história</span>
          <div className={publicStyles.sectionHeading}>
            <h2 id="credits-history-title">Quem constrói o projeto</h2>
            <p>Reconhecemos pessoas e contribuições de diferentes etapas do projeto.</p>
          </div>
        </section>

        {semesters.length > 0 && (
          <div className={publicStyles.filters} role="group" aria-label="Filtrar créditos por semestre">
            <button
              type="button"
              aria-pressed={semester === 'all'}
              onClick={() => setSemester('all')}
            >
              Todos os semestres
            </button>
            {semesters.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={semester === value}
                onClick={() => setSemester(value)}
              >
                {formatSemester(value)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p role="status" className={publicStyles.message}>
            Carregando créditos do projeto...
          </p>
        ) : error ? (
          <section className={publicStyles.errorState} role="alert">
            <p>Não foi possível carregar os créditos. Confira sua conexão e tente novamente.</p>
            <button type="button" onClick={retry}>
              Tentar novamente
            </button>
          </section>
        ) : visibleContributors.length === 0 ? (
          <section className={publicStyles.emptyState} aria-live="polite">
            <UsersRound size={36} className={publicStyles.emptyIcon} aria-hidden="true" />
            <h2>Créditos em organização</h2>
            <p>
              A lista histórica será publicada depois de validarmos as participações de cada semestre.
            </p>
          </section>
        ) : (
          <div className={publicStyles.list}>
            {visibleContributors.map((person) => {
              const participations = person.participations.filter(
                (participation) => semester === 'all' || participation.semester === semester,
              );

              return (
                <article key={person.id} className={publicStyles.card}>
                  <div className={publicStyles.avatar} aria-hidden="true">
                    {getInitials(person.name)}
                  </div>
                  <div className={publicStyles.cardContent}>
                    <h2>{person.name}</h2>
                    {participations.map((participation) => (
                      <section key={participation.semester} className={publicStyles.participation}>
                        <h3>{formatSemester(participation.semester)}</h3>
                        {participation.course && (
                          <span className={publicStyles.courseText}>{participation.course}</span>
                        )}
                        <ul className={publicStyles.roles} aria-label="Papéis no projeto">
                          {(participation.roles ?? []).map((role) => (
                            <li key={role}>{role}</li>
                          ))}
                        </ul>
                        {participation.contribution && <p>{participation.contribution}</p>}
                      </section>
                    ))}
                    {(person.contacts ?? []).some(isApprovedProjectCreditHref) && (
                      <nav
                        className={publicStyles.contacts}
                        aria-label={'Contatos profissionais de ' + person.name}
                      >
                        {(person.contacts ?? [])
                          .filter(isApprovedProjectCreditHref)
                          .map((contact) => (
                            <a
                              key={contact.href}
                              className={publicStyles.contactLink}
                              href={contact.href}
                              {...(contact.kind === 'email'
                                ? {}
                                : { target: '_blank', rel: 'noopener noreferrer' })}
                            >
                              {contact.label}
                            </a>
                          ))}
                      </nav>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className={publicStyles.footerNote}>
          A equipe confirma cada participação e cada contato profissional antes da publicação.
        </p>
      </div>
    </main>
  );
}

/** Componente Principal: Roteia entre Visão da Secretaria e Visão Pública */
export default function ProjectCreditsScreen() {
  const session = useSecretarySession();
  const isSecretary = Boolean(inspectSessionToken(session.token));

  if (isSecretary) {
    return <SecretaryCreditsView />;
  }

  return <PublicCreditsView />;
}
