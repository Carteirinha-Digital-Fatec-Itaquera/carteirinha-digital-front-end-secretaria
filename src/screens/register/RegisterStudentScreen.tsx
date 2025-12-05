import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";

function RegisterStudentScreen() {
  const navigate = useNavigate();

  function handleBack() {
    navigate("/students");
  }

  function handleRegister() {
   
    navigate("/students");
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <img src={logoFatec} alt="Logo Fatec" className={styles.logoLeft} />

        <h1 className={styles.title}>Registro de aluno</h1>

        <img src={logosGov} alt="Logos Governo" className={styles.logoRight} />
      </header>

      {/* BACK BUTTON */}
      <button className={styles.backButton} onClick={handleBack}>❮</button>

      {/* FORM */}
      <form className={styles.form}>
        <label>RA</label>
        <input type="text" placeholder="Ex: 00000000000000" />

        <label>Situação</label>
        <input type="text" placeholder="Ex: Em curso" />

        <label>Nome</label>
        <input type="text" placeholder="Ex: Fulano da Silva" />

        <label>Ingresso</label>
        <input type="text" placeholder="Ex: 20252" />

        <label>E-mail</label>
        <input type="email" placeholder="Ex: fulano.silva@fatec.sp.gov.br" />

        <label>CPF</label>
        <input type="text" placeholder="Ex: 000.000.000-00" />
      </form>

      {/* REGISTER BUTTON */}
      <button className={styles.registerButton} onClick={handleRegister}>
        Registrar
      </button>
    </div>
  );
}

export default RegisterStudentScreen;
