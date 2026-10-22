import { useState, useEffect, useMemo, useRef } from 'react';
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

  const expandedModalRef = useRef<HTMLDivElement>(null);
  const expandedCloseBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Assinaturas selecionadas na ordem exata de signerIds
  const selectedSigners = useMemo(() => {
    const map = new Map(allSigners.map((s) => [s.id, s]));
    return signerIds.map((id) => map.get(id)).filter(Boolean) as Signer[];
  }, [signerIds, allSigners]);

  // Carregar imagens de assinaturas de forma assíncrona sem setState síncrono no efeito
  useEffect(() => {
    if (typeof fetchAssetBlobUrl !== 'function') return;
    const controller = new AbortController();
    const assetsToLoad = selectedSigners
      .filter((s) => s.assetId)
      .map((s) => ({ id: s.id, assetId: s.assetId! }));

    if (assetsToLoad.length === 0) {
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) {
          setSignatureUrls((prev) => (Object.keys(prev).length === 0 ? prev : {}));
        }
      });
      return () => {
        controller.abort();
      };
    }

    Promise.all(
      assetsToLoad.map(async ({ id, assetId }) => {
        try {
          const res = fetchAssetBlobUrl(assetId, controller.signal);
          const url =
            res && typeof (res as Promise<string>).then === 'function'
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

  // Carregar imagem de background do template se houver sem setState síncrono no efeito
  useEffect(() => {
    if (typeof fetchAssetBlobUrl !== 'function') return;
    const controller = new AbortController();
    const bgId = template?.config?.backgroundAssetId;
    if (!bgId) {
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) {
          setBackgroundUrl((prev) => (prev === null ? null : null));
        }
      });
      return () => {
        controller.abort();
      };
    }
    async function loadBackground() {
      try {
        const res = fetchAssetBlobUrl(bgId!, controller.signal);
        const url =
          res && typeof (res as Promise<string>).then === 'function'
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

  // Acessibilidade e controle do modal de expansão
  useEffect(() => {
    if (!isExpanded) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      expandedCloseBtnRef.current?.focus();
    }, 50);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsExpanded(false);
        return;
      }

      if (e.key === 'Tab' && expandedModalRef.current) {
        const focusable = expandedModalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [isExpanded]);

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

  const renderSvgContent = (isModal = false) => (
    <svg
      viewBox="0 0 842 595"
      className={isModal ? undefined : styles.svgRoot}
      style={isModal ? { width: '100%', height: 'auto', maxHeight: '80vh' } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fundo do Certificado */}
      {backgroundUrl ? (
        <image href={backgroundUrl} x="0" y="0" width="842" height="595" preserveAspectRatio="none" />
      ) : isCustomTemplate ? (
        /* Layout de Referência da Semana de Tecnologia */
        <g id={isModal ? 'modal-reference-background' : 'reference-background'}>
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
        /* Modelo Institucional Padrão Fatec - correspondente fiel ao PDF gerado */
        <g id={isModal ? 'modal-institutional-background' : 'institutional-background'}>
          <rect x="0" y="0" width="842" height="595" fill="#FFFFFF" />
          {/* Moldura externa vermelha e interna cinza */}
          <rect x="24" y="24" width="794" height="547" fill="none" stroke="#BA1A1A" strokeWidth="2.5" />
          <rect x="31" y="31" width="780" height="533" fill="none" stroke="#D9D9D9" strokeWidth="0.8" />

          {/* Cantos decorativos vermelhos idênticos ao PDF real */}
          <path d="M 31 73 L 31 31 L 73 31" fill="none" stroke="#BA1A1A" strokeWidth="4" />
          <path d="M 769 31 L 811 31 L 811 73" fill="none" stroke="#BA1A1A" strokeWidth="4" />
          <path d="M 31 521 L 31 563 L 73 563" fill="none" stroke="#BA1A1A" strokeWidth="4" />
          <path d="M 769 563 L 811 563 L 811 521" fill="none" stroke="#BA1A1A" strokeWidth="4" />

          {/* Logos oficiais */}
          <image
            href="/fatec_ra_metropolitana_sp_capital_itaquera_cor.png"
            x="55"
            y="45"
            width="135"
            height="62"
            preserveAspectRatio="xMidYMid meet"
          />
          <image
            href="/cps_logo_cor.png"
            x="695"
            y="49"
            width="92"
            height="58"
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Cabeçalho central institucional */}
          <text x="421" y="67" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="10.5" fontWeight="bold" fill="#1A1A1A">
            FACULDADE DE TECNOLOGIA DE ITAQUERA
          </text>
          <text x="421" y="85" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="8.5" fill="#555555">
            Centro Estadual de Educação Tecnológica Paula Souza
          </text>

          {/* Linha divisória com detalhe em vermelho */}
          <line x1="55" y1="113" x2="787" y2="113" stroke="#D9D9D9" strokeWidth="0.8" />
          <line x1="55" y1="113" x2="170" y2="113" stroke="#BA1A1A" strokeWidth="2.5" />
        </g>
      )}

      {/* Heading */}
      {isCustomTemplate ? (
        <text
          x="421"
          y="155"
          textAnchor="middle"
          fontFamily="Helvetica, Arial, sans-serif"
          fontWeight="bold"
          fontStyle="italic"
          fontSize="32"
          fill="#000000"
        >
          {headingText}
        </text>
      ) : (
        <g id={isModal ? 'modal-institutional-heading' : 'institutional-heading'}>
          <text
            x="421"
            y="152"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize="31"
            fill="#BA1A1A"
          >
            CERTIFICADO
          </text>
          <text
            x="421"
            y="172"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="#555555"
          >
            {isSpeaker ? 'DE MINISTRAÇÃO DE PALESTRA' : 'DE PARTICIPAÇÃO'}
          </text>
        </g>
      )}

      {/* Texto principal do certificado via foreignObject para quebra fiel e fluida */}
      <foreignObject x="70" y={isCustomTemplate ? '200' : '196'} width="702" height="135">
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
          realizada no dia {dateText}{timeRangeText}, {isCustomTemplate ? `na ${displayEdition}, ` : ''}com carga horária de {workloadText}.
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
        fontSize={isModal ? '48' : '44'}
        fill="#BA1A1A"
        fillOpacity="0.22"
        transform="rotate(-12 421 310)"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        PRÉVIA — SEM VALIDADE
      </text>

      {/* Assinaturas */}
      {selectedSigners.length > 0 ? (
        <g id={isModal ? 'modal-signatures-group' : 'signatures-group'}>
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
                  ) : signer.assetId ? (
                    /* Identifica explicitamente falha de carregamento da imagem */
                    <text
                      x={cx}
                      y="435"
                      textAnchor="middle"
                      fontFamily="Helvetica, Arial, sans-serif"
                      fontSize="10"
                      fill="#BA1A1A"
                      fontStyle="italic"
                    >
                      [Falha ao carregar assinatura]
                    </text>
                  ) : (
                    /* Sem asset configurado */
                    <text
                      x={cx}
                      y="435"
                      textAnchor="middle"
                      fontFamily="Helvetica, Arial, sans-serif"
                      fontSize="10"
                      fill="#94a3b8"
                      fontStyle="italic"
                    >
                      [Sem imagem de assinatura]
                    </text>
                  )}

                  {/* Linha horizontal de assinatura */}
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
      ) : !isCustomTemplate ? (
        /* Assinaturas institucionais padrão demonstrativas */
        <g id={isModal ? 'modal-default-signatures' : 'default-signatures'}>
          <g transform="translate(240, 457)">
            <line x1="-110" y1="0" x2="110" y2="0" stroke="#000000" strokeWidth="1" />
            <text x="0" y="18" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#000000">
              Diretoria da Unidade
            </text>
            <text x="0" y="32" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="9.5" fill="#444444">
              Fatec Itaquera
            </text>
          </g>
          <g transform="translate(602, 457)">
            <line x1="-110" y1="0" x2="110" y2="0" stroke="#000000" strokeWidth="1" />
            <text x="0" y="18" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#000000">
              Coordenação do Curso
            </text>
            <text x="0" y="32" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="9.5" fill="#444444">
              Fatec Itaquera
            </text>
          </g>
        </g>
      ) : null}
    </svg>
  );

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
              disabled={isSubmittingPdf || (isCustomTemplate && !signerIds.length)}
              title={
                isCustomTemplate && !signerIds.length
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
            aria-expanded={isExpanded}
          >
            {isExpanded ? '⤢ Recolher' : '⤢ Expandir'}
          </button>
        </div>
      </div>

      {isCustomTemplate && !signerIds.length && (
        <div className={styles.warningNotice}>
          ⚠️ Nenhuma assinatura selecionada. Selecione de 1 a 3 assinantes para compor o certificado.
        </div>
      )}

      <div className={styles.svgViewport}>{renderSvgContent(false)}</div>

      <div className={styles.previewFooter}>
        <span>
          Atualização instantânea em tempo real. Não gera registros de certificado nem PDF no servidor.
        </span>
        {selectedSigners.length > 0 ? (
          <span>
            {selectedSigners.length}{' '}
            {selectedSigners.length === 1 ? 'assinatura selecionada' : 'assinaturas selecionadas'}
          </span>
        ) : !isCustomTemplate ? (
          <span>Modelo Institucional Padrão Fatec</span>
        ) : null}
      </div>

      {/* Modal acessível de ampliação em tela cheia */}
      {isExpanded && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-expanded-title"
        >
          <div
            ref={expandedModalRef}
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h5 id="preview-expanded-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Visualização Ampliada — Prévia do Certificado
              </h5>
              <button
                ref={expandedCloseBtnRef}
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsExpanded(false)}
                aria-label="Fechar prévia ampliada"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>{renderSvgContent(true)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
