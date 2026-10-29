import { apiRequest } from '../../api/config/apiRequest';
import { logoutSession } from '../../api/auth/session';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloudArrowUpIcon, FilePlusIcon, SignOutIcon, UserCircleIcon, UserListIcon, SidebarSimpleIcon, CalendarIcon, CameraIcon, ChatCircleIcon, InfoIcon } from '@phosphor-icons/react';
import MessageModal from '../messageModal/MessageModal';
import styles from './style.module.css';
import { getPendingPhotos } from '../../api/student/getPendingPhotos';

// A tela de fotos fornece sua própria contagem para reutilizar a recarga existente.
export default function MenuLateral({ pendingPhotoCount }: { pendingPhotoCount?: number | null } = {}) {
 const navigate = useNavigate();
 const location = useLocation();
 const [fetchedCount, setFetchedCount] = useState<number | null>(null);
 useEffect(() => {
   if (pendingPhotoCount !== undefined) return;
   let active = true;
   let request = 0;
   const refresh = async () => {
     const current = ++request;
     setFetchedCount(null);
     try {
       const photos = await getPendingPhotos();
       if (active && current === request) setFetchedCount(Array.isArray(photos) ? photos.length : null);
     } catch {
       if (active && current === request) setFetchedCount(null);
     }
   };
   void refresh();
   window.addEventListener('focus', refresh);
   return () => { active = false; window.removeEventListener('focus', refresh); };
 }, [location.pathname, pendingPhotoCount]);
 const [supportCount, setSupportCount] = useState<number | null>(null);
 useEffect(() => {
   const controller = new AbortController();
   let request = 0;
   const refresh = async () => {
     if (document.visibilityState === 'hidden') return;
     const current = ++request;
     try { const value = await apiRequest<{pending:number}>('/support/admin/summary', {signal:controller.signal}); if (!controller.signal.aborted && request === current) setSupportCount(value.pending); }
     catch { if (!controller.signal.aborted && request === current) setSupportCount(null); }
   };
   void refresh();
   const timer = window.setInterval(() => void refresh(), 60000);
   window.addEventListener('focus', refresh); window.addEventListener('support:updated', refresh); document.addEventListener('visibilitychange', refresh);
   return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('support:updated', refresh); document.removeEventListener('visibilitychange', refresh); };
 }, []);
 const photoCount = pendingPhotoCount === undefined ? fetchedCount : pendingPhotoCount;
 const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1200);
 const [mobile, setMobile] = useState(() => window.innerWidth < 768);
 const [open, setOpen] = useState(false);
 const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
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
 const handleMenuClick = (route: string) => { navigate(route, { state: { from: location.pathname } }); setOpen(false); };
 const requestLogout = () => { setOpen(false); setLogoutConfirmVisible(true); };
 const handleLogout = () => { setLogoutConfirmVisible(false); logoutSession(); navigate('/login', { replace: true }); };
 const items = [
   {path:'/students',label:'Lista de alunos',Icon:UserListIcon},
   {path:'/register',label:'Registrar aluno',Icon:FilePlusIcon},
   {path:'/upload-alunos',label:'Importar alunos',Icon:CloudArrowUpIcon},
   {path:'/perfil',label:'Perfil',Icon:UserCircleIcon},
   {path:'/suporte',label:'Suporte',Icon:ChatCircleIcon},
   {path:'/fotos',label:'Fotos pendentes',Icon:CameraIcon},
   {path:'/eventos',label:'Eventos',Icon:CalendarIcon},
   {path:'/creditos',label:'Sobre',Icon:InfoIcon},
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
      const active = location.pathname === path || (path === '/suporte' && location.pathname.startsWith('/suporte/')) ||
        (path === '/students' && location.pathname.startsWith('/update')) ||
        (path === '/eventos' && (location.pathname.startsWith('/eventos') || location.pathname === '/criar-evento')) ||
        (path === '/creditos' && (location.pathname === '/creditos' || location.pathname.startsWith('/creditos/')));
      const count = path === '/fotos' ? photoCount : path === '/suporte' ? supportCount : null;
      const accessibleLabel = count && count > 0 ? `${label}: ${count} aguardando análise` : label;
      return <button key={path} type="button" title={accessibleLabel} aria-label={accessibleLabel} aria-current={active ? 'page' : undefined} className={styles.itemMenu + (active ? ' ' + styles.selected : '')} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleMenuClick(path); } }} onClick={() => handleMenuClick(path)}><Icon size={24} aria-hidden="true" />{!narrow && <span>{label}</span>}{count != null && count > 0 && <span className={styles.pendingBadge} aria-hidden="true">{count}</span>}</button>;
    })}
    <button type="button" className={styles.itemMenu + ' ' + styles.logout} title="Deslogar" aria-label="Deslogar" onClick={requestLogout}><SignOutIcon size={24} aria-hidden="true" />{!narrow && <span>Deslogar</span>}</button>
   </nav>
   <div className={styles.brandFooter}><img src="/cps_logo_br.png" alt="Centro Paula Souza" className={styles.logoCps} /></div>
 </>;
 const logoutModal = (
   <MessageModal
     visible={logoutConfirmVisible}
     tone="warning"
     title="Sair da conta?"
     message="Você será desconectado da Secretaria. Deseja continuar?"
     confirmText="Sair"
     cancelText="Cancelar"
     onConfirm={handleLogout}
     onCancel={() => setLogoutConfirmVisible(false)}
     onDismiss={() => setLogoutConfirmVisible(false)}
   />
 );
 if (mobile) return <>
   <div className={styles.mobileBar}><img src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png" alt="Fatec Itaquera" /><span>Secretaria</span><button type="button" ref={trigger} aria-label="Abrir menu" aria-expanded={open} aria-controls="secretary-navigation" onClick={() => setOpen(true)}><SidebarSimpleIcon size={24} /></button></div>
   <dialog ref={dialog} id="secretary-navigation" aria-label="Menu da Secretaria" className={styles.drawer} onCancel={e => { e.preventDefault(); closeMenu(); }} onClick={e => { if(e.target === e.currentTarget) closeMenu(); }}><div className={styles.drawerContent}>{content}</div></dialog>
   {logoutModal}
 </>;
 return <>
   <aside className={styles.fundoMenu + (collapsed ? ' ' + styles.collapsed : '')}>{content}</aside>
   {logoutModal}
 </>;
}
