import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloudArrowUpIcon, FilePlusIcon, SignOutIcon, UserCircleIcon, UserListIcon, SidebarSimpleIcon, CalendarIcon, CameraIcon } from '@phosphor-icons/react';
import styles from './style.module.css';

export default function MenuLateral() {
 const navigate = useNavigate();
 const location = useLocation();
 const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1200);
 const [mobile, setMobile] = useState(() => window.innerWidth < 768);
 const [open, setOpen] = useState(false);
 const dialog = useRef<HTMLDialogElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);
 useEffect(() => {
   const resize = () => { setMobile(window.innerWidth < 768); setCollapsed(window.innerWidth < 1200); setOpen(false); };
   window.addEventListener('resize', resize);
   return () => window.removeEventListener('resize', resize);
 }, []);
 useEffect(() => {
   const node = dialog.current;
   if (mobile && open) node?.showModal();
   else node?.close();
   return () => node?.close();
 }, [mobile, open]);
 const closeMenu = () => { setOpen(false); trigger.current?.focus(); };
 const handleMenuClick = (route: string) => { navigate(route); setOpen(false); };
 const handleLogout = () => { sessionStorage.removeItem('token'); navigate('/login'); };
 const items = [
   {path:'/students',label:'Lista de alunos',Icon:UserListIcon},
   {path:'/register',label:'Registrar aluno',Icon:FilePlusIcon},
   {path:'/upload-alunos',label:'Importar alunos',Icon:CloudArrowUpIcon},
   {path:'/perfil',label:'Perfil',Icon:UserCircleIcon},
   {path:'/fotos',label:'Fotos pendentes',Icon:CameraIcon},
   {path:'/eventos',label:'Eventos',Icon:CalendarIcon},
 ];
 const narrow = !mobile && collapsed;
 const content = <>
   <div className={styles.logoRow}>
     {!narrow && <img src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png" alt="Logo da Fatec Itaquera" className={styles.logoFatec} />}
     <button type="button" className={styles.collapseBtn} aria-label={mobile ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Minimizar menu'} aria-expanded={mobile ? open : !collapsed} onClick={mobile ? closeMenu : () => setCollapsed(v => !v)}><SidebarSimpleIcon size={24} /></button>
   </div>
   {!narrow && <p className={styles.eyebrow}>Secretaria acadêmica</p>}
   <nav aria-label="Navegação principal" className={styles.navigation}>
    {items.map(({path,label,Icon}) => {
      const active = location.pathname === path || (path === '/students' && location.pathname.startsWith('/update')) || (path === '/eventos' && location.pathname.startsWith('/eventos/'));
      return <button key={path} type="button" title={label} aria-label={label} aria-current={active ? 'page' : undefined} className={styles.itemMenu + (active ? ' ' + styles.selected : '')} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleMenuClick(path); } }} onClick={() => handleMenuClick(path)}><Icon size={24} aria-hidden="true" />{!narrow && <span>{label}</span>}</button>;
    })}
    <button type="button" className={styles.itemMenu + ' ' + styles.logout} title="Deslogar" aria-label="Deslogar" onClick={handleLogout}><SignOutIcon size={24} aria-hidden="true" />{!narrow && <span>Deslogar</span>}</button>
   </nav>
   <div className={styles.brandFooter}><img src="/cps_logo_br.png" alt="Centro Paula Souza" className={styles.logoCps} /></div>
 </>;
 if (mobile) return <>
   <div className={styles.mobileBar}><img src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png" alt="Fatec Itaquera" /><span>Secretaria</span><button type="button" ref={trigger} aria-label="Abrir menu" aria-expanded={open} aria-controls="secretary-navigation" onClick={() => setOpen(true)}><SidebarSimpleIcon size={24} /></button></div>
   <dialog ref={dialog} id="secretary-navigation" aria-label="Menu da Secretaria" className={styles.drawer} onCancel={e => { e.preventDefault(); closeMenu(); }} onClick={e => { if(e.target === e.currentTarget) closeMenu(); }}><div className={styles.drawerContent}>{content}</div></dialog>
 </>;
 return <aside className={styles.fundoMenu + (collapsed ? ' ' + styles.collapsed : '')}>{content}</aside>;
}
