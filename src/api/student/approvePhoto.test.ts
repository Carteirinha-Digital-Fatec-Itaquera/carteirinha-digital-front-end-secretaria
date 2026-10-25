import { beforeEach, describe, expect, it, vi } from 'vitest';
import { privateFetch } from '../config/privateFetch';
import { approvePhoto } from './approvePhoto';
vi.mock('../config/privateFetch', () => ({ privateFetch: vi.fn() }));
describe('Contrato de decisão da foto', () => {
  beforeEach(() => { vi.mocked(privateFetch).mockReset().mockResolvedValue(new Response(null, { status: 204 })); });
  it.each(['Foto desfocada.', '', '  Acentuação e espaços preservados.  '])('envia o motivo sem descartá-lo: %s', async reason => {
    await approvePhoto('123', false, reason);
    expect(privateFetch).toHaveBeenCalledWith(expect.stringContaining('/secretaria/aprovar-foto/123'), expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason }),
    }));
  });
  it('preserva aprovação sem motivo', async () => {
    await approvePhoto('123', true);
    expect(privateFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify({ status: 'APPROVED', rejectionReason: null }) }));
  });
});
