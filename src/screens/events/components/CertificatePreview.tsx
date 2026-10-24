import { useState, useEffect, useMemo, useRef } from 'react';
import type { Template, Signer } from '../../../api/event/publicEventService';
import {
  fetchAssetBlobUrl,
  releaseAssetBlobUrl,
} from '../../../api/event/publicEventService';
import { wrapSvgText } from './certificateTextLayout';
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

  const acquiredSignersRef = useRef<Map<string, { assetId: string; url: string }>>(new Map());
  const acquiredBgAssetIdRef = useRef<string | null>(null);

  // Carregar imagens de assinaturas de forma assíncrona
  useEffect(() => {
    if (typeof fetchAssetBlobUrl !== 'function') return;
    const controller = new AbortController();

    const activeSignerMap = new Map(
      selectedSigners.filter((s) => s.assetId).map((s) => [s.id, s.assetId!]),
    );

    // 1. Liberar assinaturas que foram desselecionadas
    for (const [signerId, info] of acquiredSignersRef.current.entries()) {
      if (!activeSignerMap.has(signerId)) {
        if (typeof releaseAssetBlobUrl === 'function') {
          releaseAssetBlobUrl(info.assetId);
        }
        acquiredSignersRef.current.delete(signerId);
      }
    }

    // 2. Identificar quais precisam ser carregadas
    const toLoad: Array<{ id: string; assetId: string }> = [];
    for (const [id, assetId] of activeSignerMap.entries()) {
      if (!acquiredSignersRef.current.has(id)) {
        toLoad.push({ id, assetId });
      }
    }

    if (toLoad.length === 0) {
      const currentUrls: Record<string, string> = {};
      for (const [id, info] of acquiredSignersRef.current.entries()) {
        if (info.url) currentUrls[id] = info.url;
      }
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) {
          setSignatureUrls((prev) => {
            const keysPrev = Object.keys(prev);
            const keysNext = Object.keys(currentUrls);
            if (
              keysPrev.length === keysNext.length &&
              keysNext.every((k) => prev[k] === currentUrls[k])
            ) {
              return prev;
            }
            return currentUrls;
          });
        }
      });
      return;
    }

    Promise.all(
      toLoad.map(async ({ id, assetId }) => {
        try {
          const res = fetchAssetBlobUrl(assetId, controller.signal);
          const url =
            res && typeof (res as Promise<string>).then === 'function'
              ? await res
              : '';
          return { id, assetId, url };
        } catch {
          return { id, assetId, url: '' };
        }
      }),
    ).then((results) => {
      if (!controller.signal.aborted) {
        for (const item of results) {
          acquiredSignersRef.current.set(item.id, {
            assetId: item.assetId,
            url: item.url,
          });
        }
        const next: Record<string, string> = {};
        for (const [id, info] of acquiredSignersRef.current.entries()) {
          if (info.url) next[id] = info.url;
        }
        setSignatureUrls(next);
      } else {
        for (const item of results) {
          if (item.url && typeof releaseAssetBlobUrl === 'function') {
            releaseAssetBlobUrl(item.assetId);
          }
        }
      }
    });

    return () => {
      controller.abort();
    };
  }, [selectedSigners]);

  // Carregar imagem de background do template
  useEffect(() => {
    if (typeof fetchAssetBlobUrl !== 'function') return;
    const controller = new AbortController();
    const bgId = template?.config?.backgroundAssetId;

    if (acquiredBgAssetIdRef.current && acquiredBgAssetIdRef.current !== bgId) {
      if (typeof releaseAssetBlobUrl === 'function') {
        releaseAssetBlobUrl(acquiredBgAssetIdRef.current);
      }
      acquiredBgAssetIdRef.current = null;
    }

    if (!bgId) {
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) {
          setBackgroundUrl(null);
        }
      });
      return () => {
        controller.abort();
      };
    }

    acquiredBgAssetIdRef.current = bgId;

    async function loadBackground() {
      try {
        const res = fetchAssetBlobUrl(bgId!, controller.signal);
        const url =
          res && typeof (res as Promise<string>).then === 'function'
            ? await res
            : null;
        if (!controller.signal.aborted) {
          setBackgroundUrl(url);
        } else if (url && typeof releaseAssetBlobUrl === 'function') {
          releaseAssetBlobUrl(bgId!);
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

  // Descarte de assets adquiridos ao desmontar o componente
  useEffect(() => {
    const acquiredSigners = acquiredSignersRef.current;
    return () => {
      for (const [, info] of acquiredSigners.entries()) {
        if (typeof releaseAssetBlobUrl === 'function') {
          releaseAssetBlobUrl(info.assetId);
        }
      }
      acquiredSigners.clear();
      const bgAssetId = acquiredBgAssetIdRef.current;
      if (bgAssetId) {
        if (typeof releaseAssetBlobUrl === 'function') {
          releaseAssetBlobUrl(bgAssetId);
        }
        acquiredBgAssetIdRef.current = null;
      }
    };
  }, []);

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
    ? template?.config?.speakerAction || 'ministrou a palestra intitulada'
    : template?.config?.attendeeAction || 'participou da palestra intitulada';

  const displayTitle = eventTitle.trim() || 'Título da palestra de demonstração';
  const displayPromoter = promoter?.trim();
  const displayEdition =
    template?.config?.edition ||
    "Semana de Tecnologia da Fatec Itaquera 'Professor Miguel Reale'";
  const headingText = template?.config?.heading || 'CERTIFICADO';

  const titleLayout = useMemo(
    () => wrapSvgText(displayTitle, 600, 52, 17, 11, 'bold'),
    [displayTitle],
  );
  const nameLayout = useMemo(
    () => wrapSvgText(studentName, 640, 46, 24, 16, 'bold'),
    [studentName],
  );
  const hasTextOverflow = titleLayout.overflow || nameLayout.overflow;

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
      {isCustomTemplate ? (
        /* ==========================================================
         * MODELO PERSONALIZADO (SEMANA DE TECNOLOGIA)
         * ========================================================== */
        <g id={isModal ? 'modal-custom-certificate' : 'custom-certificate'}>
          {/* Fundo do Certificado */}
          {backgroundUrl ? (
            <image href={backgroundUrl} x="0" y="0" width="842" height="595" preserveAspectRatio="none" />
          ) : template?.config?.design === 'TECHNOLOGY_BLUE_2026' ? (
            <g id={isModal ? 'modal-blue-technology-background' : 'blue-technology-background'}>
              <svg x="0" y="0" width="842" height="595" viewBox="0 0 800 565.4" overflow="hidden">
                <image href="/technology-2026-campaign-cover.png" width="1414" height="2000" />
              </svg>
              <svg x="66" y="0" width="710" height="150" viewBox="0 0 1415 299" overflow="hidden">
                <image href="/technology-2026-campaign-banner.png" width="1415" height="508" />
              </svg>
              <rect x="54" y="195" width="734" height="373" fill="#FFFFFF" fillOpacity=".97" />
              <image href="/cps_logo_cor.png" x="70" y="510" width="85" height="45" preserveAspectRatio="xMidYMid meet" aria-label="Centro Paula Souza" />
            </g>
          ) : (
            <g id={isModal ? 'modal-reference-background' : 'reference-background'}>
              <rect x="0" y="0" width="842" height="595" fill="#FAFAFA" />
              {/* 4 fatias do background original da Semana */}
              <image href="/technology-week-background-0.jpg" x="34.32" y="31.2" width="781.2" height="152.16" preserveAspectRatio="none" />
              <image href="/technology-week-background-1.jpg" x="34.32" y="183.36" width="781.2" height="152.16" preserveAspectRatio="none" />
              <image href="/technology-week-background-2.jpg" x="34.32" y="335.52" width="781.2" height="152.16" preserveAspectRatio="none" />
              <image href="/technology-week-background-3.jpg" x="34.32" y="487.68" width="781.2" height="75.84" preserveAspectRatio="none" />

              {/* Logos oficiais da Semana de Tecnologia */}
              <image href="/technology-week-logo-1.jpg" x="48.36" y="42.12" width="259.8" height="70.08" preserveAspectRatio="xMidYMid meet" />
              <image href="/technology-week-logo-2.jpg" x="68.4" y="46.56" width="90.96" height="48.24" preserveAspectRatio="xMidYMid meet" />
              <image href="/technology-week-logo-0.jpg" x="497.04" y="41.76" width="299.76" height="58.8" preserveAspectRatio="xMidYMid meet" />

              {/* Numeral romano e título da edição */}
              <text x="394" y="93" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold" fontSize="47" fill="#000000" textAnchor="end">
                {(/^([IVX]+)\b/.exec(displayEdition)?.[1]) || 'XIII'}
              </text>
              <text x="397" y="66" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold" fontSize="17" fill="#000000">
                SEMANA DE
              </text>
              <text x="397" y="83" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold" fontSize="17" fill="#000000">
                TECNOLOGIA
              </text>

              {/* Moldura legada preservada para os modelos anteriores. */}
              <rect x="36" y="563.82" width="785.92" height="6" fill="#000000" />
              <rect x="815.92" y="36" width="6" height="533.82" fill="#000000" />
              <rect x="33" y="33" width="775.92" height="529.32" fill="none" stroke="#c00000" strokeWidth="5.5" />
            </g>
          )}

          {/* Heading */}
          <text
            x="421"
            y={template?.config?.design === 'TECHNOLOGY_BLUE_2026' ? 177 : 160}
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontStyle="italic"
            fontSize="28"
            fill={template?.config?.design === 'TECHNOLOGY_BLUE_2026' ? '#FF9900' : '#000000'}
          >
            {headingText}
          </text>

          {/* Texto corrido em foreignObject com proporções fiéis ao renderer da Semana */}
          <foreignObject x="70" y={template?.config?.design === 'TECHNOLOGY_BLUE_2026' ? 215 : 205} width="702" height="130">
            <div
              style={{
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: displayTitle.length > 50 || studentName.length > 35 ? '12.5px' : '14px',
                lineHeight: '1.6',
                color: '#000000',
                textAlign: 'justify',
                margin: 0,
                padding: 0,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              Certificamos que{' '}
              <strong><em>{studentName}</em></strong>{' '}
              {actionText}: “<strong><em>{displayTitle}</em></strong>”,{' '}
              {displayPromoter ? `promovida por ${displayPromoter}, ` : ''}
              realizada no dia {dateText}{timeRangeText}, na {displayEdition}, com carga horária de {workloadText}.
            </div>
          </foreignObject>

          {/* Localidade e Data */}
          <text
            x="421"
            y="370"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="14"
            fill="#000000"
          >
            São Paulo, {dateText}.
          </text>

          {/* Marca d'água */}
          <text
            x="421"
            y="320"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize={isModal ? '48' : '44'}
            fill="#BA1A1A"
            fillOpacity="0.25"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            PRÉVIA — SEM VALIDADE
          </text>

          {/* Assinaturas personalizadas */}
          {selectedSigners.length > 0 && (
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
                          y="404"
                          width="110"
                          height="45"
                          preserveAspectRatio="xMidYMid meet"
                        />
                      ) : signer.assetId ? (
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

                      <line
                        x1={cx - lineWidth / 2}
                        y1="457"
                        x2={cx + lineWidth / 2}
                        y2="457"
                        stroke="#000000"
                        strokeWidth="0.8"
                      />

                      <text
                        x={cx}
                        y="474"
                        textAnchor="middle"
                        fontFamily="Helvetica, Arial, sans-serif"
                        fontSize={count > 1 ? 10 : 13}
                        fontWeight="bold"
                        fontStyle="italic"
                        fill="#000000"
                      >
                        {signer.name}
                      </text>

                      <text
                        x={cx}
                        y="495"
                        textAnchor="middle"
                        fontFamily="Helvetica, Arial, sans-serif"
                        fontSize={count > 1 ? 9 : 11}
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
        </g>
      ) : (
        /* ==========================================================
         * MODELO INSTITUCIONAL PADRÃO (PDF-GENERATOR FIEL)
         * ========================================================== */
        <g id={isModal ? 'modal-institutional-certificate' : 'institutional-certificate'}>
          <rect x="0" y="0" width="842" height="595" fill="#FFFFFF" />

          {/* Molduras externa vermelha e interna cinza */}
          <rect x="24" y="24" width="794" height="547" fill="none" stroke="#BA1A1A" strokeWidth="2.5" />
          <rect x="31" y="31" width="780" height="533" fill="none" stroke="#E5E7EB" strokeWidth="0.8" />

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
          <text x="421" y="67" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="10.5" fontWeight="bold" fill="#1F2937" letterSpacing="0.5">
            FACULDADE DE TECNOLOGIA DE ITAQUERA
          </text>
          <text x="421" y="85" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="8.5" fill="#6B7280">
            Centro Estadual de Educação Tecnológica Paula Souza
          </text>

          {/* Linha divisória com detalhe em vermelho */}
          <line x1="55" y1="113" x2="787" y2="113" stroke="#E5E7EB" strokeWidth="0.8" />
          <line x1="55" y1="113" x2="170" y2="113" stroke="#BA1A1A" strokeWidth="2.5" />

          {/* TÍTULO */}
          <text
            x="421"
            y="152"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize="31"
            fill={template?.config?.design === 'TECHNOLOGY_BLUE_2026' ? '#0A4C7A' : '#BA1A1A'}
            letterSpacing="2"
          >
            CERTIFICADO
          </text>
          <text
            x="421"
            y="176"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="#6B7280"
            letterSpacing="2.6"
          >
            {isSpeaker ? (template?.config?.design === 'TECHNOLOGY_BLUE_2026' ? 'DE MINISTRAÇÃO DE ATIVIDADE' : 'DE MINISTRAÇÃO DE PALESTRA') : 'DE PARTICIPAÇÃO'}
          </text>

          {/* "Certificamos que" */}
          <text
            x="421"
            y="206"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="10.5"
            fill="#6B7280"
          >
            Certificamos que
          </text>

          {/* Nome do aluno/palestrante centralizado em destaque com quebra e escala dinâmicas */}
          {(() => {
            const startY =
              244 -
              Math.round(nameLayout.totalHeight / 2) +
              Math.round(nameLayout.fontSize * 0.85);
            return (
              <text
                x="421"
                y={startY}
                textAnchor="middle"
                fontFamily="Helvetica, Arial, sans-serif"
                fontWeight="bold"
                fontSize={nameLayout.fontSize}
                fill="#1F2937"
              >
                {nameLayout.lines.map((line, idx) => (
                  <tspan
                    key={idx}
                    x="421"
                    dy={idx === 0 ? 0 : nameLayout.lineHeight}
                  >
                    {line}
                    {idx < nameLayout.lines.length - 1 &&
                    /\s/.test(studentName) &&
                    studentName.includes(line + ' ')
                      ? ' '
                      : ''}
                  </tspan>
                ))}
              </text>
            );
          })()}
          {/* Linha decorativa abaixo do nome */}
          <line x1="301" y1="263" x2="541" y2="263" stroke="#E5E7EB" strokeWidth="0.7" />

          {/* RA + Curso */}
          <text
            x="421"
            y="280"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="10"
            fill="#6B7280"
          >
            {isSpeaker ? 'Palestrante Convidado' : 'RA 123456789012  •  Análise e Desenvolvimento de Sistemas'}
          </text>

          {/* "participou do evento" */}
          <text
            x="421"
            y="308"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="10.5"
            fill="#6B7280"
          >
            {isSpeaker ? 'ministrou o evento' : 'participou do evento'}
          </text>

          {/* Título do evento centralizado em vermelho com quebra e escala dinâmicas */}
          {(() => {
            const startY =
              338 -
              Math.round(titleLayout.totalHeight / 2) +
              Math.round(titleLayout.fontSize * 0.85);
            return (
              <text
                x="421"
                y={startY}
                textAnchor="middle"
                fontFamily="Helvetica, Arial, sans-serif"
                fontWeight="bold"
                fontSize={titleLayout.fontSize}
                fill="#BA1A1A"
              >
                {titleLayout.lines.map((line, idx) => (
                  <tspan
                    key={idx}
                    x="421"
                    dy={idx === 0 ? 0 : titleLayout.lineHeight}
                  >
                    {line}
                    {idx < titleLayout.lines.length - 1 &&
                    /\s/.test(displayTitle) &&
                    displayTitle.includes(line + ' ')
                      ? ' '
                      : ''}
                  </tspan>
                ))}
              </text>
            );
          })()}

          {/* Palestrante ministrante com quebra se longo */}
          {speaker && !isSpeaker && (() => {
            const speakerText = `Ministrado por ${speaker.trim()}`;
            const speakerLayout = wrapSvgText(speakerText, 580, 22, 10, 8, 'normal');
            const startY =
              375 -
              Math.round(speakerLayout.totalHeight / 2) +
              Math.round(speakerLayout.fontSize * 0.85);
            return (
              <text
                x="421"
                y={startY}
                textAnchor="middle"
                fontFamily="Helvetica, Arial, sans-serif"
                fontSize={speakerLayout.fontSize}
                fill="#6B7280"
              >
                {speakerLayout.lines.map((line, idx) => (
                  <tspan
                    key={idx}
                    x="421"
                    dy={idx === 0 ? 0 : speakerLayout.lineHeight}
                  >
                    {line}
                    {idx < speakerLayout.lines.length - 1 &&
                    /\s/.test(speakerText) &&
                    speakerText.includes(line + ' ')
                      ? ' '
                      : ''}
                  </tspan>
                ))}
              </text>
            );
          })()}

          {/* Data do evento e Carga horária (Meta Items) */}
          <g id={isModal ? 'modal-meta-items' : 'meta-items'}>
            <text x="311" y="416" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="8" fontWeight="bold" fill="#6B7280" letterSpacing="0.8">
              DATA DO EVENTO
            </text>
            <text x="311" y="433" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#1F2937">
              {dateText}
            </text>

            <line x1="421" y1="410" x2="421" y2="446" stroke="#E5E7EB" strokeWidth="0.7" />

            <text x="531" y="416" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="8" fontWeight="bold" fill="#6B7280" letterSpacing="0.8">
              CARGA HORÁRIA
            </text>
            <text x="531" y="433" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#1F2937">
              {workloadText}
            </text>
          </g>

          {/* Painel de Autenticidade */}
          <g id={isModal ? 'modal-auth-panel' : 'auth-panel'}>
            <rect x="50" y="470" width="742" height="82" rx="8" fill="#FAFAFA" stroke="#E5E7EB" strokeWidth="0.8" />
            <rect x="62" y="479" width="64" height="64" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="0.5" />
            <path d="M 66 483 h 18 v 18 h -18 z M 70 487 h 10 v 10 h -10 z M 104 483 h 18 v 18 h -18 z M 108 487 h 10 v 10 h -10 z M 66 521 h 18 v 18 h -18 z M 70 525 h 10 v 10 h -10 z M 90 493 h 8 v 8 h -8 z M 90 515 h 8 v 8 h -8 z M 106 525 h 12 v 12 h -12 z" fill="#1F2937" />

            <text x="141" y="489" fontFamily="Helvetica, Arial, sans-serif" fontSize="8.5" fontWeight="bold" fill="#1F2937" letterSpacing="0.6">
              VERIFICAÇÃO DE AUTENTICIDADE
            </text>
            <text x="141" y="504" fontFamily="Helvetica, Arial, sans-serif" fontSize="8.4" fill="#6B7280">
              Código: DEMONSTRACAO-SEM-VALIDADE
            </text>
            <text x="141" y="518" fontFamily="Helvetica, Arial, sans-serif" fontSize="8.2" fill="#BA1A1A">
              Validação pública: https://carteirinha-digital-fatec.sp.gov.br/validar
            </text>
            <text x="141" y="534" fontFamily="Helvetica, Arial, sans-serif" fontSize="7.6" fill="#6B7280">
              Emitido em {new Date().toLocaleDateString('pt-BR')} • Documento assinado digitalmente
            </text>
          </g>

          {/* Marca d'água inclinada -25deg idêntica ao PDF institucional */}
          <text
            x="421"
            y="298"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
            fontSize="48"
            fill="#BA1A1A"
            fillOpacity="0.25"
            transform="rotate(-25 421 298)"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            PRÉVIA — SEM VALIDADE
          </text>
        </g>
      )}
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

      {hasTextOverflow && (
        <div
          role="alert"
          className={styles.warningNotice}
          style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #f87171' }}
        >
          ⚠️ Texto longo excede o limite suportado pelo layout do certificado. Ajuste o texto para evitar quebras anômalas.
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
