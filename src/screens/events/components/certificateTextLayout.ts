export interface WrappedText {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  totalHeight: number;
  overflow: boolean;
}

/**
 * Razão de largura por caractere para fonte Helvetica / Arial baseada nas métricas reais da fonte.
 */
export function getCharWidthRatio(char: string, fontWeight: 'bold' | 'normal' = 'bold'): number {
  if (char === ' ' || char === '\t') return 0.28;
  if ('ijlI|.,:;!\'`'.includes(char)) return fontWeight === 'bold' ? 0.32 : 0.28;
  if ('frt()-[]{}'.includes(char)) return fontWeight === 'bold' ? 0.42 : 0.38;
  if ('WM@%#&'.includes(char)) return fontWeight === 'bold' ? 0.90 : 0.84;
  if ('ABCDEFGHJKLNOPQRSTUVXYZ'.includes(char)) return fontWeight === 'bold' ? 0.70 : 0.64;
  if ('mw'.includes(char)) return fontWeight === 'bold' ? 0.74 : 0.68;
  // Caracteres comuns minúsculos e dígitos
  return fontWeight === 'bold' ? 0.58 : 0.52;
}

/**
 * Mede a largura aproximada de um texto em pixels para fonte Helvetica.
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontWeight: 'bold' | 'normal' = 'bold',
): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += getCharWidthRatio(text[i], fontWeight) * fontSize;
  }
  return width;
}

/**
 * Divide um token contínuo que não cabe em uma única linha em partes que respeitam maxWidth.
 */
export function splitLongToken(
  token: string,
  fontSize: number,
  maxWidth: number,
  fontWeight: 'bold' | 'normal',
): string[] {
  const parts: string[] = [];
  let current = '';

  for (let i = 0; i < token.length; i++) {
    const char = token[i];
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
 * Quebra e redimensiona texto para caber em contêineres SVG de forma proporcional.
 * Lida com palavras com espaços e tokens contínuos sem espaços, sinalizando overflow quando exceder o limite.
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

    // Pré-processa palavras: se alguma palavra for mais larga que maxWidth, quebra o token
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

  // Fallback no tamanho mínimo com quebra estrita de tokens
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
