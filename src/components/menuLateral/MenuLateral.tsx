import { useLocation, useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import {  CloudArrowUpIcon, FilePlusIcon, SignOutIcon, UserCircleIcon, UserCirclePlusIcon, UserListIcon } from "@phosphor-icons/react";

function MenuLateral(){
    const navigate = useNavigate();
    const location = useLocation();
    
    // Detecta qual item deve estar selecionado baseado na rota
    const getSelectedItem = () => {
        if (location.pathname === "/students") return "listaAlunos";
        if (location.pathname === "/register") return "registroManual";
        if (location.pathname.startsWith("/update")) return "listaAlunos";
        return "listaAlunos";
    };
    
    const selected = getSelectedItem();
    
    const handleMenuClick = (item: string, path: string) => {
        navigate(path);
    };

    const handleLogout = () => {
        sessionStorage.removeItem("token");
        navigate("/login");
    };
    
    return(
        <nav className={styles.fundoMenu}>
            <header>
                <img src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png" alt="Logo da fatec itaquera" className={styles.logoFatec} />
                <div className={styles.divider}></div>
                <ul className={styles.estiloLista}>
                    <li 
                        className={`${styles.itemMenu} ${selected === "listaAlunos" ? styles.selected : ""}`}
                        onClick={() => handleMenuClick("listaAlunos", "/students")}
                    >
                        <UserListIcon size={30} color="#ffffff" /><a href="" onClick={(e) => e.preventDefault()}>Lista de alunos</a>
                    </li>

                {/* acordeao com as opcoes de criação */}
                <div className="accordion" id="accordionPanelsStayOpenExample">
                    <div className="accordion-item" style={{background: 'transparent', border: "none", padding: '0'}}>

                        {/* titulo do botao */}
                        <h2 className="accordion-header">
                        {/* Botao */}
                     
                        <button className={`accordion-button ${styles.accordionBtn} ${selected === "registroManual" ? styles.selected : ""}`} type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseOne" aria-expanded="false" aria-controls="panelsStayOpen-collapseOne">
                             <UserCirclePlusIcon size={30} color="#ffffff" />
                            Registrar aluno
                        </button>
                        </h2>

                        {/* corpo do acordeao */}
                        <div id="panelsStayOpen-collapseOne" className="accordion-collapse collapse" >
                        <div className="accordion-body" style={{background: 'transparent', padding: '0.5rem'}}>
                            <li 
                                className={`${styles.itemMenu} ${selected === "registroManual" ? styles.selected : ""}`}
                                onClick={() => handleMenuClick("registroManual", "/register")}
                            >
                                <FilePlusIcon size={30} color="#ffffff"  />
                                <a href="" onClick={(e) => e.preventDefault()}>Manual</a>
                            </li>
                            <li 
                                className={`${styles.itemMenu} ${selected === "registroImport" ? styles.selected : ""}`}
                                onClick={() => handleMenuClick("registroImport", "#")}
                            >
                                <CloudArrowUpIcon size={30} color="#ffffff"  />
                                <a href="" onClick={(e) => e.preventDefault()}>Importar</a>
                            </li>
                        </div>
                        </div>
                    </div>
                    </div>

                      <li 
                        className={`${styles.itemMenu} ${selected === "perfil" ? styles.selected : ""}`}
                        onClick={() => handleMenuClick("perfil", "#")}
                      >
                        <UserCircleIcon size={30} color="#ffffff" /><a href="" onClick={(e) => e.preventDefault()}>Perfil</a>
                      </li>

                       <li 
                        className={`${styles.itemMenu} ${selected === "deslogar" ? styles.selected : ""}`}
                       j
                      >
                        <SignOutIcon size={30} color="#ffffff" />
                        <a href="" onClick={(e) => e.preventDefault()}>Deslogar</a>
                      </li>
                </ul>
            </header>
            
            <img src="/logos_cps_governo_com_slogan_horizontal_br 3.svg" alt="" className={styles.logoCps} />
            
        </nav>
    )
}
export default MenuLateral;