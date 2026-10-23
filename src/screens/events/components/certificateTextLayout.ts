export interface WrappedText {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  totalHeight: number;
  overflow: boolean;
}

/**
 * RazÃ£o de largura por caractere para fonte Helvetica / Arial baseada nas mÃ©tricas reais da fonte.
 */
export function getCharWidthRatio(char: string, fontWeight: 'bold' | 'normal' = 'bold'): number {
  if (char === ' ' || char === '\t') return 0.28;
  if ('ijlI|.,:;!\'`'.includes(char)) return fontWeight === 'bold' ? 0.32 : 0.28;
  if ('frt()-[]{}'.includes(char)) return fontWeight === 'bold' ? 0.42 : 0.38;
  if ('WM@%#&'.includes(char)) return fontWeight === 'bold' ? 0.90 : 0.84;
  if ('ABCDEFGHJKLNOPQRSTUVXYZ'.includes(char)) return fontWeight === 'bold' ? 0.70 : 0.64;
  if ('mw'.includes(char)) return fontWeight === 'bold' ? 0.74 : 0.68;
  // Caracteres comuns minÃºsculos e dÃ­gitos
  return fontWeight === 'bold' ? 0.58 : 0.52;
}

/**
 * Mede o texto com a mesma família e peso usados no SVG.
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontWeight: 'bold' | 'normal' = 'bold',
): number {
  if (typeof document !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined') {
    const context = document.createElement('canvas').getContext('2d');
    if (context) {
      context.font = `${fontWeight === 'bold' ? '700' : '400'} ${fontSize}px Helvetica, Arial, sans-serif`;
      return context.measureText(text).width;
    }
  }
  // Non-browser tests use conservative estimates; the browser measures the rendered font.
  let width = 0;
  for (const char of text) {
    width += getCharWidthRatio(char, fontWeight) * fontSize;
  }
  return width;
}

/**
 * Divide um token contÃ­nuo que nÃ£o cabe em uma Ãºnica linha em partes que respeitam maxWidth.
 */
export function splitLongToken(
  token: string,
  fontSize: number,
  maxWidth: number,
  fontWeight: 'bold' | 'normal',
): string[] {
  const parts: string[] = [];
  let current = '';

  for (const char of Array.from(token)) {
    const candidate = current + char;
    if (measureTextWidth(candidate, fontSize, fontWeight) <= maxWidth) {
      current = candidate;
    } else {
      if (current) parts.push(current);
      current = char;
    }
  }
  if (current) parts.push(current);
  return parts.length > 0 ? parts : [token];
}

/**
 * Quebra e redimensiona texto para caber em contÃªineres SVG de forma proporcional.
 * Lida com palavras com espaÃ§os e tokens contÃ­nuos sem espaÃ§os, sinalizando overflow quando exceder o limite.
 */
export function wrapSvgText(
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxSize: number,
  minSize: number,
  fontWeight: 'bold' | 'normal' = 'bold',
): WrappedText {
  const normalized = (text || '').trim();
  if (!normalized) {
    return {
      fontSize: maxSize,
      lineHeight: Math.round(maxSize * 1.25),
      lines: [''],
      totalHeight: Math.round(maxSize * 1.25),
      overflow: false,
    };
  }

  const rawWords = normalized.split(/\s+/);

  for (let size = maxSize; size >= minSize; size -= 0.5) {
    const lineHeight = Math.round(size * 1.25);
    const lines: string[] = [];
    let currentLine = '';
    let fits = true;

    // PrÃ©-processa palavras: se alguma palavra for mais larga que maxWidth, quebra o token
    const words: string[] = [];
    for (const w of rawWords) {
      if (measureTextWidth(w, size, fontWeight) > maxWidth) {
        words.push(...splitLongToken(w, size, maxWidth, fontWeight));
      } else {
        words.push(w);
      }
    }

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = measureTextWidth(candidate, size, fontWeight);
      if (candidateWidth <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          fits = false;
          break;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const totalHeight = lines.length * lineHeight;
    if (fits && totalHeight <= maxHeight) {
      return {
        fontSize: size,
        lineHeight,
        lines,
        totalHeight,
        overflow: false,
      };
    }
  }

  // Fallback no tamanho mÃ­nimo com quebra estrita de tokens
  const fallbackSize = minSize;
  const lineHeight = Math.round(fallbackSize * 1.25);
  const words: string[] = [];
  for (const w of rawWords) {
    if (measureTextWidth(w, fallbackSize, fontWeight) > maxWidth) {
      words.push(...splitLongToken(w, fallbackSize, maxWidth, fontWeight));
    } else {
      words.push(w);
    }
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (measureTextWidth(candidate, fallbackSize, fontWeight) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const totalHeight = Math.max(lines.length, 1) * lineHeight;
  const overflow = totalHeight > maxHeight;

  return {
    fontSize: fallbackSize,
    lineHeight,
    lines: lines.length > 0 ? lines : [normalized],
    totalHeight,
    overflow,
  };
}
