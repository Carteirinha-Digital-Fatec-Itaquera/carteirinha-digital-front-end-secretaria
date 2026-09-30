import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyCertificate } from './verifyCertificate';
import { ApiRequestError } from '../config/apiRequest';

describe('verifyCertificate Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('faz requisicao para a rota publica codificando o codigo e sem enviar Authorization', async () => {
    sessionStorage.setItem('token', 'secret-admin-token');

    const fakeResponse = {
      valid: true,
      code: 'FATEC-EVT-0123456789ABCDEF',
      studentName: 'Aluno Teste',
      eventTitle: 'Workshop Tech',
      eventDate: '2026-10-05',
      workload: '2 horas',
      issuedAt: '2026-10-05T20:00:00.000Z',
      institution: 'FATEC Itaquera - Centro Paula Souza',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeResponse),
    } as Response);

    const result = await verifyCertificate('FATEC-EVT-0123456789ABCDEF');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];

    expect(url).toContain('/certificates/verify/FATEC-EVT-0123456789ABCDEF');
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(result).toEqual(fakeResponse);
  });

  it('repassa AbortSignal para cancelamento da requisicao', async () => {
    const controller = new AbortController();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: false, revoked: true, message: 'Revogado' }),
    } as Response);

    await verifyCertificate('CODE-123', { signal: controller.signal });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options.signal).toBe(controller.signal);
  });

  it('propaga ApiRequestError em caso de 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Certificado não encontrado', code: 'CERTIFICATE_NOT_FOUND' }),
    });

    await expect(verifyCertificate('INEXISTENTE')).rejects.toThrow(ApiRequestError);
  });
});
