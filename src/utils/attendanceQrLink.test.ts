import { describe, it, expect } from 'vitest';
import { validatedAttendanceQrUrl } from './attendanceQrLink';

describe('validatedAttendanceQrUrl', () => {
  const origin = 'https://carteirinha-digital-front-end-aluno.vercel.app';
  const validRef = 'a'.repeat(22);

  it('aceita URL canônica de presença com origem autorizada e referência de 22 caracteres', () => {
    const url = `${origin}/p/${validRef}`;
    expect(validatedAttendanceQrUrl(url, origin)).toBe(url);
  });

  it('aceita referência com caracteres base64url válidos (letras, números, sublinhado e hífen)', () => {
    const complexRef = 'Abc_123-XyZ_456-wQe_78';
    expect(complexRef.length).toBe(22);
    const url = `${origin}/p/${complexRef}`;
    expect(validatedAttendanceQrUrl(url, origin)).toBe(url);
  });

  it('rejeita quando a origem da URL for diferente da origem permitida', () => {
    const url = `https://example.org/p/${validRef}`;
    expect(validatedAttendanceQrUrl(url, origin)).toBeNull();
  });

  it('rejeita URLs com query strings', () => {
    const url = `${origin}/p/${validRef}?token=x`;
    expect(validatedAttendanceQrUrl(url, origin)).toBeNull();
  });

  it('rejeita URLs com hash/fragmentos', () => {
    const url = `${origin}/p/${validRef}#section`;
    expect(validatedAttendanceQrUrl(url, origin)).toBeNull();
  });

  it('rejeita URLs com credenciais (username/password)', () => {
    const url = `https://user:pass@carteirinha-digital-front-end-aluno.vercel.app/p/${validRef}`;
    expect(validatedAttendanceQrUrl(url, origin)).toBeNull();
  });

  it('rejeita esquemas maliciosos como javascript:', () => {
    expect(validatedAttendanceQrUrl('javascript:alert(1)', origin)).toBeNull();
  });

  it('rejeita referências com tamanho diferente de 22 caracteres', () => {
    expect(validatedAttendanceQrUrl(`${origin}/p/short`, origin)).toBeNull();
    expect(validatedAttendanceQrUrl(`${origin}/p/${'a'.repeat(21)}`, origin)).toBeNull();
    expect(validatedAttendanceQrUrl(`${origin}/p/${'a'.repeat(23)}`, origin)).toBeNull();
  });

  it('rejeita paths que não iniciam com /p/', () => {
    expect(validatedAttendanceQrUrl(`${origin}/attendances/${validRef}`, origin)).toBeNull();
    expect(validatedAttendanceQrUrl(`${origin}/p/${validRef}/extra`, origin)).toBeNull();
  });

  it('rejeita valores nulos, indefinidos ou tipos não-string', () => {
    expect(validatedAttendanceQrUrl(undefined, origin)).toBeNull();
    expect(validatedAttendanceQrUrl(null, origin)).toBeNull();
    expect(validatedAttendanceQrUrl(12345, origin)).toBeNull();
    expect(validatedAttendanceQrUrl({}, origin)).toBeNull();
    expect(validatedAttendanceQrUrl('', origin)).toBeNull();
  });

  it('aceita HTTP loopback em ambiente de desenvolvimento se permitido na origem', () => {
    const devOrigin = 'http://localhost:5173';
    const devUrl = `${devOrigin}/p/${validRef}`;
    expect(validatedAttendanceQrUrl(devUrl, devOrigin)).toBe(devUrl);

    const devIpOrigin = 'http://127.0.0.1:3000';
    const devIpUrl = `${devIpOrigin}/p/${validRef}`;
    expect(validatedAttendanceQrUrl(devIpUrl, devIpOrigin)).toBe(devIpUrl);
  });
});
