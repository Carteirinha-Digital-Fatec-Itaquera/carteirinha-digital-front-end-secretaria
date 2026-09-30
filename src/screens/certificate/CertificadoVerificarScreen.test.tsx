import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as verifyService from '../../api/certificate/verifyCertificate';
import { ApiRequestError } from '../../api/config/apiRequest';
import type { CertificateVerificationResponse } from '../../domains/Certificate';
import { CertificadoVerificarScreen } from './CertificadoVerificarScreen';

describe('CertificadoVerificarScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRoute = (initialPath = '/certificados/verificar') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/certificados/verificar" element={<CertificadoVerificarScreen />} />
          <Route path="/certificados/verificar/:code" element={<CertificadoVerificarScreen />} />
          <Route path="/certificado/verificar/:codigo" element={<CertificadoVerificarScreen />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('verifica automaticamente codigo presente no path da URL e exibe certificado valido', async () => {
    const fakeValid: CertificateVerificationResponse = {
      valid: true,
      code: 'FATEC-EVT-0123456789ABCDEF',
      studentName: 'Mariana de Oliveira',
      eventTitle: 'Simpósio de Inteligência Artificial',
      eventDate: '2026-10-15',
      workload: '4 horas',
      issuedAt: '2026-10-15T22:00:00.000Z',
      institution: 'FATEC Itaquera - Centro Paula Souza',
    };

    vi.spyOn(verifyService, 'verifyCertificate').mockResolvedValue(fakeValid);

    renderWithRoute('/certificados/verificar/FATEC-EVT-0123456789ABCDEF');

    await waitFor(() => {
      expect(screen.getByText(/CERTIFICADO VÁLIDO/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Mariana de Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Simpósio de Inteligência Artificial')).toBeInTheDocument();
    expect(screen.getByText('15/10/2026')).toBeInTheDocument();
    expect(screen.getByText('4 horas')).toBeInTheDocument();
    expect(screen.getByText('FATEC-EVT-0123456789ABCDEF')).toBeInTheDocument();
    expect(screen.getAllByText('FATEC Itaquera - Centro Paula Souza').length).toBeGreaterThanOrEqual(1);

    // Garante que dados privados nao estao presentes no DOM
    expect(screen.queryByText(/001234/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/@/i)).not.toBeInTheDocument();
  });

  it('exibe mensagem correta para certificado revogado', async () => {
    const fakeRevoked: CertificateVerificationResponse = {
      valid: false,
      code: 'FATEC-EVT-REVOKED123456',
      revoked: true,
      message: 'Certificado cancelado por duplicidade cadastral.',
    };

    vi.spyOn(verifyService, 'verifyCertificate').mockResolvedValue(fakeRevoked);

    renderWithRoute('/certificados/verificar/FATEC-EVT-REVOKED123456');

    await waitFor(() => {
      expect(screen.getByText('✕ CERTIFICADO REVOGADO')).toBeInTheDocument();
    });

    expect(screen.getByText('Certificado cancelado por duplicidade cadastral.')).toBeInTheDocument();
  });

  it('exibe mensagem correta quando o certificado nao for encontrado (404)', async () => {
    vi.spyOn(verifyService, 'verifyCertificate').mockRejectedValue(
      new ApiRequestError(404, 'Not found', 'CERTIFICATE_NOT_FOUND')
    );

    renderWithRoute('/certificados/verificar/FATEC-EVT-INEXISTENTE');

    await waitFor(() => {
      expect(screen.getByText('⚠️ CERTIFICADO NÃO ENCONTRADO')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de formato invalido para erro 400', async () => {
    vi.spyOn(verifyService, 'verifyCertificate').mockRejectedValue(
      new ApiRequestError(400, 'Invalid code', 'INVALID_VERIFICATION_CODE')
    );

    renderWithRoute('/certificados/verificar/CODIGO-ERRADO');

    await waitFor(() => {
      expect(screen.getByText('CÓDIGO INVÁLIDO')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de limite de tentativas para erro 429', async () => {
    vi.spyOn(verifyService, 'verifyCertificate').mockRejectedValue(
      new ApiRequestError(429, 'Rate limit', 'RATE_LIMIT_EXCEEDED')
    );

    renderWithRoute('/certificados/verificar/FATEC-EVT-TOO-MANY');

    await waitFor(() => {
      expect(screen.getByText('MUITAS TENTATIVAS')).toBeInTheDocument();
    });
  });

  it('exibe erro generico sem alegar falsidade diante de falha tecnica de rede', async () => {
    vi.spyOn(verifyService, 'verifyCertificate').mockRejectedValue(new Error('Failed to fetch'));

    renderWithRoute('/certificados/verificar/FATEC-EVT-OFFLINE');

    await waitFor(() => {
      expect(screen.getByText('ERRO NA CONSULTA')).toBeInTheDocument();
    });

    expect(screen.getByText(/Não foi possível verificar o certificado devido a uma falha de conexão/i)).toBeInTheDocument();
    expect(screen.queryByText('CERTIFICADO INVÁLIDO')).not.toBeInTheDocument();
  });

  it('permite consulta manual digitando o codigo no input', async () => {
    const fakeValid: CertificateVerificationResponse = {
      valid: true,
      code: 'FATEC-EVT-DIGITADO12345',
      studentName: 'Lucas Ferreira',
      eventTitle: 'Hackathon',
      eventDate: '2026-11-20',
      workload: '8 horas',
      issuedAt: '2026-11-20T20:00:00.000Z',
      institution: 'FATEC Itaquera - Centro Paula Souza',
    };

    const spy = vi.spyOn(verifyService, 'verifyCertificate').mockResolvedValue(fakeValid);

    renderWithRoute('/certificados/verificar');

    const input = screen.getByLabelText(/Código de Verificação/i);
    const button = screen.getByRole('button', { name: /Verificar/i });

    fireEvent.change(input, { target: { value: 'FATEC-EVT-DIGITADO12345' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('FATEC-EVT-DIGITADO12345', expect.any(Object));
      expect(screen.getByText('Lucas Ferreira')).toBeInTheDocument();
    });
  });
});
