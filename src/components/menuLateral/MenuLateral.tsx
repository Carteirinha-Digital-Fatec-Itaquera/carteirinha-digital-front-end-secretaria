import { useState } from "react";
import styles from "./style.module.css";

function MenuLateral(){
    const [selected, setSelected] = useState("listaAlunos")
    return(
        <nav className={styles.fundoMenu}>
            <header>
                <img src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png" alt="Logo da fatec itaquera" className={styles.logoFatec} />
                <ul className={styles.estiloLista}>
                    <li className={styles.itemMenu}><a href="">Lista de alunos</a></li>
                     <li className={styles.itemMenu}><a href="">Registrar aluno</a></li>
                      <li className={styles.itemMenu}><a href="">Perfil</a></li>
                       <li className={styles.itemMenu}><a href="">Deslogar</a></li>
                </ul>
            </header>
            <img src="/logos_cps_governo_com_slogan_horizontal_br 3.svg" alt="" className={styles.logoCps} />
            
        </nav>
    )
}
export default MenuLateral;