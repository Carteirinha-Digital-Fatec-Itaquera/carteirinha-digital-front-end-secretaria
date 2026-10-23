import { describe, it, expect } from 'vitest';
import {
  wrapSvgText,
  measureTextWidth,
  splitLongToken,
} from './certificateTextLayout';

describe('certificateTextLayout (C3 - Métricas e quebra de texto SVG)', () => {
  it('deve manter texto curto em linha única com tamanho máximo', () => {
    const res = wrapSvgText('Palestra de Inteligência Artificial', 600, 52, 17, 11, 'bold');
    expect(res.lines).toHaveLength(1);
    expect(res.fontSize).toBe(17);
    expect(res.overflow).toBe(false);
    expect(measureTextWidth(res.lines[0], res.fontSize, 'bold')).toBeLessThanOrEqual(600);
  });

  it('deve quebrar texto longo com espaços respeitando maxWidth em todas as linhas', () => {
    const longTitle =
      'Desenvolvimento de Aplicações Resilientes com Arquitetura Orientada a Eventos e Modelagem de Domínio Complexo para Engenharia de Software Moderna';
    const res = wrapSvgText(longTitle, 600, 52, 17, 11, 'bold');
    expect(res.lines.length).toBeGreaterThan(1);
    for (const line of res.lines) {
      expect(measureTextWidth(line, res.fontSize, 'bold')).toBeLessThanOrEqual(600);
    }
  });

  it('deve quebrar tokens contínuos sem espaços (ex: 199 Ws) sem transbordar maxWidth', () => {
    const continuousToken = 'W'.repeat(199);
    const res = wrapSvgText(continuousToken, 600, 52, 17, 11, 'bold');

    expect(res.lines.length).toBeGreaterThan(1);
    // Toda e qualquer linha individual DEVE ser menor ou igual a maxWidth (600)
    for (const line of res.lines) {
      const lineWidth = measureTextWidth(line, res.fontSize, 'bold');
      expect(lineWidth).toBeLessThanOrEqual(600);
    }

    // Com 199 Ws em 11px, total de linhas excede 52px, logo overflow deve ser true
    expect(res.overflow).toBe(true);
    expect(res.totalHeight).toBeGreaterThan(52);
  });

  it('deve quebrar token contínuo moderado sem marcar overflow quando couber na altura', () => {
    // 30 Ws em maxWidth=600 cabe em 1 linha com tamanho 17
    const resSingle = wrapSvgText('W'.repeat(30), 600, 52, 17, 11, 'bold');
    expect(resSingle.lines.length).toBe(1);
    expect(measureTextWidth(resSingle.lines[0], resSingle.fontSize, 'bold')).toBeLessThanOrEqual(600);
    expect(resSingle.overflow).toBe(false);

    // 50 Ws cabe em 2 linhas respeitando maxHeight (42px <= 52px) sem overflow
    const resDouble = wrapSvgText('W'.repeat(50), 600, 52, 17, 11, 'bold');
    expect(resDouble.lines.length).toBe(2);
    expect(resDouble.totalHeight).toBeLessThanOrEqual(52);
    expect(resDouble.overflow).toBe(false);
  });

  it('splitLongToken deve particionar um token sem perder nenhum caractere', () => {
    const token = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(4);
    const parts = splitLongToken(token, 14, 200, 'bold');
    expect(parts.join('')).toBe(token);
    for (const part of parts) {
      expect(measureTextWidth(part, 14, 'bold')).toBeLessThanOrEqual(200);
    }
  });

  it('deve respeitar pesos bold e normal e lidar com acentos em pt-BR', () => {
    const accented = 'Apresentação de Trabalhos de Conclusão de Curso da Área de Gestão & Tecnologia da Informação';
    const boldRes = wrapSvgText(accented, 500, 40, 16, 12, 'bold');
    const normalRes = wrapSvgText(accented, 500, 40, 16, 12, 'normal');

    expect(boldRes.lines.length).toBeGreaterThan(0);
    expect(normalRes.lines.length).toBeGreaterThan(0);
    for (const l of boldRes.lines) {
      expect(measureTextWidth(l, boldRes.fontSize, 'bold')).toBeLessThanOrEqual(500);
    }
    for (const l of normalRes.lines) {
      expect(measureTextWidth(l, normalRes.fontSize, 'normal')).toBeLessThanOrEqual(500);
    }
  });
});
