import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../../components/menuLateral/MenuLateral';
import layout from '../../styles/layoutWithMenu.module.css';
import styles from './employees.module.css';

export default function EmployeesLayout({ title, children, back }: { title: string; children: ReactNode; back?: boolean }) {
  return <div className={layout.layoutContainer}>
    <div className={layout.menuWrapper}><MenuLateral /></div>
    <main className={layout.contentWrapper}>
      <div className={styles.page}>
        {back && <Link to="/funcionarios">Voltar para Funcionários</Link>}
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  </div>;
}
