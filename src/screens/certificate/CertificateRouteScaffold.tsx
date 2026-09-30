import { useParams } from 'react-router-dom';

export function CertificateRouteScaffold() {
  const { codigo } = useParams<{ codigo: string }>();

  return (
    <main
      style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}
      role="main"
      aria-label="Verificação de Certificado"
    >
      <h1 data-testid="certificate-scaffold-title">Verificação de Certificado</h1>
      <p data-testid="certificate-scaffold-code">Código: {codigo}</p>
      <p>A validação pública e exibição do certificado será entregue na Issue #7.</p>
    </main>
  );
}

export default CertificateRouteScaffold;
