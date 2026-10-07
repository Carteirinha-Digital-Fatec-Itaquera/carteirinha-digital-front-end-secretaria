import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save,
  Upload,
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  History,
  AlertCircle,
} from 'lucide-react';
import MenuLateral from '../../components/menuLateral/MenuLateral';
import MessageModal from '../../components/messageModal/MessageModal';
import { useCreditMessages } from './useCreditMessages';
import CreditsHistoryModal from './CreditsHistoryModal';
import {
  createContributorDraft,
  getAdminContributor,
  updateContributor,
  publishContributor,
} from '../../api/projectCredits/projectCreditsAdminService';
import { ApiRequestError } from '../../api/config/apiRequest';
import type {
  AdminProjectContributorDetail,
  ProjectCreditContactKind,
  ProjectCreditContributor,
} from '../../domains/ProjectCredits';
import {
  isValidSemester,
  formatSemester,
  isApprovedProjectCreditHref,
} from '../../utils/projectCreditContact';
import styles from './styleCreditsAdmin.module.css';
import publicStyles from './styleProjectCredits.module.css';

interface FormParticipation {
  semester: string;
  course: string;
  rolesString: string;
  contribution: string;
  confirmed: boolean;
}

interface FormLink {
  kind: ProjectCreditContactKind;
  label: string;
  url: string;
  confirmed: boolean;
}

