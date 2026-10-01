export function validatedAttendanceQrUrl(
  value: unknown,
  allowedOrigin: string
): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(allowedOrigin).origin;
  } catch {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  // Não aceita credenciais
  if (parsed.username || parsed.password) {
    return null;
  }

  // Não aceita query string ou fragment/hash
  if (parsed.search || parsed.hash) {
    return null;
  }

  // Verifica protocolo e origem permitida
  if (parsed.origin !== expectedOrigin) {
    return null;
  }

  const isHttpLoopback =
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  const isHttps = parsed.protocol === 'https:';

  if (!isHttps && !isHttpLoopback) {
    return null;
  }

  // Pathname deve ser estritamente /p/<base64url-22-chars>
  const match = parsed.pathname.match(/^\/p\/([A-Za-z0-9_-]{22})$/);
  if (!match) {
    return null;
  }

  return `${parsed.origin}${parsed.pathname}`;
}
