import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Star,
  RefreshCw,
  Download,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  getEventFeedback,
  type EventFeedbackMetrics,
  type EventFeedbackItem,
} from '../../../api/event/publicEventService';
import styles from './EventFeedbackPanel.module.css';

export interface EventFeedbackPanelProps {
  eventId?: string;
}

export const EventFeedbackPanel: React.FC<EventFeedbackPanelProps> = ({ eventId }) => {
  const [metrics, setMetrics] = useState<EventFeedbackMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const fetchFeedback = useCallback(
    async (isManualRefresh = false) => {
      if (!eventId) return;

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const controller = new AbortController();
      try {
        const data = await getEventFeedback(eventId, controller.signal);
        setMetrics(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar as métricas de satisfação do evento.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleExportCsv = () => {
    if (!metrics || metrics.feedbacks.length === 0) return;

    const headers = ['ID da Avaliação', 'Nota (1 a 5)', 'Comentários sobre a Palestra', 'Sugestões de Novos Temas', 'Data de Envio'];
    const rows = metrics.feedbacks.map((f) => [
      `"${f.id}"`,
      f.rating,
      `"${(f.comments || '').replace(/"/g, '""')}"`,
      `"${(f.suggestions || '').replace(/"/g, '""')}"`,
      `"${new Date(f.createdAt).toLocaleString('pt-BR')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pesquisa-satisfacao-evento-${eventId || 'dados'}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredFeedbacks = useMemo(() => {
    if (!metrics) return [];
    if (selectedRating === null) return metrics.feedbacks;
    return metrics.feedbacks.filter((f) => f.rating === selectedRating);
  }, [metrics, selectedRating]);

  // Cálculo da porcentagem de promotores / satisfeitos (notas 4 e 5)
  const satisfactionRate = useMemo(() => {
    if (!metrics || metrics.totalResponses === 0) return 0;
    const promoters =
      (metrics.ratingDistribution[4] || 0) + (metrics.ratingDistribution[5] || 0);
    return Math.round((promoters / metrics.totalResponses) * 100);
  }, [metrics]);

  const renderStars = (rating: number, max = 5) => {
    const stars = [];
    for (let i = 1; i <= max; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
          color={i <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
        />
      );
    }
    return <div className={styles.starsRow}>{stars}</div>;
  };

  return (
    <section className={styles.panel} aria-label="Painel de Pesquisa de Satisfação">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <MessageSquare size={22} />
          </div>
          <h2 className={styles.title}>Pesquisa de Satisfação & Métricas</h2>
          <span className={styles.anonymousBadge} title="Privacidade preservada">
            <ShieldCheck size={14} />
            Respostas 100% Anônimas
          </span>
        </div>

        <div className={styles.actionsArea}>
          <button
            type="button"
            className={styles.buttonOutline}
            onClick={() => fetchFeedback(true)}
            disabled={loading || refreshing}
            aria-label="Atualizar métricas de satisfação"
          >
            <RefreshCw
              size={15}
              className={refreshing ? styles.spinner : undefined}
            />
            <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={handleExportCsv}
            disabled={!metrics || metrics.feedbacks.length === 0}
            title={
              !metrics || metrics.feedbacks.length === 0
                ? 'Nenhuma avaliação para exportar'
                : 'Exportar avaliações anônimas em CSV'
            }
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <div className={styles.privacyAlert} role="note">
        <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Garantia de Anonimato Institucional:</strong> Todas as avaliações são
          coletadas e processadas de forma estritamente anônima. Não há registro de RA,
          nome, e-mail ou endereço IP associados às notas e opiniões individuais.
        </div>
      </div>

      {loading && !metrics ? (
        <div className={styles.emptyState}>
          <RefreshCw size={28} className={styles.spinner} color="#b22222" />
          <p className={styles.emptyStateTitle}>Carregando métricas de satisfação...</p>
        </div>
      ) : error ? (
        <div className={styles.emptyState} style={{ borderColor: '#fca5a5' }}>
          <AlertCircle size={28} color="#dc2626" />
          <p className={styles.emptyStateTitle} style={{ color: '#b91c1c' }}>
            Erro ao carregar métricas
          </p>
          <p className={styles.emptyStateDesc}>{error}</p>
          <button
            type="button"
            className={styles.buttonOutline}
            onClick={() => fetchFeedback(false)}
          >
            Tentar novamente
          </button>
        </div>
      ) : !metrics || metrics.totalResponses === 0 ? (
        <div className={styles.emptyState}>
          <MessageSquare size={32} color="#9ca3af" />
          <p className={styles.emptyStateTitle}>Nenhuma avaliação registrada ainda</p>
          <p className={styles.emptyStateDesc}>
            Assim que os participantes (alunos ou visitantes) concluírem o check-out e
            enviarem o formulário de satisfação, as métricas e comentários aparecerão aqui em
            tempo real.
          </p>
        </div>
      ) : (
        <>
          {/* Grid de Resumo das Métricas */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricCardTitle}>Nota Média da Palestra</span>
              <div className={styles.metricRatingValue}>
                <span className={styles.bigNumber}>
                  {metrics.averageRating.toFixed(1)}
                </span>
                <span className={styles.scaleMax}>/ 5.0</span>
              </div>
              {renderStars(metrics.averageRating)}
              <p className={styles.metricSubtitle}>
                Baseado em {metrics.totalResponses}{' '}
                {metrics.totalResponses === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricCardTitle}>Total de Participantes Avaliadores</span>
              <div className={styles.metricRatingValue}>
                <span className={styles.bigNumber}>{metrics.totalResponses}</span>
              </div>
              <p className={styles.metricSubtitle}>
                Feedbacks anônimos coletados pós-checkout
              </p>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricCardTitle}>Aprovação Geral (Notas 4 e 5)</span>
              <div className={styles.metricRatingValue}>
                <span className={styles.bigNumber} style={{ color: '#16a34a' }}>
                  {satisfactionRate}%
                </span>
              </div>
              <p className={styles.metricSubtitle}>
                Participantes altamente satisfeitos com o conteúdo
              </p>
            </div>
          </div>

          {/* Distribuição de Notas (1 a 5 Estrelas) */}
          <div className={styles.distributionSection}>
            <h3 className={styles.sectionHeading}>Distribuição das Avaliações</h3>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = metrics.ratingDistribution[stars as keyof typeof metrics.ratingDistribution] || 0;
              const percentage =
                metrics.totalResponses > 0
                  ? Math.round((count / metrics.totalResponses) * 100)
                  : 0;
              const isActive = selectedRating === stars;

              return (
                <div
                  key={stars}
                  className={`${styles.distRow} ${isActive ? styles.distRowActive : ''}`}
                  onClick={() => setSelectedRating(isActive ? null : stars)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedRating(isActive ? null : stars);
                    }
                  }}
                  title={`Filtrar apenas avaliações com nota ${stars}`}
                >
                  <div className={styles.distLabel}>
                    <span>{stars}</span>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  </div>

                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className={styles.distCount}>
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Filtros e Lista de Feedbacks */}
          <div className={styles.filterBar}>
            <h3 className={styles.sectionHeading} style={{ margin: 0 }}>
              Comentários e Sugestões dos Participantes ({filteredFeedbacks.length})
            </h3>

            <div className={styles.filterChips} role="group" aria-label="Filtrar por nota">
              <button
                type="button"
                className={`${styles.chip} ${selectedRating === null ? styles.chipActive : ''}`}
                onClick={() => setSelectedRating(null)}
              >
                Todas ({metrics.totalResponses})
              </button>
              {[5, 4, 3, 2, 1].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`${styles.chip} ${selectedRating === num ? styles.chipActive : ''}`}
                  onClick={() => setSelectedRating(num)}
                >
                  {num} ★ ({metrics.ratingDistribution[num as keyof typeof metrics.ratingDistribution] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className={styles.feedbackList}>
            {filteredFeedbacks.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: '24px 16px' }}>
                <p className={styles.emptyStateTitle}>Nenhum feedback com a nota selecionada.</p>
              </div>
            ) : (
              filteredFeedbacks.map((item: EventFeedbackItem) => (
                <article key={item.id} className={styles.feedbackCard}>
                  <header className={styles.feedbackCardHeader}>
                    <div className={styles.starsAndRating}>
                      {renderStars(item.rating)}
                      <span className={styles.ratingTag}>Nota {item.rating}/5</span>
                      <span className={styles.anonymousBadge} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        Participante Anônimo
                      </span>
                    </div>
                    <time className={styles.dateBadge} dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </header>

                  <div className={styles.feedbackBody}>
                    <div className={styles.feedbackBlock}>
                      <span className={styles.blockLabel}>
                        <MessageSquare size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }} />
                        Comentários sobre a palestra:
                      </span>
                      {item.comments && item.comments.trim().length > 0 ? (
                        <p className={styles.blockText}>{item.comments}</p>
                      ) : (
                        <p className={styles.emptyText}>(Nenhum comentário adicionado)</p>
                      )}
                    </div>

                    <div className={styles.feedbackBlock}>
                      <span className={styles.blockLabel}>
                        <Sparkles size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }} />
                        Sugestão de temas para o próximo evento:
                      </span>
                      {item.suggestions && item.suggestions.trim().length > 0 ? (
                        <p className={styles.blockText}>{item.suggestions}</p>
                      ) : (
                        <p className={styles.emptyText}>(Nenhuma sugestão adicionada)</p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
};
