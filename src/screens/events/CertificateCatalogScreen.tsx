import MenuLateral from '../../components/menuLateral/MenuLateral';
import { Link } from 'react-router-dom';
import { CertificateCatalogManager } from './components/CertificateCatalogManager';
import layoutStyles from '../../styles/layoutWithMenu.module.css';
export default function CertificateCatalogScreen() {
  return <div className={layoutStyles.layoutContainer}>
    <div className={layoutStyles.menuWrapper}><MenuLateral /></div>
    <main className={layoutStyles.contentWrapper}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        <Link to="/eventos">Voltar aos eventos</Link>
        <h1>Gerenciar certificados e assinaturas</h1>
        <CertificateCatalogManager />
      </div>
    </main>
  </div>;
}
