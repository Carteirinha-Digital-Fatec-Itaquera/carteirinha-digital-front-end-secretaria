import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import {
  CloudArrowUpIcon,
  FilePlusIcon,
  SignOutIcon,
  UserCircleIcon,
  UserCirclePlusIcon,
  UserListIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { CameraIcon } from "@phosphor-icons/react";


function MenuLateral() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1200);

  useEffect(() => {
  const handleResize = () => {
    setCollapsed(window.innerWidth < 1200);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

  const getSelectedItem = () => {
    if (location.pathname === "/students") return "listaAlunos";
    if (location.pathname === "/register") return "registroManual";
    if (location.pathname === "/upload-alunos") return "registroImport";
    if (location.pathname.startsWith("/update")) return "listaAlunos";
    if (location.pathname === "/perfil") return "perfil";
    if (location.pathname === "/fotos") return "fotos";
    return "listaAlunos";
  };

  const selected = getSelectedItem();

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav
      className={`${styles.fundoMenu} ${collapsed ? styles.fundoMenuCollapsed : ""}`}
      onClick={() => {
        if (collapsed) setCollapsed(false);
      }}
    >
      <header>
        
        <div className={styles.logoRow}>
          {!collapsed && (
            <img
              src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png"
              alt="Logo da fatec itaquera"
              className={styles.logoFatec}
            />
          )}
          <button
            className={styles.collapseBtn}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((prev) => !prev);
            }}
            title={collapsed ? "Expandir menu" : "Minimizar menu"}
          >
            <SidebarSimpleIcon size={25} color="#ffffff" weight="bold"/>
          </button>
        </div>

        <div className={styles.divider} />

        <ul className={`${styles.estiloLista} ${collapsed ? styles.estiloListaCollapsed : ""}`}>
          {/* Lista de alunos */}
          <li
            className={`${styles.itemMenu} ${collapsed ? styles.itemMenuCollapsed : ""} ${selected === "listaAlunos" ? styles.selected : ""}`}
            onClick={(e) => { e.stopPropagation(); handleMenuClick("/students"); }}
            title="Lista de alunos"
          >
            <UserListIcon size={30} color="#ffffff" />
            {!collapsed && <a href="" onClick={(e) => e.preventDefault()}>Lista de alunos</a>}
          </li>

          {collapsed ? (
            <li
              className={`${styles.itemMenu} ${styles.itemMenuCollapsed} ${selected === "registroManual" || selected === "registroImport" ? styles.selected : ""}`}
              title="Registrar aluno"
            >
              <UserCirclePlusIcon size={30} color="#ffffff" />
            </li>
          ) : (
            <div className="accordion" id="accordionPanelsStayOpenExample" style={{ width: "100%" }}>
              <div className="accordion-item" style={{ background: "transparent", border: "none", padding: "0", }}>
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button ${styles.accordionBtn} ${selected === "registroManual" || selected === "registroImport" ? styles.selected : ""}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#panelsStayOpen-collapseOne"
                    aria-expanded="false"
                    aria-controls="panelsStayOpen-collapseOne"
                  >
                    <UserCirclePlusIcon size={30} color="#ffffff" />
                    Registrar aluno
                  </button>
                </h2>
                <div id="panelsStayOpen-collapseOne" className="accordion-collapse collapse">
                  <div className="accordion-body" style={{ background: "transparent", padding: "0.5rem", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: 'flex-end'}}>
                    <li
                      className={`${styles.itemMenu} ${selected === "registroManual" ? styles.selected : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleMenuClick("/register"); }}
                    >
                      <FilePlusIcon size={30} color="#ffffff" />
                      <a href="" onClick={(e) => e.preventDefault()}>Manual</a>
                    </li>
                    <li
                      className={`${styles.itemMenu} ${selected === "registroImport" ? styles.selected : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleMenuClick("/upload-alunos"); }}
                    >
                      <CloudArrowUpIcon size={30} color="#ffffff" />
                      <a href="" onClick={(e) => e.preventDefault()}>Importar</a>
                    </li>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Perfil */}
          <li
            className={`${styles.itemMenu} ${collapsed ? styles.itemMenuCollapsed : ""} ${selected === "perfil" ? styles.selected : ""}`}
            onClick={(e) => { e.stopPropagation(); handleMenuClick("/perfil"); }}
            title="Perfil"
          >
            <UserCircleIcon size={30} color="#ffffff" />
            {!collapsed && <a href="" onClick={(e) => e.preventDefault()}>Perfil</a>}
          </li>

          {/* Fotos pendentes */}
          <li
            className={`${styles.itemMenu} ${collapsed ? styles.itemMenuCollapsed : ""} ${selected === "fotos" ? styles.selected : ""}`}
            onClick={(e) => { e.stopPropagation(); handleMenuClick("/fotos"); }}
            title="Fotos pendentes"
          >
            <CameraIcon size={30} color="#ffffff" />
            {!collapsed && <a href="" onClick={(e) => e.preventDefault()}>Fotos pendentes</a>}
          </li>

          {/* Deslogar */}
          <li
            className={`${styles.itemMenu} ${collapsed ? styles.itemMenuCollapsed : ""}`}
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            title="Deslogar"
          >
            <SignOutIcon size={30} color="#ffffff" />
            {!collapsed && <a href="" onClick={(e) => e.preventDefault()}>Deslogar</a>}
          </li>
        </ul>
      </header>

      {!collapsed && (
        <img
          src="/logos_cps_governo_com_slogan_horizontal_br 3.svg"
          alt=""
          className={styles.logoCps}
        />
      )}
    </nav>
  );
}

export default MenuLateral;