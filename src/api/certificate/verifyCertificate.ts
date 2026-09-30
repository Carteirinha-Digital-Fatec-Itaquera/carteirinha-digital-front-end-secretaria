import { apiRequest, type RequestOptions } from '../config/apiRequest';
import type { CertificateVerificationResponse } from '../../domains/Certificate';

export async function verifyCertificate(
  code: string,
  options?: RequestOptions
): Promise<CertificateVerificationResponse> {
  const normalizedCode = (code || '').trim();
  const encodedCode = encodeURIComponent(normalizedCode);

  return apiRequest<CertificateVerificationResponse>(
    `/certificates/verify/${encodedCode}`,
    {
      method: 'GET',
      authenticated: false,
      signal: options?.signal,
    }
  );
}