export default function CreditsFormScreen() {
  const { messageDialog, closeMessage, notify, confirm } = useCreditMessages();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  // Core state
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [version, setVersion] = useState<number>(1);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [name, setName] = useState('');
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [participations, setParticipations] = useState<FormParticipation[]>([
    { semester: '', course: '', rolesString: '', contribution: '', confirmed: true },
  ]);
  const [links, setLinks] = useState<FormLink[]>([]);

  // Feedback and conflicts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [passwordExpired, setPasswordExpired] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [previewTab, setPreviewTab] = useState<'draft' | 'published'>('draft');
  const [rawDetail, setRawDetail] = useState<AdminProjectContributorDetail | null>(null);

  // Load existing contributor
  const loadContributor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);
    setVersionConflict(false);
    setPasswordExpired(false);

    try {
      const data = await getAdminContributor(id);
      setRawDetail(data);
      setName(data.name);
      setVersion(data.draftVersion);
      setPublishedVersion(data.publishedVersion);
      setStatus(data.status);
      setProfileConfirmed(data.profileConfirmed);

      setParticipations(
        data.participations.map((p) => ({
          semester: p.semester,
          course: p.course || '',
          rolesString: p.roles.join(', '),
          contribution: p.contribution || '',
          confirmed: p.confirmed ?? true,
        })),
      );

      setLinks(
        data.links.map((l) => ({
          kind: l.kind,
          label: l.label,
          url: l.url,
          confirmed: l.confirmed ?? true,
        })),
      );
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
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar colaborador');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEditing) {
      loadContributor();
    }
  }, [isEditing, loadContributor]);

  // Repeater handlers
  const addParticipation = () => {
    setParticipations((prev) => [
      ...prev,
      { semester: '', course: '', rolesString: '', contribution: '', confirmed: true },
    ]);
  };

  const removeParticipation = (index: number) => {
    setParticipations((prev) => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      { kind: 'github', label: 'GitHub', url: 'https://github.com/', confirmed: true },
    ]);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Prepare DTO payload
  const buildPayload = () => {
    const formattedParticipations = participations
      .filter((p) => p.semester.trim())
      .map((p, index) => ({
        semester: p.semester.trim(),
        course: p.course.trim() || null,
        roles: p.rolesString
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        contribution: p.contribution.trim() || null,
        confirmed: p.confirmed,
        order: index,
      }));

    const formattedLinks = links
      .filter((l) => l.url.trim())
      .map((l, index) => ({
        kind: l.kind,
        label: l.label.trim() || 'Link',
        url: l.url.trim(),
        confirmed: l.confirmed,
        order: index,
      }));

    return {
      name: name.trim(),
      profileConfirmed,
      participations: formattedParticipations,
      links: formattedLinks,
    };
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!name.trim()) {
      notify('Informe o nome do colaborador antes de salvar o rascunho.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVersionConflict(false);

    try {
      const payload = buildPayload();

      if (!id) {
        const created = await createContributorDraft({
          name: payload.name,
          profileConfirmed: payload.profileConfirmed,
        });

        // If there were participations or links added before initial creation, save them now
        if (payload.participations.length > 0 || payload.links.length > 0) {
          const updated = await updateContributor(created.id, {
            expectedVersion: created.draftVersion,
            ...payload,
          });
          navigate(`/creditos/${updated.id}/editar`, { replace: true });
        } else {
          navigate(`/creditos/${created.id}/editar`, { replace: true });
        }
      } else {
        const updated = await updateContributor(id, {
          expectedVersion: version,
          ...payload,
        });
        setVersion(updated.draftVersion);
        setPublishedVersion(updated.publishedVersion);
        setStatus(updated.status);
        setSuccessMessage('Rascunho salvo com sucesso!');
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) {
          setVersionConflict(true);
          return;
        }
        if (err.code === 'PASSWORD_RENEWAL_REQUIRED') {
          setPasswordExpired(true);
          return;
        }
      }
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar rascunho');
    } finally {
      setSubmitting(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!name.trim()) {
      notify('O nome do colaborador é obrigatório para publicação.');
      return;
    }

    if (!profileConfirmed) {
      notify('Você deve confirmar a autorização do colaborador para a divulgação dos dados.');
      return;
    }

    const payload = buildPayload();
    if (payload.participations.length === 0) {
      notify('O colaborador deve ter ao menos um semestre com participação registrada para ser publicado.');
      return;
    }

    for (const p of payload.participations) {
      if (!isValidSemester(p.semester)) {
        notify(`O semestre "${p.semester}" é inválido. Utilize o formato YYYY.1 ou YYYY.2 (ex: 2026.1).`);
        return;
      }
      if (p.roles.length === 0) {
        notify(`Informe ao menos uma função/papel para o semestre ${p.semester}.`);
        return;
      }
    }

    for (const l of payload.links) {
      if (!isApprovedProjectCreditHref({ kind: l.kind, label: l.label, href: l.url })) {
        notify(`O link "${l.url}" é inválido ou inseguro. Certifique-se de usar HTTPS válido.`);
        return;
      }
    }

    if (!(await confirm(`Deseja publicar as informações de ${name.trim()} na Carteirinha Digital?`))) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVersionConflict(false);

    try {
      let targetId = id;
      let targetVersion = version;

      if (!targetId) {
        const created = await createContributorDraft({
          name: payload.name,
          profileConfirmed: true,
        });
        targetId = created.id;
        targetVersion = created.draftVersion;
      }

      // First save all changes
      const updated = await updateContributor(targetId, {
        expectedVersion: targetVersion,
        ...payload,
      });

      // Then publish
      const published = await publishContributor(targetId, {
        expectedVersion: updated.draftVersion,
        profileConfirmed: true,
      });

      setVersion(published.draftVersion);
      setPublishedVersion(published.publishedVersion);
      setStatus(published.status);
      setSuccessMessage('Colaborador publicado com sucesso no catálogo público!');

      if (!id) {
        navigate(`/creditos/${published.id}/editar`, { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) {
          setVersionConflict(true);
          return;
        }
        if (err.code === 'PASSWORD_RENEWAL_REQUIRED') {
          setPasswordExpired(true);
          return;
        }
      }
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao publicar colaborador');
    } finally {
      setSubmitting(false);
    }
  };

  // Live preview card data calculation
  const previewContributor = useMemo(() => {
    if (previewTab === 'published' && rawDetail?.publishedSnapshot) {
      return rawDetail.publishedSnapshot as ProjectCreditContributor;
    }
    return {
      id: id || 'preview-temp-id',
      name: name.trim() || 'Nome do Colaborador',
      photoUrl: null,
      participations: participations
        .filter((p) => p.semester.trim())
        .map((p) => ({
          semester: p.semester.trim(),
          course: p.course.trim() || null,
          roles: p.rolesString
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
          contribution: p.contribution.trim() || null,
        })),
      contacts: links
        .filter((l) => l.url.trim())
        .map((l) => ({
          kind: l.kind,
          label: l.label.trim() || 'Link',
          href: l.url.trim(),
        })),
    };
  }, [id, name, participations, links, previewTab, rawDetail]);

  if (loading) {
    return (
      <div className={styles.adminContainer}>
        <MenuLateral />
      <MessageModal visible={Boolean(messageDialog)} tone={messageDialog?.confirmation ? 'warning' : 'error'} title={messageDialog?.confirmation ? 'Confirmar publicação' : 'Confira as informações'} message={messageDialog?.message ?? ''} confirmText={messageDialog?.confirmation ? 'Confirmar' : 'OK'} cancelText={messageDialog?.confirmation ? 'Cancelar' : undefined} onConfirm={() => closeMessage(true)} onCancel={() => closeMessage(false)} onDismiss={() => closeMessage(false)} />
        <main className={styles.mainContent}>
          <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--app-color-muted)' }}>
            Carregando dados do colaborador...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <MenuLateral />
      <MessageModal visible={Boolean(messageDialog)} tone={messageDialog?.confirmation ? 'warning' : 'error'} title={messageDialog?.confirmation ? 'Confirmar publicação' : 'Confira as informações'} message={messageDialog?.message ?? ''} confirmText={messageDialog?.confirmation ? 'Confirmar' : 'OK'} cancelText={messageDialog?.confirmation ? 'Cancelar' : undefined} onConfirm={() => closeMessage(true)} onCancel={() => closeMessage(false)} onDismiss={() => closeMessage(false)} />
      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerText}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Link to="/creditos/gerenciar" className={styles.iconActionButton} title="Voltar à lista">
                <ArrowLeft size={18} />
              </Link>
              <h1>{isEditing ? `Editar Colaborador: ${name || '...'}` : 'Novo Colaborador'}</h1>
            </div>
            <p>
              Preencha os dados e participações acadêmicas. Salve rascunhos com flexibilidade e
              publique com validação completa.
            </p>
            {isEditing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <span className={styles.versionBadge}>Versão em edição: v{version}</span>
                {publishedVersion ? (
                  <span className={`${styles.statusBadge} ${styles.statusPublished}`}>
                    Publicado: v{publishedVersion}
                  </span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                    Ainda não publicado
                  </span>
                )}
                {status === 'ARCHIVED' && (
                  <span className={`${styles.statusBadge} ${styles.statusArchived}`}>
                    Arquivado
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSaveDraft}
              disabled={submitting}
            >
              <Save size={16} />
              Salvar Rascunho
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handlePublish}
              disabled={submitting}
            >
              <Upload size={16} />
              Publicar Alterações
            </button>
            {isEditing && (
              <button
                type="button"
                className={styles.iconActionButton}
                title="Histórico de Auditoria"
                aria-label="Ver Histórico"
                onClick={() => setShowHistoryModal(true)}
              >
                <History size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Alertas */}
        {passwordExpired && (
          <div className={styles.passwordRenewalAlert} role="alert">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} />
              Renovação de Senha Necessária
            </h3>
            <p style={{ margin: 0 }}>
              O prazo de validade da sua senha expirou. Por motivos de segurança, você deve redefinir sua
              senha antes de salvar alterações nos créditos.{' '}
              <Link to="/redefinir-senha" style={{ fontWeight: 'bold', color: 'inherit' }}>
                Clique aqui para redefinir sua senha agora
              </Link>
              .
            </p>
          </div>
        )}

        {versionConflict && (
          <div className={styles.conflictAlert} role="alert">
            <h3>
              <AlertTriangle size={20} />
              Conflito de Versão Detectado
            </h3>
            <p>
              Outro usuário salvou alterações neste colaborador enquanto você editava. Seus dados digitados
              foram preservados na tela para que não perca seu trabalho.
            </p>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={loadContributor}
                style={{ background: '#fff', borderColor: '#fdba74' }}
              >
                Recarregar versão mais recente do servidor
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className={styles.conflictAlert} role="alert">
            <p style={{ margin: 0 }}>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--app-radius-card)',
              padding: '16px 20px',
              color: '#065f46',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            role="status"
          >
            <CheckCircle size={20} />
            <p style={{ margin: 0, fontWeight: 600 }}>{successMessage}</p>
          </div>
        )}

        {/* Layout Grid: Form (left) + Live Preview (right) */}
        <div className={styles.formGrid}>
          {/* Coluna do Formulário */}
          <div className={styles.formColumn}>
            {/* Bloco 1: Identificação */}
            <section className={styles.blockCard}>
              <div className={styles.blockHeader}>
                <h2>1. Identificação do Colaborador</h2>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contributor-name">Nome Completo *</label>
                <input
                  id="contributor-name"
                  type="text"
                  className={styles.inputControl}
                  placeholder="Ex: Wellington Silva"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setProfileConfirmed(false); }}
                  required
                />
              </div>

              <div className={styles.formGroup} aria-label="Foto de perfil demonstrativa">
                <label>Foto de perfil — em breve</label>
                <div className={styles.photoRow}>
                  <div className={styles.photoPreviewFrame} aria-hidden="true">
                    <span>{name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?'}</span>
                  </div>
                  <div className={styles.photoActions}>
                    <button type="button" className={styles.secondaryButton} disabled>Selecionar imagem</button>
                    <small>Área demonstrativa. O envio de fotos ainda não está disponível.</small>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={profileConfirmed}
                    onChange={(e) => setProfileConfirmed(e.target.checked)}
                  />
                  <span className={styles.checkboxText}>
                    <strong>Autorização para publicação:</strong> Confirmo que o
                    colaborador autorizou expressamente a divulgação de seu nome, curso, participações e links
                    profissionais nesta aplicação acadêmica da FATEC Itaquera.
                  </span>
                </label>
              </div>
            </section>

            {/* Bloco 2: Participações por Semestre */}
            <section className={styles.blockCard}>
              <div className={styles.blockHeader}>
                <h2>2. Participações por Semestre</h2>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={addParticipation}
                  style={{ padding: '6px 12px', minHeight: 36, fontSize: '0.85rem' }}
                >
                  <Plus size={15} /> Adicionar Semestre
                </button>
              </div>

              {participations.map((part, index) => (
                <div key={index} className={styles.subItemCard}>
                  <div className={styles.subItemHeader}>
                    <span className={styles.subItemTitle}>
                      Semestre #{index + 1}
                      {part.semester && isValidSemester(part.semester) && (
                        <span style={{ marginLeft: 8, color: 'var(--app-color-primary)', fontWeight: 'normal' }}>
                          ({formatSemester(part.semester)})
                        </span>
                      )}
                    </span>
                    {participations.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeSubItemButton}
                        onClick={() => removeParticipation(index)}
                      >
                        <Trash2 size={14} /> Remover
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className={styles.formGroup}>
                      <label>Semestre (formato YYYY.1 ou YYYY.2) *</label>
                      <input
                        type="text"
                        className={styles.inputControl}
                        placeholder="Ex: 2026.1"
                        value={part.semester}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParticipations((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, semester: val } : item)),
                          );
                        }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Curso Acadêmico (opcional)</label>
                      <input
                        type="text"
                        className={styles.inputControl}
                        placeholder="Ex: Análise e Desenvolvimento de Sistemas"
                        value={part.course}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParticipations((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, course: val } : item)),
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Funções / Papéis no Projeto (separados por vírgula) *</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      placeholder="Ex: Desenvolvedor Full Stack, Designer UI, Líder Técnico"
                      value={part.rolesString}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParticipations((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, rolesString: val } : item)),
                        );
                      }}
                    />
                    <small>Exemplo: Frontend, Backend, Documentação</small>
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Descrição da Contribuição (opcional)</label>
                    <textarea
                      className={styles.inputControl}
                      rows={2}
                      placeholder="Ex: Criação da arquitetura inicial do backend e carteirinha digital..."
                      value={part.contribution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParticipations((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, contribution: val } : item)),
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* Bloco 3: Links e Redes Profissionais */}
            <section className={styles.blockCard}>
              <div className={styles.blockHeader}>
                <h2>3. Links e Redes Profissionais</h2>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={addLink}
                  style={{ padding: '6px 12px', minHeight: 36, fontSize: '0.85rem' }}
                >
                  <Plus size={15} /> Adicionar Link
                </button>
              </div>

              {links.length === 0 ? (
                <p style={{ color: 'var(--app-color-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Nenhum link adicionado. Clique no botão acima para adicionar GitHub, LinkedIn,
                  Portfólio ou links externos.
                </p>
              ) : (
                links.map((link, index) => (
                  <div key={index} className={styles.subItemCard}>
                    <div className={styles.subItemHeader}>
                      <span className={styles.subItemTitle}>Link #{index + 1}</span>
                      <button
                        type="button"
                        className={styles.removeSubItemButton}
                        onClick={() => removeLink(index)}
                      >
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 180px 1fr', gap: 12 }}>
                      <div className={styles.formGroup}>
                        <label>Tipo</label>
                        <select
                          className={styles.inputControl}
                          value={link.kind}
                          onChange={(e) => {
                            const val = e.target.value as ProjectCreditContactKind;
                            setLinks((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, kind: val } : item)),
                            );
                          }}
                        >
                          <option value="github">GitHub</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="portfolio">Portfólio</option>
                          <option value="email">E-mail</option>
                          <option value="external">Link Externo</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Rótulo</label>
                        <input
                          type="text"
                          className={styles.inputControl}
                          placeholder="Ex: GitHub, Blog..."
                          value={link.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLinks((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, label: val } : item)),
                            );
                          }}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>URL (HTTPS obrigatório) *</label>
                        <input
                          type="url"
                          className={styles.inputControl}
                          placeholder={link.kind === 'email' ? 'contato@exemplo.com' : 'https://...'}
                          value={link.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLinks((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, url: val } : item)),
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>

          {/* Coluna da Prévia em Tempo Real */}
          <div className={styles.previewColumn}>
            <div className={styles.blockCard}>
              <div className={styles.blockHeader}>
                <h2>Prévia em Tempo Real</h2>
                {publishedVersion && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{
                        padding: '4px 10px',
                        minHeight: 32,
                        fontSize: '0.8rem',
                        backgroundColor: previewTab === 'draft' ? 'var(--app-color-primary-soft)' : '#fff',
                        borderColor: previewTab === 'draft' ? 'var(--app-color-primary)' : 'var(--app-color-border)',
                      }}
                      onClick={() => setPreviewTab('draft')}
                    >
                      Rascunho
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{
                        padding: '4px 10px',
                        minHeight: 32,
                        fontSize: '0.8rem',
                        backgroundColor: previewTab === 'published' ? 'var(--app-color-primary-soft)' : '#fff',
                        borderColor: previewTab === 'published' ? 'var(--app-color-primary)' : 'var(--app-color-border)',
                      }}
                      onClick={() => setPreviewTab('published')}
                    >
                      Publicado
                    </button>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--app-color-muted)', marginTop: 0 }}>
                Visualização do cartão como será exibido para alunos e visitantes:
              </p>

              {/* Renderização do Card fiel à página pública */}
              <article
                className={publicStyles.card}
                style={{
                  gridTemplateColumns: '52px minmax(0, 1fr)',
                  marginTop: 16,
                  border: '1px solid var(--app-color-border)',
                }}
              >
                <div className={publicStyles.avatar}>
                  {previewContributor.photoUrl ? (
                    <img
                      src={previewContributor.photoUrl}
                      alt={'Foto de ' + previewContributor.name}
                      className={publicStyles.avatarImage}
                    />
                  ) : (
                    previewContributor.name.trim().charAt(0).toUpperCase()
                  )}
                </div>

                <div className={publicStyles.cardContent}>
                  <h2>{previewContributor.name}</h2>

                  {previewContributor.participations.length === 0 ? (
                    <p style={{ color: 'var(--app-color-muted)', fontSize: '0.85rem' }}>
                      Nenhuma participação registrada.
                    </p>
                  ) : (
                    previewContributor.participations.map((p, idx) => (
                      <section key={idx} className={publicStyles.participation}>
                        <h3>{p.semester ? formatSemester(p.semester) : 'Semestre a definir'}</h3>
                        {p.course && <span className={publicStyles.courseText}>{p.course}</span>}
                        <ul className={publicStyles.roles}>
                          {p.roles.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                        {p.contribution && <p>{p.contribution}</p>}
                      </section>
                    ))
                  )}

                  {previewContributor.contacts.length > 0 && (
                    <nav className={publicStyles.contacts} aria-label="Contatos">
                      {previewContributor.contacts
                        .filter(isApprovedProjectCreditHref)
                        .map((c, cIdx) => (
                          <a
                            key={cIdx}
                            className={publicStyles.contactLink}
                            href={c.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {c.label}
                          </a>
                        ))}
                    </nav>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Histórico */}
      {showHistoryModal && id && (
        <CreditsHistoryModal
          contributorId={id}
          contributorName={name}
          isOpen={true}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
