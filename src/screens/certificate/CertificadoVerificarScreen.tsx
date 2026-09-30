import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifyCertificate } from '../../api/certificate/verifyCertificate';
import { ApiRequestError } from '../../api/config/apiRequest';
import type { CertificateVerificationValid } from '../../domains/Certificate';
import { formatEventDate } from '../../utils/eventPresentation';
import styles from './styleVerificar.module.css';

type VerificationStatus =
  | 'IDLE'
  | 'LOADING'
  | 'VALID'
  | 'REVOKED'
  | 'NOT_FOUND'
  | 'INVALID_CODE'
  | 'RATE_LIMIT'
  | 'ERROR';

function formatEventDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  // Se for YYYY-MM-DD, formata sem risco de deslocamento por parsing UTC
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return formatEventDate(dateStr);
}

export function CertificadoVerificarScreen() {
  const { codigo, code } = useParams<{ codigo?: string; code?: string }>();
  const initialCode = (codigo || code || '').trim();

  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [status, setStatus] = useState<VerificationStatus>('IDLE');
  const [validData, setValidData] = useState<CertificateVerificationValid | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const performVerification = useCallback(async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim();

    if (!trimmed) {
      setStatus('INVALID_CODE');
      setStatusMessage('Por favor, informe um código de verificação.');
      setValidData(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('LOADING');
    setValidData(null);
    setStatusMessage('');

    try {
      const response = await verifyCertificate(trimmed, { signal: controller.signal });

      if (!isMountedRef.current || controller.signal.aborted) return;

      if (response.valid) {
        setStatus('VALID');
        setValidData(response);
      } else if (response.revoked) {
        setStatus('REVOKED');
        setStatusMessage(response.message || 'Este certificado foi formalmente revogado pela instituição.');
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || controller.signal.aborted) return;

      if (err instanceof ApiRequestError) {
        if (err.status === 404) {
          setStatus('NOT_FOUND');
          setStatusMessage('Certificado não encontrado no registro acadêmico institucional.');
        } else if (err.status === 400) {
          setStatus('INVALID_CODE');
          setStatusMessage('Formato de código inválido. O código canônico possui o formato FATEC-EVT-XXXXXXXXXXXXXXXX.');
        } else if (err.status === 429) {
          setStatus('RATE_LIMIT');
          setStatusMessage('Limite de consultas excedido. Por favor, aguarde alguns instantes antes de tentar novamente.');
        } else {
          setStatus('ERROR');
          setStatusMessage('Não foi possível verificar o certificado no momento. Tente novamente mais tarde.');
        }
      } else {
        setStatus('ERROR');
        setStatusMessage('Não foi possível verificar o certificado devido a uma falha de conexão. Tente novamente.');
      }
    }
  }, []);

  // Executa verificacao inicial automatica se o parametro vier na URL
  useEffect(() => {
    isMountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (initialCode) {
      timer = setTimeout(() => {
        void performVerification(initialCode);
      }, 0);
    }

    return () => {
      isMountedRef.current = false;
      if (timer) {
        clearTimeout(timer);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialCode, performVerification]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performVerification(inputCode);
  };

  return (
    <main className={styles.pageContainer} role="main">
      <header className={styles.header}>
        <p className={styles.institution}>FATEC Itaquera - Centro Paula Souza</p>
        <h1 className={styles.pageTitle}>Autenticidade de Certificados</h1>
        <p className={styles.subtitle}>
          Consulte e confirme a autenticidade de certificados emitidos para eventos e atividades acadêmicas.
        </p>
      </header>

      <section className={styles.card} aria-label="Formulário de consulta de autenticidade">
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <label htmlFor="certificate-code-input" className={styles.label}>
            Código de Verificação
          </label>
          <div className={styles.inputGroup}>
            <input
              id="certificate-code-input"
              type="text"
              className={styles.input}
              placeholder="Ex: FATEC-EVT-0123456789ABCDEF"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              disabled={status === 'LOADING'}
              aria-required="true"
            />
            <button
              type="submit"
              className={styles.verifyButton}
              disabled={status === 'LOADING'}
            >
              {status === 'LOADING' ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </form>

        <div className={styles.statusContainer} aria-live="polite">
          {status === 'LOADING' && (
            <div className={styles.loadingBox} role="status">
              <span>Verificando certificado no registro oficial...</span>
            </div>
          )}

          {status === 'VALID' && validData && (
            <div className={styles.validCard} role="region" aria-label="Resultado: Certificado Válido">
              <div className={styles.statusBadgeValid}>
                ✓ CERTIFICADO VÁLIDO
              </div>
              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Participante</span>
                  <span className={styles.value}>{validData.studentName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Evento</span>
                  <span className={styles.value}>{validData.eventTitle}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Data de Realização</span>
                  <span className={styles.value}>{formatEventDisplayDate(validData.eventDate)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Carga Horária</span>
                  <span className={styles.value}>{validData.workload}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Código de Registro</span>
                  <span className={styles.value}>{validData.code}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Instituição Emissora</span>
                  <span className={styles.value}>{validData.institution}</span>
                </div>
              </div>
            </div>
          )}

          {status === 'REVOKED' && (
            <div className={styles.messageBox + ' ' + styles.revokedBox} role="alert">
              <div className={styles.statusBadgeRevoked}>
                ✕ CERTIFICADO REVOGADO
              </div>
              <p style={{ marginTop: '12px' }}>{statusMessage}</p>
            </div>
          )}

          {status === 'NOT_FOUND' && (
            <div className={styles.messageBox + ' ' + styles.warningBox} role="alert">
              <div className={styles.statusBadgeNotFound}>
                ⚠️ CERTIFICADO NÃO ENCONTRADO
              </div>
              <p style={{ marginTop: '12px' }}>{statusMessage}</p>
            </div>
          )}

          {status === 'INVALID_CODE' && (
            <div className={styles.messageBox + ' ' + styles.warningBox} role="alert">
              <div className={styles.statusBadgeError}>
                CÓDIGO INVÁLIDO
              </div>
              <p style={{ marginTop: '12px' }}>{statusMessage}</p>
            </div>
          )}

          {status === 'RATE_LIMIT' && (
            <div className={styles.messageBox + ' ' + styles.warningBox} role="alert">
              <div className={styles.statusBadgeError}>
                MUITAS TENTATIVAS
              </div>
              <p style={{ marginTop: '12px' }}>{statusMessage}</p>
            </div>
          )}

          {status === 'ERROR' && (
            <div className={styles.messageBox + ' ' + styles.warningBox} role="alert">
              <div className={styles.statusBadgeError}>
                ERRO NA CONSULTA
              </div>
              <p style={{ marginTop: '12px' }}>{statusMessage}</p>
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Faculdade de Tecnologia de Itaquera - Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}

export default CertificadoVerificarScreen;
