import { useState, useEffect, useMemo } from 'react';
import type { Template, Signer } from '../../../api/event/publicEventService';
import { fetchAssetBlobUrl } from '../../../api/event/publicEventService';
import styles from './styleCertificatePreview.module.css';

export interface CertificatePreviewProps {
  role?: 'ATTENDEE' | 'SPEAKER';
  template: Template | null;
  signerIds: string[];
  allSigners: Signer[];
  eventTitle: string;
  speaker?: string;
  promoter?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  workloadHours?: string;
  availableRoles?: Array<'ATTENDEE' | 'SPEAKER'>;
  onRoleChange?: (role: 'ATTENDEE' | 'SPEAKER') => void;
  onOpenPdfModal?: () => void;
  isSubmittingPdf?: boolean;
}

export function CertificatePreview({
  role = 'ATTENDEE',
  template,
  signerIds,
  allSigners,
  eventTitle,
  speaker,
  promoter,
  startDate,
  startTime,
  endDate,
  endTime,
  workloadHours,
  availableRoles,
  onRoleChange,
  onOpenPdfModal,
  isSubmittingPdf = false,
}: CertificatePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // Assinaturas selecionadas na ordem exata de signerIds
  const selectedSigners = useMemo(() => {
    const map = new Map(allSigners.map((s) => [s.id, s]));
    return signerIds.map((id) => map.get(id)).filter(Boolean) as Signer[];
  }, [signerIds, allSigners]);

  // Carregar imagens de assinaturas de forma assíncrona
  useEffect(() => {
    if (typeof fetchAssetBlobUrl !== 'function') return;
    const controller = new AbortController();
    const assetsToLoad = selectedSigners
      .filter((s) => s.assetId)
      .map((s) => ({ id: s.id, assetId: s.assetId! }));

    if (assetsToLoad.length === 0) {
      setSignatureUrls({});
      return;
    }

    Promise.all(
      assetsToLoad.map(async ({ id, assetId }) => {
        try {
          const res = fetchAssetBlobUrl(assetId, controller.signal);
          const url = res && typeof (res as Promise<string>).then === 'function'
            ? await res
            : '';
          return { id, url };
        } catch {
          return { id, url: '' };
        }
      })
    ).then((results) => {
      if (!controller.signal.aborted) {
        const next: Record<string, string> = {};
        for (const item of results) {
          if (item.url) next[item.id] = item.url;
        }
        setSignatureUrls(next);
      }
    });

    return () => {
      controller.abort();
    };
  }, [selectedSigners]);

  // Carregar imagem de background do template se houver
  useEffect(() => {
    if (typeof fetchAssetBlobUrl !== 'function') return;
    const bgId = template?.config?.backgroundAssetId;
    if (!bgId) {
      setBackgroundUrl(null);
      return;
    }
    const controller = new AbortController();
    async function loadBackground() {
      try {
        const res = fetchAssetBlobUrl(bgId!, controller.signal);
        const url = res && typeof (res as Promise<string>).then === 'function'
          ? await res
          : null;
        if (!controller.signal.aborted) {
          setBackgroundUrl(url);
        }
      } catch {
        if (!controller.signal.aborted) {
          setBackgroundUrl(null);
        }
      }
    }
    loadBackground();
    return () => {
      controller.abort();
    };
  }, [template?.config?.backgroundAssetId]);

  // Formatação de data em pt-BR
  const dateText = useMemo(() => {
    if (!startDate) return '26 de outubro de 2026';
    const [year, month, day] = startDate.split('-').map(Number);
    if (!year || !month || !day) return '26 de outubro de 2026';
    const startObj = new Date(year, month - 1, day, 12, 0, 0);
    const startStr = startObj.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (endDate && endDate !== startDate) {
      const [y2, m2, d2] = endDate.split('-').map(Number);
      if (y2 && m2 && d2) {
        const endObj = new Date(y2, m2 - 1, d2, 12, 0, 0);
        const endStr = endObj.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        return `${startStr} a ${endStr}`;
      }
    }
    return startStr;
  }, [startDate, endDate]);

  // Carga horária formatada
  const workloadText = useMemo(() => {
    const hours = workloadHours?.trim();
    if (!hours || isNaN(Number(hours))) return '2 horas';
    return Number(hours) === 1 ? '1 hora' : `${hours} horas`;
  }, [workloadHours]);

  // Nome do participante ou palestrante
  const isSpeaker = role === 'SPEAKER';
  const studentName = isSpeaker
    ? speaker?.trim() || 'Nome do Palestrante (Demonstração)'
    : 'Nome completo de demonstração';

  const actionText = isSpeaker
    ? 'ministrou a palestra intitulada'
    : 'participou da palestra intitulada';

  const displayTitle = eventTitle.trim() || 'Título da palestra de demonstração';
  const displayPromoter = promoter?.trim();
  const displayEdition =
    template?.config?.edition ||
    "Semana de Tecnologia da Fatec Itaquera 'Professor Miguel Reale'";
  const headingText = template?.config?.heading || 'CERTIFICADO';

  const timeRangeText =
    startTime && endTime ? `, das ${startTime} às ${endTime}` : '';

  const isCustomTemplate = Boolean(template && template.config);

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <div className={styles.previewTitleArea}>
          <h4 className={styles.previewTitle}>Prévia do Certificado</h4>
          <span className={styles.previewBadge}>Sem validade</span>
        </div>

        {availableRoles && availableRoles.length > 1 && onRoleChange && (
          <div className={styles.roleSelector}>
            <button
              type="button"
              className={`${styles.roleBtn} ${role === 'ATTENDEE' ? styles.roleBtnActive : ''}`}
              onClick={() => onRoleChange('ATTENDEE')}
            >
              Participante
            </button>
            <button
              type="button"
              className={`${styles.roleBtn} ${role === 'SPEAKER' ? styles.roleBtnActive : ''}`}
              onClick={() => onRoleChange('SPEAKER')}
            >
              Palestrante
            </button>
          </div>
        )}

        <div className={styles.actionButtons}>
          {onOpenPdfModal && (
            <button
              type="button"
              className={styles.conferirPdfBtn}
              onClick={onOpenPdfModal}
              disabled={isSubmittingPdf || !signerIds.length}
              title={
                !signerIds.length
                  ? 'Selecione ao menos um assinante para conferir o PDF'
                  : 'Gerar e visualizar PDF oficial de conferência com os dados deste formulário'
              }
            >
              {isSubmittingPdf ? 'Gerando PDF...' : '📄 Conferir PDF'}
            </button>
          )}

          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Recolher prévia' : 'Expandir prévia'}
          >
            {isExpanded ? '⤢ Recolher' : '⤢ Expandir'}
          </button>
        </div>
      </div>

      {!signerIds.length && (
        <div className={styles.warningNotice}>
          ⚠️ Nenhuma assinatura selecionada. Selecione de 1 a 3 assinantes para compor o certificado.
        </div>
      )}

      <div className={styles.svgViewport}>
        <svg
          viewBox="0 0 842 595"
          className={styles.svgRoot}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fundo do Certificado */}
          {backgroundUrl ? (
            <image href={backgroundUrl} x="0" y="0" width="842" height="595" preserveAspectRatio="none" />
          ) : isCustomTemplate ? (
            /* Layout de Referência da Semana de Tecnologia */
            <g id="reference-background">
              <rect x="0" y="0" width="842" height="595" fill="#FAFAFA" />
              {/* Moldura vermelha e faixa preta */}
              <rect x="33" y="33" width="776" height="529" fill="none" stroke="#c00000" strokeWidth="5.5" />
              <rect x="36" y="563" width="786" height="6" fill="#000000" />
              <rect x="815" y="36" width="6" height="533" fill="#000000" />

              {/* Cabeçalho da Semana com algarismos romanos */}
              <g transform="translate(48, 42)">
                <text x="310" y="48" fontSize="42" fontWeight="bold" fill="#000000" textAnchor="end">
                  XIII
                </text>
                <text x="325" y="32" fontSize="15" fontWeight="bold" fill="#000000">
                  SEMANA DE
                </text>
                <text x="325" y="48" fontSize="15" fontWeight="bold" fill="#000000">
                  TECNOLOGIA
                </text>
                <text x="325" y="62" fontSize="9" fill="#555555">
                  FATEC ITAQUERA
                </text>
              </g>
            </g>
          ) : (
            /* Modelo Institucional Padrão Fatec */
            <g id="institutional-background">
              <rect x="0" y="0" width="842" height="595" fill="#FFFFFF" />
              <rect x="24" y="24" width="794" height="547" fill="none" stroke="#BA1A1A" strokeWidth="2.5" />
              <rect x="31" y="31" width="780" height="533" fill="none" stroke="#D9D9D9" strokeWidth="0.8" />
              <text x="70" y="65" fontSize="14" fontWeight="bold" fill="#BA1A1A">
                CENTRO PAULA SOUZA · GOVERNO DO ESTADO DE SÃO PAULO
              </text>
              <text x="70" y="82" fontSize="12" fontWeight="bold" fill="#202124">
                FACULDADE DE TECNOLOGIA DE ITAQUERA 'PROFESSOR MIGUEL REALE'
              </text>
            </g>
          )}

          {/* Heading */}
          <text
            x="421"
            y={isCustomTemplate ? '155' : '150'}
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontStyle="italic"
            fontSize="32"
            fill="#000000"
          >
            {headingText}
          </text>

          {/* Texto principal do certificado via foreignObject para quebra fiel e fluida */}
          <foreignObject x="70" y="200" width="702" height="135">
            <div
              style={{
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#1a1a1a',
                textAlign: 'justify',
                margin: 0,
                padding: 0,
              }}
            >
              Certificamos que{' '}
              <strong><em>{studentName}</em></strong>{' '}
              {actionText}: “<strong><em>{displayTitle}</em></strong>”,{' '}
              {displayPromoter ? `promovida por ${displayPromoter}, ` : ''}
              realizada no dia {dateText}{timeRangeText}, na {displayEdition}, com carga horária de {workloadText}.
            </div>
          </foreignObject>

          {/* Data e Localidade */}
          <text
            x="421"
            y="360"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="14"
            fill="#333333"
          >
            São Paulo, {dateText}.
          </text>

          {/* Marca d'água SEM VALIDADE / DEMONSTRAÇÃO */}
          <text
            x="421"
            y="310"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize="44"
            fill="#BA1A1A"
            fillOpacity="0.22"
            transform="rotate(-12 421 310)"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            PRÉVIA — SEM VALIDADE
          </text>

          {/* Assinaturas */}
          {selectedSigners.length > 0 && (
            <g id="signatures-group">
              {(() => {
                const count = selectedSigners.length;
                const width = 600 / count;
                return selectedSigners.map((signer, index) => {
                  const x = 120 + index * width;
                  const cx = x + width / 2;
                  const imgUrl = signatureUrls[signer.id];
                  const lineWidth = Math.min(260, width - 20);

                  return (
                    <g key={signer.id}>
                      {imgUrl ? (
                        <image
                          href={imgUrl}
                          x={cx - 55}
                          y="405"
                          width="110"
                          height="45"
                          preserveAspectRatio="xMidYMid meet"
                        />
                      ) : (
                        /* Linha indicativa quando asset ainda não carregou */
                        <text
                          x={cx}
                          y="435"
                          textAnchor="middle"
                          fontSize="10"
                          fill="#94a3b8"
                          fontStyle="italic"
                        >
                          [Assinatura digital]
                        </text>
                      )}

                      {/* Linha preta horizontal de assinatura */}
                      <line
                        x1={cx - lineWidth / 2}
                        y1="457"
                        x2={cx + lineWidth / 2}
                        y2="457"
                        stroke="#000000"
                        strokeWidth="1"
                      />

                      {/* Nome do assinante */}
                      <text
                        x={cx}
                        y="475"
                        textAnchor="middle"
                        fontFamily="Helvetica, Arial, sans-serif"
                        fontSize={count > 1 ? 11 : 13}
                        fontWeight="bold"
                        fontStyle="italic"
                        fill="#000000"
                      >
                        {signer.name}
                      </text>

                      {/* Cargo e Curso */}
                      <text
                        x={cx}
                        y="493"
                        textAnchor="middle"
                        fontFamily="Helvetica, Arial, sans-serif"
                        fontSize={count > 1 ? 9.5 : 11}
                        fill="#444444"
                      >
                        {signer.title} {signer.course ? `(${signer.course})` : ''}
                      </text>
                    </g>
                  );
                });
              })()}
            </g>
          )}
        </svg>
      </div>

      <div className={styles.previewFooter}>
        <span>
          Atualização instantânea em tempo real. Não gera registros de certificado nem PDF no servidor.
        </span>
        {selectedSigners.length > 0 && (
          <span>
            {selectedSigners.length}{' '}
            {selectedSigners.length === 1 ? 'assinatura selecionada' : 'assinaturas selecionadas'}
          </span>
        )}
      </div>

      {/* Modal de ampliação em tela cheia */}
      {isExpanded && (
        <div className={styles.modalOverlay} onClick={() => setIsExpanded(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Visualização Ampliada — Prévia do Certificado
              </h5>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsExpanded(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <svg
                viewBox="0 0 842 595"
                style={{ width: '100%', height: 'auto', maxHeight: '80vh' }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {backgroundUrl ? (
                  <image href={backgroundUrl} x="0" y="0" width="842" height="595" preserveAspectRatio="none" />
                ) : isCustomTemplate ? (
                  <g id="modal-reference-background">
                    <rect x="0" y="0" width="842" height="595" fill="#FAFAFA" />
                    <rect x="33" y="33" width="776" height="529" fill="none" stroke="#c00000" strokeWidth="5.5" />
                    <rect x="36" y="563" width="786" height="6" fill="#000000" />
                    <rect x="815" y="36" width="6" height="533" fill="#000000" />
                    <g transform="translate(48, 42)">
                      <text x="310" y="48" fontSize="42" fontWeight="bold" fill="#000000" textAnchor="end">
                        XIII
                      </text>
                      <text x="325" y="32" fontSize="15" fontWeight="bold" fill="#000000">
                        SEMANA DE
                      </text>
                      <text x="325" y="48" fontSize="15" fontWeight="bold" fill="#000000">
                        TECNOLOGIA
                      </text>
                    </g>
                  </g>
                ) : (
                  <g id="modal-institutional-background">
                    <rect x="0" y="0" width="842" height="595" fill="#FFFFFF" />
                    <rect x="24" y="24" width="794" height="547" fill="none" stroke="#BA1A1A" strokeWidth="2.5" />
                    <rect x="31" y="31" width="780" height="533" fill="none" stroke="#D9D9D9" strokeWidth="0.8" />
                  </g>
                )}

                <text
                  x="421"
                  y="155"
                  textAnchor="middle"
                  fontFamily="Helvetica, Arial, sans-serif"
                  fontWeight="bold"
                  fontStyle="italic"
                  fontSize="34"
                  fill="#000000"
                >
                  {headingText}
                </text>

                <foreignObject x="70" y="200" width="702" height="135">
                  <div
                    style={{
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#1a1a1a',
                      textAlign: 'justify',
                    }}
                  >
                    Certificamos que{' '}
                    <strong><em>{studentName}</em></strong>{' '}
                    {actionText}: “<strong><em>{displayTitle}</em></strong>”,{' '}
                    {displayPromoter ? `promovida por ${displayPromoter}, ` : ''}
                    realizada no dia {dateText}{timeRangeText}, na {displayEdition}, com carga horária de {workloadText}.
                  </div>
                </foreignObject>

                <text
                  x="421"
                  y="360"
                  textAnchor="middle"
                  fontFamily="Helvetica, Arial, sans-serif"
                  fontSize="14"
                  fill="#333333"
                >
                  São Paulo, {dateText}.
                </text>

                <text
                  x="421"
                  y="310"
                  textAnchor="middle"
                  fontFamily="Helvetica, Arial, sans-serif"
                  fontWeight="bold"
                  fontSize="48"
                  fill="#BA1A1A"
                  fillOpacity="0.22"
                  transform="rotate(-12 421 310)"
                >
                  PRÉVIA — SEM VALIDADE
                </text>

                {selectedSigners.length > 0 && (
                  <g id="modal-signatures-group">
                    {(() => {
                      const count = selectedSigners.length;
                      const width = 600 / count;
                      return selectedSigners.map((signer, index) => {
                        const x = 120 + index * width;
                        const cx = x + width / 2;
                        const imgUrl = signatureUrls[signer.id];
                        const lineWidth = Math.min(260, width - 20);

                        return (
                          <g key={signer.id}>
                            {imgUrl && (
                              <image
                                href={imgUrl}
                                x={cx - 55}
                                y="405"
                                width="110"
                                height="45"
                                preserveAspectRatio="xMidYMid meet"
                              />
                            )}
                            <line
                              x1={cx - lineWidth / 2}
                              y1="457"
                              x2={cx + lineWidth / 2}
                              y2="457"
                              stroke="#000000"
                              strokeWidth="1"
                            />
                            <text
                              x={cx}
                              y="475"
                              textAnchor="middle"
                              fontFamily="Helvetica, Arial, sans-serif"
                              fontSize={count > 1 ? 11 : 13}
                              fontWeight="bold"
                              fontStyle="italic"
                              fill="#000000"
                            >
                              {signer.name}
                            </text>
                            <text
                              x={cx}
                              y="493"
                              textAnchor="middle"
                              fontFamily="Helvetica, Arial, sans-serif"
                              fontSize={count > 1 ? 9.5 : 11}
                              fill="#444444"
                            >
                              {signer.title} {signer.course ? `(${signer.course})` : ''}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
