import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";

function StudentsListScreen() {
  const navigate = useNavigate();

  function handleLogout() {
    navigate("/login");
  }

  function handleRegister() {
    navigate("/register");
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <img src={logoFatec} className={styles.logoLeft} alt="Logo Fatec" />

        <h1 className={styles.title}>Listagem de alunos</h1>

        <img src={logosGov} className={styles.logoRight} alt="Logos Governo" />
      </header>

      {/* SEARCH AREA */}
      <div className={styles.searchArea}>
        <label className={styles.searchLabel}>Pesquisar aluno</label>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Ex: nome, email ou CPF"
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
      </div>

      {/* STUDENTS LIST */}
      <div className={styles.list}>
        {/* CARD 1 */}
        <div className={styles.card}>
          <p><strong>RA:</strong> 0000000000000</p>
          <p><strong>Situação:</strong> Em curso</p>
          <p><strong>Nome:</strong> Fulano da silva</p>
          <p><strong>Ingresso:</strong> 20252</p>
          <p><strong>E-mail:</strong> fulano.silva@fatec.sp.gov.br</p>
          <p><strong>CPF:</strong> 000.000.000-00</p>
        </div>

        {/* CARD 2 */}
        <div className={styles.card}>
          <p><strong>RA:</strong> 0000000000000</p>
          <p><strong>Situação:</strong> Em curso</p>
          <p><strong>Nome:</strong> Fulano da silva</p>
          <p><strong>Ingresso:</strong> 20252</p>
          <p><strong>E-mail:</strong> fulano.silva@fatec.sp.gov.br</p>
          <p><strong>CPF:</strong> 000.000.000-00</p>
        </div>
      </div>

      {/* FOOTER BUTTONS */}
      <footer className={styles.footer}>
        <button className={styles.logout} onClick={handleLogout}>
          Deslogar
        </button>

        <button className={styles.register} onClick={handleRegister}>
          Registrar aluno
        </button>
      </footer>
    </div>
  );
}

export default StudentsListScreen;
